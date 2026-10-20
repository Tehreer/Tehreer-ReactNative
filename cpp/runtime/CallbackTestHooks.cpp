#include "CallbackBindings.h"

#ifndef NDEBUG

#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"
#include "../generated/Structs.h"
#include "Callbacks.h"
#include "Errors.h"
#include "HandleObject.h"

#include <cstddef>
#include <memory>
#include <thread>
#include <utility>

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

void Define(jsi::Runtime &runtime, jsi::Object &target, const char *name, unsigned int parameters, jsi::HostFunctionType function) {
    target.setProperty(runtime, name, jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, name), parameters, std::move(function)));
}

// What the callbacks of a Core enumeration look like to a trampoline.
using FakeItemFunc = void (*)(void *userData, TRUInteger index, TRBoolean *stop);

// Stands in for Core, which is C and cannot be unwound through, without needing a font or a text.
// It is noexcept, so an exception that escaped a trampoline would end in std::terminate right
// here instead of unwinding, and the test would crash instead of passing.
size_t FakeEnumerate(FakeItemFunc func, void *userData, size_t count, bool honorsStop) noexcept {
    size_t calls = 0;
    for (size_t index = 0; index < count; index++) {
        TRBoolean stop = TRFalse;
        func(userData, static_cast<TRUInteger>(index), &stop);
        calls++;

        if (stop != TRFalse && honorsStop) {
            break;
        }
    }
    return calls;
}

// The same shape as the trampoline of a callback that Core keeps: the handler is called through
// InvokeHandler and a failure sets `stop`.
void FakeItem(void *userData, TRUInteger index, TRBoolean *stop) noexcept {
    bool completed = runtime::InvokeHandler(userData, [&](jsi::Runtime &rt, jsi::Object &handler) {
        handler.getPropertyAsFunction(rt, "item").callWithThis(rt, handler, marshal::FromIndex(rt, index));
    });

    if (!completed) {
        *stop = TRTrue;
    }
}

// Removes the entry on every path out of the binding, including the rethrow.
struct EntryGuard {
    runtime::HandlerTable::Key key;
    ~EntryGuard() { runtime::HandlerTable::Shared().Remove(key); }
};

jsi::Value Enumerate(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "testEnumerate";
    marshal::BeginCall();
    jsi::Object handler = marshal::ToObject(rt, marshal::ArgAt(args, count, 0), kFunction, "handler");
    TRUInt32 items = marshal::ToNumber<TRUInt32>(rt, marshal::ArgAt(args, count, 1), kFunction, "count");
    const jsi::Value &honors = marshal::ArgAt(args, count, 2);
    bool honorsStop = honors.isUndefined() || marshal::ToBoolean(rt, honors, kFunction, "honorsStop");

    // A failure throws instead of returning, so the count is also left on the handler for the test.
    jsi::Object owner = jsi::Value(rt, handler).getObject(rt);
    EntryGuard guard{ runtime::HandlerTable::Shared().Add(rt, std::move(handler)) };

    size_t calls = FakeEnumerate(&FakeItem, runtime::UserDataFromKey(guard.key), items, honorsStop);
    owner.setProperty(rt, "coreCalls", static_cast<double>(calls));
    marshal::RethrowCallbackError(rt);
    return jsi::Value(static_cast<double>(calls));
}

jsi::Value GetHandlerCount(jsi::Runtime &, const jsi::Value &, const jsi::Value *, size_t) {
    return jsi::Value(static_cast<double>(runtime::HandlerTable::Shared().Count()));
}

jsi::Value GetRetiredHandlerCount(jsi::Runtime &, const jsi::Value &, const jsi::Value *, size_t) {
    return jsi::Value(static_cast<double>(runtime::HandlerTable::Shared().RetiredCount()));
}

jsi::Value DrainHandlers(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) {
    runtime::HandlerTable::Shared().Drain(rt);
    return jsi::Value::undefined();
}

// The last release of a replacement can happen anywhere. This takes the reference out of the
// handle and releases it on a thread of its own, which runs the finalize trampoline there.
jsi::Value ReleaseOnOtherThread(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "testReleaseOnOtherThread";
    TRReplacementRef check = marshal::ToHandle<TRReplacementRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "handle", false);
    (void)check;

    std::shared_ptr<HandleObject> handle = AsHandleObject(rt, marshal::ArgAt(args, count, 0));
    auto replacement = static_cast<TRReplacementRef>(handle->Take());

    std::thread([replacement] { TRReplacementRelease(replacement); }).join();
    return jsi::Value::undefined();
}

// Core may ask for a room from any thread; the handler must not run there.
jsi::Value ComputeRoomOnOtherThread(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "testComputeRoomOnOtherThread";
    marshal::BeginCall();
    TRFloat width = marshal::ToNumber<TRFloat>(rt, marshal::ArgAt(args, count, 1), kFunction, "layoutWidth");
    TRReplacementRef replacement = marshal::ToHandle<TRReplacementRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "handle", false);

    TRReplacementRoom room = { 7.0f, 7.0f, 7.0f };
    std::thread([&] { TRReplacementComputeRoom(replacement, width, &room); }).join();

    marshal::RethrowCallbackError(rt);
    return generated::TRReplacementRoomToJs(rt, room);
}

} // namespace

void InstallCallbackTestHooks(jsi::Runtime &runtime, jsi::Object &target) {
    Define(runtime, target, "testEnumerate", 3, Enumerate);
    Define(runtime, target, "testGetHandlerCount", 0, GetHandlerCount);
    Define(runtime, target, "testGetRetiredHandlerCount", 0, GetRetiredHandlerCount);
    Define(runtime, target, "testDrainHandlers", 0, DrainHandlers);
    Define(runtime, target, "testReleaseOnOtherThread", 1, ReleaseOnOtherThread);
    Define(runtime, target, "testComputeRoomOnOtherThread", 2, ComputeRoomOnOtherThread);
}

} // namespace tehreer

#endif
