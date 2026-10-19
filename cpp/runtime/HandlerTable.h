#pragma once

#include <jsi/jsi.h>

#include <cstddef>
#include <cstdint>
#include <memory>
#include <mutex>
#include <thread>
#include <unordered_map>
#include <vector>

namespace tehreer::runtime {

/**
 * The JavaScript handlers that Core calls back, by key. Core only carries an opaque `userData`
 * pointer, so the pointer is a key into this table and never the address of a JS value.
 *
 * The table is shared by every runtime of the process, because a trampoline gets nothing but the
 * key, and each entry remembers the runtime and the thread it belongs to. Three rules follow from
 * what Core and JSI allow:
 *
 * - `Remove` can run on any thread (the last release of an object of Core can) and must not touch
 *   JavaScript. A handler removed from another thread is moved to a queue of its runtime and
 *   destroyed the next time that runtime's thread uses the table, or when the runtime goes away.
 * - A handler is only looked up on the thread of its runtime; `Find` finds nothing elsewhere, since
 *   JSI runtimes are not thread safe.
 * - When the runtime is torn down its entries are destroyed from the destructor of the `HostObject`
 *   that `Attach` returns, which JSI explicitly allows, so no `jsi::Object` outlives its runtime.
 *   Entries that are removed after that are not found, and trampolines find no handler.
 */
class HandlerTable {
public:
    /** Never 0, so that a `NULL` userData is never a handler. */
    using Key = std::uintptr_t;

    /** A handler that was found, with the runtime to call it in. Empty when nothing was found. */
    struct Target {
        facebook::jsi::Runtime *runtime = nullptr;
        std::shared_ptr<facebook::jsi::Object> handler;

        explicit operator bool() const { return handler != nullptr; }
    };

    static HandlerTable &Shared();

    /**
     * Makes the runtime known to the table, on its own thread. The result must be kept alive by the
     * runtime (a property of an object that stays reachable): its destructor ends the runtime's
     * entries. Attaching a runtime that is attached already replaces its scope.
     */
    std::shared_ptr<facebook::jsi::HostObject> Attach(facebook::jsi::Runtime &runtime);

    /**
     * Stores the handler and returns its key. Must run on the thread that attached the runtime, and
     * throws if the runtime is not attached.
     */
    Key Add(facebook::jsi::Runtime &runtime, facebook::jsi::Object handler);

    /** The handler of `key` when the calling thread is the one of its runtime, else nothing. */
    Target Find(Key key);

    /** Forgets the handler. Safe on any thread, for any key (also one that is gone), and idempotent. */
    void Remove(Key key) noexcept;

    /** Destroys the handlers that other threads removed. Must run on the thread of the runtime. */
    void Drain(facebook::jsi::Runtime &runtime);

    /** The handlers that are stored. */
    size_t Count() const;
    /** The handlers that were removed from another thread and are not destroyed yet. */
    size_t RetiredCount() const;

    HandlerTable(const HandlerTable &) = delete;
    HandlerTable &operator=(const HandlerTable &) = delete;

private:
    HandlerTable() = default;
    ~HandlerTable() = default;

    struct Scope {
        facebook::jsi::Runtime *runtime;
        std::thread::id thread;
        std::vector<std::shared_ptr<facebook::jsi::Object>> retired;
    };
    struct Entry {
        std::shared_ptr<Scope> scope;
        std::shared_ptr<facebook::jsi::Object> handler;
    };
    class Lifetime;

    void Detach(const std::shared_ptr<Scope> &scope);

    mutable std::mutex _mutex;
    std::unordered_map<Key, Entry> _entries;
    std::unordered_map<facebook::jsi::Runtime *, std::shared_ptr<Scope>> _scopes;
    Key _nextKey = 1;
};

/** The pointer that Core carries for a key, and back. */
inline void *UserDataFromKey(HandlerTable::Key key) { return reinterpret_cast<void *>(key); }
inline HandlerTable::Key KeyFromUserData(void *userData) { return reinterpret_cast<HandlerTable::Key>(userData); }

} // namespace tehreer::runtime
