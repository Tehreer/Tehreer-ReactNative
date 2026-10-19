#include "HandlerTable.h"

#include <utility>

namespace tehreer::runtime {

namespace jsi = facebook::jsi;

// The destructor of this object is the one hook that runs when a runtime goes away: the engine
// finalizes every host object at the latest when it is shut down, and JSI allows destroying
// `jsi::Object`s from there (and nowhere after the runtime). It is held by `__tehreer`, which is
// read-only and non-configurable, so it is only finalized with the runtime.
class HandlerTable::Lifetime final : public jsi::HostObject {
public:
    explicit Lifetime(std::shared_ptr<Scope> scope) : _scope(std::move(scope)) {}

    ~Lifetime() override {
        // This must not throw; the table only throws from `lock`, which would be a defect anyway.
        Shared().Detach(_scope);
    }

private:
    std::shared_ptr<Scope> _scope;
};

HandlerTable &HandlerTable::Shared() {
    // Never destroyed: at process exit the entries are gone already, and a destructor that ran
    // then could only destroy jsi values of a runtime that no longer exists.
    static HandlerTable *table = new HandlerTable();
    return *table;
}

std::shared_ptr<jsi::HostObject> HandlerTable::Attach(jsi::Runtime &runtime) {
    auto scope = std::make_shared<Scope>();
    scope->runtime = &runtime;
    scope->thread = std::this_thread::get_id();

    std::lock_guard<std::mutex> lock(_mutex);
    _scopes[&runtime] = scope;
    return std::make_shared<Lifetime>(std::move(scope));
}

HandlerTable::Key HandlerTable::Add(jsi::Runtime &runtime, jsi::Object handler) {
    Drain(runtime);

    auto object = std::make_shared<jsi::Object>(std::move(handler));

    std::lock_guard<std::mutex> lock(_mutex);
    auto scope = _scopes.find(&runtime);
    if (scope == _scopes.end() || scope->second->thread != std::this_thread::get_id()) {
        throw jsi::JSError(runtime, "Tehreer is not installed on this runtime or thread.");
    }

    Key key;
    do {
        key = _nextKey++;
        // A key is a pointer for Core, so it may wrap on a 32-bit target but must never be 0 or taken.
    } while (key == 0 || _entries.count(key) != 0);

    _entries.emplace(key, Entry{ scope->second, std::move(object) });
    return key;
}

HandlerTable::Target HandlerTable::Find(Key key) {
    Target target;
    std::vector<std::shared_ptr<jsi::Object>> retired;

    {
        std::lock_guard<std::mutex> lock(_mutex);
        auto entry = _entries.find(key);
        if (entry == _entries.end()) {
            return target;
        }

        Scope &scope = *entry->second.scope;
        if (scope.thread != std::this_thread::get_id()) {
            return target;
        }

        target.runtime = scope.runtime;
        target.handler = entry->second.handler;
        retired.swap(scope.retired);
    }

    // The thread of the runtime destroys them, outside the lock.
    return target;
}

void HandlerTable::Remove(Key key) noexcept {
    try {
        std::shared_ptr<jsi::Object> local;

        {
            std::lock_guard<std::mutex> lock(_mutex);
            auto entry = _entries.find(key);
            if (entry == _entries.end()) {
                return;
            }

            Entry removed = std::move(entry->second);
            _entries.erase(entry);

            if (removed.scope->thread == std::this_thread::get_id()) {
                local = std::move(removed.handler);
            } else {
                removed.scope->retired.push_back(std::move(removed.handler));
            }
        }
    } catch (...) {
        // A failed lock leaves the entry in place, which is a leak of one handler and not a crash
        // inside Core's release.
    }
}

void HandlerTable::Drain(jsi::Runtime &runtime) {
    std::vector<std::shared_ptr<jsi::Object>> retired;

    {
        std::lock_guard<std::mutex> lock(_mutex);
        auto scope = _scopes.find(&runtime);
        if (scope != _scopes.end() && scope->second->thread == std::this_thread::get_id()) {
            retired.swap(scope->second->retired);
        }
    }
}

size_t HandlerTable::Count() const {
    std::lock_guard<std::mutex> lock(_mutex);
    return _entries.size();
}

size_t HandlerTable::RetiredCount() const {
    std::lock_guard<std::mutex> lock(_mutex);
    size_t count = 0;
    for (const auto &scope : _scopes) {
        count += scope.second->retired.size();
    }
    return count;
}

void HandlerTable::Detach(const std::shared_ptr<Scope> &scope) {
    std::vector<std::shared_ptr<jsi::Object>> doomed;

    {
        std::lock_guard<std::mutex> lock(_mutex);

        for (auto entry = _entries.begin(); entry != _entries.end();) {
            if (entry->second.scope == scope) {
                doomed.push_back(std::move(entry->second.handler));
                entry = _entries.erase(entry);
            } else {
                ++entry;
            }
        }
        for (auto &object : scope->retired) {
            doomed.push_back(std::move(object));
        }
        scope->retired.clear();

        // A new runtime may live at the same address, so only this scope's own mapping goes.
        auto mapped = _scopes.find(scope->runtime);
        if (mapped != _scopes.end() && mapped->second == scope) {
            _scopes.erase(mapped);
        }
    }
}

} // namespace tehreer::runtime
