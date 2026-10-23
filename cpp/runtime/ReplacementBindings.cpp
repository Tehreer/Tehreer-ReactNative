#include "CallbackBindings.h"

#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"
#include "../generated/Structs.h"
#include "Callbacks.h"
#include "Errors.h"

#include <mutex>
#include <unordered_map>
#include <utility>

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

// Core cannot give the `userData` of a replacement back, but a painter that meets the replacement of
// a run has to find its delegate. This remembers the key of every replacement that is alive. It is
// leaked on purpose: a replacement can end on any thread at process exit.
class KeyRegistry {
public:
    static KeyRegistry &Shared() {
        static KeyRegistry *registry = new KeyRegistry();
        return *registry;
    }

    void Add(const void *replacement, runtime::HandlerTable::Key key) {
        std::lock_guard<std::mutex> lock(_mutex);
        _byReplacement[replacement] = key;
        _byKey[key] = replacement;
    }

    /** Safe on any thread, for a key that is gone, and idempotent. */
    void Forget(runtime::HandlerTable::Key key) noexcept {
        std::lock_guard<std::mutex> lock(_mutex);
        auto found = _byKey.find(key);
        if (found != _byKey.end()) {
            _byReplacement.erase(found->second);
            _byKey.erase(found);
        }
    }

    /** The key of the replacement, or 0. */
    runtime::HandlerTable::Key Find(const void *replacement) {
        std::lock_guard<std::mutex> lock(_mutex);
        auto found = _byReplacement.find(replacement);
        return found == _byReplacement.end() ? 0 : found->second;
    }

private:
    std::mutex _mutex;
    std::unordered_map<const void *, runtime::HandlerTable::Key> _byReplacement;
    std::unordered_map<runtime::HandlerTable::Key, const void *> _byKey;
};

// Core calls this from Shaping, so while a Core function of this runtime is running, and from any
// thread (its documentation says so). On any thread but the runtime's the handler is not called
// and the room stays zero: JSI must not be used there, and nothing could receive an error.
// Core zeroes the room before it calls, and a failure leaves it zero.
void ComputeRoom(void *userData, TRFloat layoutWidth, TRReplacementRoom *room) noexcept {
    runtime::InvokeHandler(userData, [&](jsi::Runtime &rt, jsi::Object &handler) {
        jsi::Value method = handler.getProperty(rt, "computeRoom");
        if (method.isUndefined() || method.isNull()) {
            // The handler has nothing to say, which Core defines as no room.
            return;
        }
        if (!method.isObject() || !method.getObject(rt).isFunction(rt)) {
            runtime::ThrowError(rt, "TypeError", "computeRoom: 'handler.computeRoom' must be a function");
        }

        jsi::Value result = method.getObject(rt).asFunction(rt)
            .callWithThis(rt, handler, marshal::FromNumber<TRFloat>(rt, layoutWidth));

        // Written only when complete: a room that fails halfway is not half applied.
        TRReplacementRoom converted = generated::TRReplacementRoomFromJs(rt, result, "computeRoom", "result");
        *room = converted;
    });
}

// The owner of the replacement is gone: drop the handler. May run on any thread and touches no
// JavaScript (see HandlerTable::Remove).
void Finalize(void *userData) noexcept {
    runtime::HandlerTable::Key key = runtime::KeyFromUserData(userData);
    KeyRegistry::Shared().Forget(key);
    runtime::HandlerTable::Shared().Remove(key);
}

jsi::Value BindReplacementCreate(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "TRReplacementCreate";
    marshal::BeginCall();

    // All the conversions come first, so a bad argument leaves nothing behind.
    jsi::Object handler = marshal::ToObject(rt, marshal::ArgAt(args, count, 0), kFunction, "handler");
    TRReplacementKind kind = marshal::ToNumber<TRReplacementKind>(rt, marshal::ArgAt(args, count, 1), kFunction, "kind");

    TRReplacementCallbacks callbacks = {};
    callbacks.computeRoom = &ComputeRoom;
    callbacks.finalize = &Finalize;

    runtime::HandlerTable &table = runtime::HandlerTable::Shared();
    runtime::HandlerTable::Key key = table.Add(rt, std::move(handler));

    TRReplacementRef replacement = TRReplacementCreate(&callbacks, runtime::UserDataFromKey(key), kind);
    if (replacement == nullptr) {
        // Core made no object, so it will never call finalize.
        table.Remove(key);
        return jsi::Value::undefined();
    }

    try {
        KeyRegistry::Shared().Add(replacement, key);
    } catch (...) {
        // Releasing the only reference calls Finalize, which drops the entry.
        TRReplacementRelease(replacement);
        throw;
    }

    // From here the reference is owned by the handle; if making it fails, FromHandle releases the
    // replacement, which calls Finalize and drops the entry.
    return marshal::FromHandle<TRReplacementRef>(rt, replacement, marshal::Ownership::Adopt);
}

// Calls the `draw` of the delegate that made the replacement, for the painter of the JavaScript
// drawing surface. It is an ordinary call from JavaScript: what `draw` throws propagates to the
// caller, which is the drawing adapter inside a draw trampoline. Returns whether there was a
// `draw` to call; a replacement of another runtime, or one made on another thread, has none here.
jsi::Value BindInvokeReplacementDraw(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "invokeReplacementDraw";
    TRReplacementRef replacement = marshal::ToHandle<TRReplacementRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "replacement", false);

    runtime::HandlerTable::Key key = KeyRegistry::Shared().Find(replacement);
    if (key == 0) {
        return jsi::Value(false);
    }

    runtime::HandlerTable::Target target = runtime::HandlerTable::Shared().Find(key);
    if (!target || target.runtime != &rt) {
        return jsi::Value(false);
    }

    jsi::Value member = target.handler->getProperty(rt, "draw");
    if (!member.isObject() || !member.getObject(rt).isFunction(rt)) {
        return jsi::Value(false);
    }

    member.getObject(rt).asFunction(rt).callWithThis(rt, *target.handler,
        jsi::Value(rt, marshal::ArgAt(args, count, 1)), jsi::Value(rt, marshal::ArgAt(args, count, 2)));
    return jsi::Value(true);
}

} // namespace

void InstallCallbackBindings(jsi::Runtime &runtime, jsi::Object &target) {
    target.setProperty(runtime, "TRReplacementCreate", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "TRReplacementCreate"), 2, &BindReplacementCreate));
    target.setProperty(runtime, "invokeReplacementDraw", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "invokeReplacementDraw"), 3, &BindInvokeReplacementDraw));
}

} // namespace tehreer
