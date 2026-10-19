#include "CallbackBindings.h"

#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"
#include "../generated/Structs.h"
#include "Callbacks.h"
#include "Errors.h"

#include <utility>

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

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
    runtime::HandlerTable::Shared().Remove(runtime::KeyFromUserData(userData));
}

jsi::Value BindReplacementCreate(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "TRReplacementCreate";

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

    // From here the reference is owned by the handle; if making it fails, FromHandle releases the
    // replacement, which calls Finalize and drops the entry.
    return marshal::FromHandle<TRReplacementRef>(rt, replacement, marshal::Ownership::Adopt);
}

} // namespace

void InstallCallbackBindings(jsi::Runtime &runtime, jsi::Object &target) {
    target.setProperty(runtime, "TRReplacementCreate", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "TRReplacementCreate"), 2, &BindReplacementCreate));
}

} // namespace tehreer
