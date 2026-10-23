#include "CallbackBindings.h"

#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"
#include "../generated/Structs.h"
#include "Callbacks.h"
#include "Errors.h"

#include <memory>
#include <string>
#include <utility>

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

// The JS drawing surface: trampolines that hand what Core draws to a JavaScript object (the
// adapter that `src/drawing/Drawing.ts` makes around the application's `DrawingContext`). This is
// the slow path, one JS call for every glyph, rectangle and shadow; the views draw natively.
//
// Core calls these from inside a draw function, on the thread that called it, which is the thread
// of the runtime in the only way the library uses them. InvokeHandler finds nothing on any other
// thread and records the first error of the handler, which the generated draw binding rethrows
// when Core returns.

jsi::Function MemberFunction(jsi::Runtime &rt, jsi::Object &handler, const char *name) {
    jsi::Value member = handler.getProperty(rt, name);
    if (!member.isObject() || !member.getObject(rt).isFunction(rt)) {
        runtime::ThrowError(rt, "TypeError", std::string("the drawing context has no function '") + name + "'");
    }
    return member.getObject(rt).asFunction(rt);
}

bool HasFunction(jsi::Runtime &rt, jsi::Object &handler, const char *name) {
    jsi::Value member = handler.getProperty(rt, name);
    return member.isObject() && member.getObject(rt).isFunction(rt);
}

void DrawGlyphImage(void *userData, TRGlyphImageRef image, TRPoint origin, TRFloat scaleX, TRFloat scaleY,
                    TRColor color, const TRRect *clip) noexcept {
    runtime::InvokeHandler(userData, [&](jsi::Runtime &rt, jsi::Object &handler) {
        jsi::Function method = MemberFunction(rt, handler, "drawGlyphImage");

        // The numbers are converted first: a conversion that throws (NaN) must not leave a handle
        // that was already made to the finalizer.
        jsi::Value originX = marshal::FromNumber<TRFloat>(rt, origin.x);
        jsi::Value originY = marshal::FromNumber<TRFloat>(rt, origin.y);
        jsi::Value scaleXValue = marshal::FromNumber<TRFloat>(rt, scaleX);
        jsi::Value scaleYValue = marshal::FromNumber<TRFloat>(rt, scaleY);
        jsi::Value colorValue = marshal::FromNumber<TRColor>(rt, color);
        jsi::Value clipValue = clip != nullptr ? generated::TRRectToJs(rt, *clip) : jsi::Value::undefined();

        // Core lends the image for the call only. The handle owns a reference of its own, taken here,
        // so it can never dangle; the adapter disposes it when the call is over, and a wrapper that
        // the application kept is "already disposed" afterwards. A handle nobody disposed (an error
        // in between) is released by its finalizer.
        jsi::Value handle = marshal::FromHandle<TRGlyphImageRef>(rt, image, marshal::Ownership::Retain);

        method.callWithThis(rt, handler, std::move(handle), std::move(originX), std::move(originY),
            std::move(scaleXValue), std::move(scaleYValue), std::move(colorValue), std::move(clipValue));
    });
}

void FillRect(void *userData, TRRect rect, TRColor color) noexcept {
    runtime::InvokeHandler(userData, [&](jsi::Runtime &rt, jsi::Object &handler) {
        jsi::Function method = MemberFunction(rt, handler, "fillRect");
        method.callWithThis(rt, handler, generated::TRRectToJs(rt, rect), marshal::FromNumber<TRColor>(rt, color));
    });
}

void DrawReplacement(void *userData, const struct _TRGlyphRun *run, TRPoint origin) noexcept {
    runtime::InvokeHandler(userData, [&](jsi::Runtime &rt, jsi::Object &handler) {
        jsi::Function method = MemberFunction(rt, handler, "drawReplacement");

        // Numbers first, as in DrawGlyphImage, so a throwing conversion cannot orphan the handle.
        jsi::Value originX = marshal::FromNumber<TRFloat>(rt, origin.x);
        jsi::Value originY = marshal::FromNumber<TRFloat>(rt, origin.y);

        // Owned and disposed like the image: the run is Core's, lent for the call.
        jsi::Value handle = marshal::FromHandle<TRGlyphRunRef>(rt, run, marshal::Ownership::Retain);
        method.callWithThis(rt, handler, std::move(handle), std::move(originX), std::move(originY));
    });
}

void BeginShadow(void *userData, TRFloat radius, TRFloat dx, TRFloat dy, TRColor color) noexcept {
    runtime::InvokeHandler(userData, [&](jsi::Runtime &rt, jsi::Object &handler) {
        jsi::Function method = MemberFunction(rt, handler, "beginShadow");
        method.callWithThis(rt, handler, marshal::FromNumber<TRFloat>(rt, radius), marshal::FromNumber<TRFloat>(rt, dx),
            marshal::FromNumber<TRFloat>(rt, dy), marshal::FromNumber<TRColor>(rt, color));
    });
}

// Core promises an end for every begin it made. If the begin failed, no handler runs again in this
// Core call, so the scope the application never saw is never ended either.
void EndShadow(void *userData) noexcept {
    runtime::InvokeHandler(userData, [&](jsi::Runtime &rt, jsi::Object &handler) {
        jsi::Function method = MemberFunction(rt, handler, "endShadow");
        method.callWithThis(rt, handler);
    });
}

/**
 * What `installDrawContext` returns: the renderer's callbacks from before, to be put back by
 * `restoreDrawContext`. It holds a reference to the renderer so that restoring is safe even if the
 * application disposed its wrapper meanwhile.
 *
 * The destructor can run on any thread, so it only gives back what it holds and does not touch the
 * renderer's callbacks (changing them is not thread safe). A scope that was never restored leaves
 * the callbacks pointing at a key that is gone: a trampoline then finds no handler and draws
 * nothing. The TypeScript side always restores in a `finally`.
 */
class DrawScope final : public jsi::HostObject {
public:
    DrawScope(TRRendererRef renderer, const TRDrawCallbacks &previous, void *previousUserData)
        : _renderer(TRRendererRetain(renderer)), _previous(previous), _previousUserData(previousUserData) {
    }

    ~DrawScope() override {
        // Only for a scope that was never restored: Restore() clears the renderer, which skips this.
        if (_renderer != nullptr) {
            runtime::HandlerTable::Shared().Remove(_key);
            TRRendererRelease(_renderer);
        }
    }

    void SetKey(runtime::HandlerTable::Key key) { _key = key; }

    /** Puts the previous callbacks back. Does nothing the second time. */
    void Restore() {
        if (_renderer == nullptr) {
            return;
        }

        TRRendererRef renderer = _renderer;
        _renderer = nullptr;

        TRRendererSetDrawCallbacks(renderer, &_previous, _previousUserData);
        runtime::HandlerTable::Shared().Remove(_key);
        TRRendererRelease(renderer);
    }

private:
    TRRendererRef _renderer;
    TRDrawCallbacks _previous;
    void *_previousUserData;
    runtime::HandlerTable::Key _key = 0;
};

jsi::Value BindInstallDrawContext(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "installDrawContext";

    // Arguments first, so that a bad one changes nothing.
    TRRendererRef renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "renderer", false);
    jsi::Object adapter = marshal::ToObject(rt, marshal::ArgAt(args, count, 1), kFunction, "context");

    TRDrawCallbacks callbacks = {};
    callbacks.drawGlyphImage = &DrawGlyphImage;
    callbacks.fillRect = &FillRect;
    callbacks.drawReplacement = &DrawReplacement;
    // Core opens a shadow scope only when both are set, so a surface that has one gets neither.
    if (HasFunction(rt, adapter, "beginShadow") && HasFunction(rt, adapter, "endShadow")) {
        callbacks.beginShadow = &BeginShadow;
        callbacks.endShadow = &EndShadow;
    }

    TRDrawCallbacks previous = {};
    TRRendererGetDrawCallbacks(renderer, &previous);
    void *previousUserData = TRRendererGetDrawUserData(renderer);

    // Nothing below can fail except making the objects, which are made before Core is changed: a
    // scope that is destroyed unrestored (the table threw) gives back its reference and its key.
    auto scope = std::make_shared<DrawScope>(renderer, previous, previousUserData);
    runtime::HandlerTable::Key key = runtime::HandlerTable::Shared().Add(rt, std::move(adapter));
    scope->SetKey(key);
    jsi::Object result = jsi::Object::createFromHostObject(rt, scope);

    TRRendererSetDrawCallbacks(renderer, &callbacks, runtime::UserDataFromKey(key));
    return result;
}

jsi::Value BindRestoreDrawContext(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "restoreDrawContext";
    const jsi::Value &value = marshal::ArgAt(args, count, 0);

    std::shared_ptr<DrawScope> scope;
    if (value.isObject() && value.getObject(rt).isHostObject(rt)) {
        scope = std::dynamic_pointer_cast<DrawScope>(value.getObject(rt).getHostObject(rt));
    }
    if (!scope) {
        marshal::Fail(rt, kFunction, "scope", "is not a drawing scope");
    }

    scope->Restore();
    // The handler was queued by Remove; this is the thread that may destroy it.
    runtime::HandlerTable::Shared().Drain(rt);
    return jsi::Value::undefined();
}

} // namespace

void InstallDrawBindings(jsi::Runtime &runtime, jsi::Object &target) {
    target.setProperty(runtime, "installDrawContext", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "installDrawContext"), 2, &BindInstallDrawContext));
    target.setProperty(runtime, "restoreDrawContext", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "restoreDrawContext"), 1, &BindRestoreDrawContext));
}

} // namespace tehreer
