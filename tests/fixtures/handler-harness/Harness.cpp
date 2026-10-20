// Runs the handler table and the callback error slot of cpp/runtime against the stand-in of
// <jsi/jsi.h> in tests/fixtures/jsi-stub. No engine is involved: a `jsi::Object` is a counter whose
// end is reported with the thread it ended on, which is all that the rules of the table are about
// (who destroys a handler, when, and never while a lock is held). Built and run by
// tests/handlerTable.test.ts; prints one line per failure and exits non-zero if there was one.
#include "runtime/Callbacks.h"
#include "runtime/HandlerTable.h"

#include <atomic>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <exception>
#include <future>
#include <map>
#include <memory>
#include <mutex>
#include <stdexcept>
#include <string>
#include <thread>
#include <utility>

namespace jsi = facebook::jsi;
using tehreer::runtime::HandlerTable;

namespace {

int gFailures = 0;

void Check(bool condition, const std::string &message) {
    if (!condition) {
        gFailures++;
        std::printf("FAIL: %s\n", message.c_str());
    }
}

// Where and when the fake objects ended.
std::mutex gEndedMutex;
std::map<unsigned long, std::thread::id> gEnded;
std::atomic<unsigned long> gNextId{1};

size_t Ended() {
    std::lock_guard<std::mutex> lock(gEndedMutex);
    return gEnded.size();
}

bool EndedOn(unsigned long id, std::thread::id thread) {
    std::lock_guard<std::mutex> lock(gEndedMutex);
    auto found = gEnded.find(id);
    return found != gEnded.end() && found->second == thread;
}

bool HasEnded(unsigned long id) {
    std::lock_guard<std::mutex> lock(gEndedMutex);
    return gEnded.count(id) != 0;
}

// What `JSError` does while a test watches the table: it tries to use the table from another thread
// and waits for it. If the thread that is constructing the error holds the table's lock, the other
// thread cannot get it, which is the deadlock that a finalizer running here would cause.
std::atomic<bool> gProbeLock{false};
std::atomic<int> gLockHeldDuringError{0};

} // namespace

namespace facebook::jsi {

Runtime::~Runtime() = default;

Object::Object(Runtime &) : _id(gNextId.fetch_add(1)) {}

void ObjectEnded(unsigned long id) noexcept {
    std::lock_guard<std::mutex> lock(gEndedMutex);
    gEnded[id] = std::this_thread::get_id();
}

JSError::JSError(Runtime &, std::string) {
    if (!gProbeLock.load()) {
        return;
    }

    auto done = std::make_shared<std::promise<void>>();
    std::future<void> finished = done->get_future();
    std::thread([done] {
        tehreer::runtime::HandlerTable::Shared().Count();
        done->set_value();
    }).detach();
    if (finished.wait_for(std::chrono::seconds(2)) != std::future_status::ready) {
        gLockHeldDuringError++;
    }
}

} // namespace facebook::jsi

namespace {

struct Fake : jsi::Runtime {};

// Runs `action` on a thread of its own and waits for it.
template <class Action>
void OnOtherThread(Action action) {
    std::thread(action).join();
}

void TestRemoveQueuesAndTheRuntimeThreadDestroys() {
    Fake runtime;
    HandlerTable &table = HandlerTable::Shared();
    auto lifetime = table.Attach(runtime);
    std::thread::id self = std::this_thread::get_id();

    jsi::Object handler(runtime);
    unsigned long id = handler.id();
    HandlerTable::Key key = table.Add(runtime, std::move(handler));
    Check(key != 0, "a key is never 0");
    Check(table.Count() == 1, "the handler is stored");

    HandlerTable::Target target = table.Find(key);
    Check(static_cast<bool>(target) && target.runtime == &runtime, "the handler is found on the runtime's thread");
    target = {};

    // R4: removed on the runtime's own thread, as an engine finalizer would, it is still not destroyed.
    table.Remove(key);
    Check(table.Count() == 0, "the entry is gone");
    Check(table.RetiredCount() == 1, "the handler is queued");
    Check(!HasEnded(id), "R4: Remove never destroys a handler, not even on the runtime's thread");
    Check(!table.Find(key), "a removed key is not found");

    table.Remove(key);
    table.Remove(0xdead);
    Check(table.RetiredCount() == 1, "removing again, or an unknown key, does nothing");

    table.Drain(runtime);
    Check(HasEnded(id) && EndedOn(id, self), "the runtime's thread destroys it on Drain");
    Check(table.RetiredCount() == 0, "the queue is empty");

    lifetime.reset();
}

void TestRemoveFromAnotherThread() {
    Fake runtime;
    HandlerTable &table = HandlerTable::Shared();
    auto lifetime = table.Attach(runtime);
    std::thread::id self = std::this_thread::get_id();

    jsi::Object handler(runtime);
    unsigned long id = handler.id();
    HandlerTable::Key key = table.Add(runtime, std::move(handler));

    bool found = true;
    OnOtherThread([&] {
        found = static_cast<bool>(table.Find(key));
        table.Remove(key);
        table.Drain(runtime);
    });
    Check(!found, "another thread finds nothing");
    Check(!HasEnded(id), "another thread never destroys the handler, whether it removed it or drained");
    Check(table.RetiredCount() == 1, "it is queued for the runtime's thread");

    // R5: an ordinary binding drains the queue, as `RethrowCallbackError` runs after every Core call.
    tehreer::marshal::RethrowCallbackError(runtime);
    Check(HasEnded(id) && EndedOn(id, self), "R5: the check that every binding runs destroys the handler, on this thread");
    Check(table.RetiredCount() == 0, "R5: the queue emptied without a test hook");

    lifetime.reset();
}

void TestAddAndFindDrain() {
    Fake runtime;
    HandlerTable &table = HandlerTable::Shared();
    auto lifetime = table.Attach(runtime);

    auto make = [&] {
        jsi::Object handler(runtime);
        unsigned long id = handler.id();
        return std::make_pair(table.Add(runtime, std::move(handler)), id);
    };

    auto first = make();
    auto second = make();
    OnOtherThread([&] { table.Remove(first.first); });
    Check(table.RetiredCount() == 1, "queued");
    HandlerTable::Target target = table.Find(second.first);
    Check(static_cast<bool>(target) && HasEnded(first.second), "R9: Find drains the queue");
    target = {};

    OnOtherThread([&] { table.Remove(second.first); });
    auto third = make();
    Check(HasEnded(second.second), "R9: Add drains the queue");
    table.Remove(third.first);
    table.Drain(runtime);
    lifetime.reset();
}

void TestNoJavaScriptErrorIsMadeUnderTheLock() {
    Fake attached;
    Fake other;
    HandlerTable &table = HandlerTable::Shared();
    auto lifetime = table.Attach(attached);

    gProbeLock = true;
    bool threw = false;
    try {
        table.Add(other, jsi::Object(other));
    } catch (const jsi::JSError &) {
        threw = true;
    }
    // From another thread than the one that attached: refused as well.
    OnOtherThread([&] {
        try {
            table.Add(attached, jsi::Object(attached));
        } catch (const jsi::JSError &) {
            threw = threw && true;
        }
    });
    gProbeLock = false;

    Check(threw, "a runtime that is not attached is refused with an error");
    Check(gLockHeldDuringError == 0, "R3: the error is made after the table's lock is released");
    lifetime.reset();
}

void TestTeardownDestroysEverythingOnTheTearingThread() {
    HandlerTable &table = HandlerTable::Shared();
    std::thread::id self = std::this_thread::get_id();

    Fake runtime;
    auto lifetime = table.Attach(runtime);
    jsi::Object kept(runtime);
    jsi::Object queued(runtime);
    unsigned long keptId = kept.id();
    unsigned long queuedId = queued.id();
    HandlerTable::Key keptKey = table.Add(runtime, std::move(kept));
    HandlerTable::Key queuedKey = table.Add(runtime, std::move(queued));
    table.Remove(queuedKey);

    lifetime.reset();
    Check(HasEnded(keptId) && EndedOn(keptId, self), "a live handler ends with the runtime");
    Check(HasEnded(queuedId), "a queued handler ends with the runtime");
    Check(table.Count() == 0 && table.RetiredCount() == 0, "nothing is left");
    Check(!table.Find(keptKey), "a trampoline finds no handler afterwards");
    table.Remove(keptKey);
}

void TestInvokeHandler() {
    Fake runtime;
    HandlerTable &table = HandlerTable::Shared();
    auto lifetime = table.Attach(runtime);
    namespace marshal = tehreer::marshal;
    using tehreer::runtime::InvokeHandler;
    using tehreer::runtime::UserDataFromKey;

    HandlerTable::Key key = table.Add(runtime, jsi::Object(runtime));
    void *userData = UserDataFromKey(key);
    int runs = 0;

    Check(InvokeHandler(userData, [&](jsi::Runtime &, jsi::Object &) { runs++; }) && runs == 1, "the handler runs");
    Check(!InvokeHandler(UserDataFromKey(key + 100), [&](jsi::Runtime &, jsi::Object &) { runs++; }) && runs == 1, "an unknown key runs nothing");

    bool ranElsewhere = false;
    OnOtherThread([&] { ranElsewhere = InvokeHandler(userData, [&](jsi::Runtime &, jsi::Object &) { runs++; }); });
    Check(!ranElsewhere && runs == 1, "another thread never runs the handler");

    // An exception is recorded and not thrown, and the handler does not run again for this Core call.
    Check(!InvokeHandler(userData, [&](jsi::Runtime &, jsi::Object &) { throw std::runtime_error("first"); }), "a throwing handler fails");
    Check(marshal::HasCallbackError(runtime), "the error is remembered");
    Check(!InvokeHandler(userData, [&](jsi::Runtime &, jsi::Object &) { runs++; }) && runs == 1, "no handler runs after a failure");
    tehreer::runtime::RecordCallbackError(runtime, std::make_exception_ptr(std::runtime_error("second")));

    std::string thrown;
    try {
        marshal::RethrowCallbackError(runtime);
    } catch (const std::runtime_error &error) {
        thrown = error.what();
    }
    Check(thrown == "first", "the first error is the one thrown: " + thrown);
    Check(!marshal::HasCallbackError(runtime), "and the slot is empty once it is");
    Check(InvokeHandler(userData, [&](jsi::Runtime &, jsi::Object &) { runs++; }) && runs == 2, "the next call starts clean");

    // R6: an error nobody threw (a Core call that did not end in a rethrow) is forgotten when the next
    // binding starts, and does not surface from an unrelated call.
    tehreer::runtime::RecordCallbackError(runtime, std::make_exception_ptr(std::runtime_error("stale")));
    Check(marshal::HasCallbackError(runtime), "a stale error is remembered");
    marshal::BeginCall();
    Check(!marshal::HasCallbackError(runtime), "R6: BeginCall forgets it");
    bool surfaced = false;
    try {
        marshal::RethrowCallbackError(runtime);
    } catch (...) {
        surfaced = true;
    }
    Check(!surfaced, "R6: the stale error does not surface from the next call");

    // An error of another runtime on this thread is not this runtime's.
    Fake stranger;
    tehreer::runtime::RecordCallbackError(stranger, std::make_exception_ptr(std::runtime_error("elsewhere")));
    Check(!marshal::HasCallbackError(runtime), "the error belongs to the runtime that recorded it");
    marshal::BeginCall();

    table.Remove(key);
    lifetime.reset();
}

} // namespace

int main() {
    TestRemoveQueuesAndTheRuntimeThreadDestroys();
    TestRemoveFromAnotherThread();
    TestAddAndFindDrain();
    TestNoJavaScriptErrorIsMadeUnderTheLock();
    TestTeardownDestroysEverythingOnTheTearingThread();
    TestInvokeHandler();

    if (gFailures == 0) {
        std::printf("OK ended=%zu\n", Ended());
        return 0;
    }
    return 1;
}
