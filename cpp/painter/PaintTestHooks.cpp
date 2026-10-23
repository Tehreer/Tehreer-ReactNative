#include "PaintBindings.h"

#ifndef NDEBUG

#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"
#include "../generated/Structs.h"
#include "../runtime/Errors.h"
#include "OffscreenSurface.h"
#include "PaintCallbacks.h"
#include "PaintCounters.h"

#include <exception>
#include <memory>
#include <string>
#include <utility>

namespace tehreer {

namespace jsi = facebook::jsi;
using painter::PaintTarget;

namespace {

// The bytes of a result, moved into an ArrayBuffer without a copy.
class VectorBuffer final : public jsi::MutableBuffer {
public:
    explicit VectorBuffer(std::vector<std::uint8_t> bytes) : _bytes(std::move(bytes)) {}
    size_t size() const override { return _bytes.size(); }
    uint8_t *data() override { return _bytes.data(); }

private:
    std::vector<std::uint8_t> _bytes;
};

void Define(jsi::Runtime &runtime, jsi::Object &target, const char *name, unsigned int parameters, jsi::HostFunctionType function) {
    target.setProperty(runtime, name, jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, name), parameters, std::move(function)));
}

// The `Rect` of the TypeScript API ({ x, y, width, height }), which a delegate's `draw` passes to the
// drawing context; Core's own struct is { origin, size }.
TRRect RectFromJs(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter) {
    jsi::Object object = marshal::ToObject(rt, value, function, parameter);
    TRRect rect;
    rect.origin.x = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "x"), function, parameter);
    rect.origin.y = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "y"), function, parameter);
    rect.size.width = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "width"), function, parameter);
    rect.size.height = marshal::ToNumber<TRFloat>(rt, object.getProperty(rt, "height"), function, parameter);
    return rect;
}

/**
 * The target that the hook draws into. It forwards every primitive to the platform's, and gives the
 * replacement of a run to a JavaScript function of the test, together with a drawing context whose
 * members are those same primitives: that is how a delegate's `draw(context, bounds)` reaches the
 * painter. The views have no such function (a replacement's JavaScript cannot run on the UI thread).
 */
class HookTarget final : public PaintTarget {
public:
    HookTarget(jsi::Runtime &runtime, PaintTarget &inner, std::shared_ptr<jsi::Function> replacement)
        : _runtime(runtime), _inner(inner), _replacement(std::move(replacement)), _alive(std::make_shared<bool>(true)) {}

    ~HookTarget() override { *_alive = false; }

    void DrawGlyphImage(TRGlyphImageRef image, TRPoint origin, TRFloat scaleX, TRFloat scaleY, TRColor color,
                        const TRRect *clip) override {
        _inner.DrawGlyphImage(image, origin, scaleX, scaleY, color, clip);
    }

    void FillRect(TRRect rect, TRColor color) override { _inner.FillRect(rect, color); }
    void BeginShadow(TRFloat radius, TRFloat dx, TRFloat dy, TRColor color) override { _inner.BeginShadow(radius, dx, dy, color); }
    void EndShadow() override { _inner.EndShadow(); }

    void DrawReplacement(const struct _TRGlyphRun *run, TRPoint origin) override {
        // After a failure nothing else runs, as for every callback of Core.
        if (!_replacement || _error) {
            return;
        }

        try {
            jsi::Object context = MakeContext();
            jsi::Value handle = marshal::FromHandle<TRGlyphRunRef>(_runtime, run, marshal::Ownership::Retain);
            _replacement->call(_runtime, std::move(context), std::move(handle),
                               marshal::FromNumber<TRFloat>(_runtime, origin.x), marshal::FromNumber<TRFloat>(_runtime, origin.y));
        } catch (...) {
            _error = std::current_exception();
        }
    }

    /** Throws what the function of the test threw. */
    void Rethrow() {
        if (_error) {
            std::rethrow_exception(_error);
        }
    }

private:
    jsi::Object MakeContext() {
        jsi::Runtime &rt = _runtime;
        jsi::Object context(rt);
        // A context that the test kept after the draw must not reach a target that is gone.
        std::shared_ptr<bool> alive = _alive;
        PaintTarget *inner = &_inner;

        Define(rt, context, "fillRect", 2, [alive, inner](jsi::Runtime &r, const jsi::Value &, const jsi::Value *args, size_t count) {
            if (*alive) {
                TRRect rect = RectFromJs(r, marshal::ArgAt(args, count, 0), "fillRect", "rect");
                inner->FillRect(rect, marshal::ToNumber<TRColor>(r, marshal::ArgAt(args, count, 1), "fillRect", "color"));
            }
            return jsi::Value::undefined();
        });

        // Takes a `GlyphImage` (its `nativeHandle`) or a handle.
        Define(rt, context, "drawGlyphImage", 7, [alive, inner](jsi::Runtime &r, const jsi::Value &, const jsi::Value *args, size_t count) {
            if (!*alive) {
                return jsi::Value::undefined();
            }
            const jsi::Value &imageArg = marshal::ArgAt(args, count, 0);
            jsi::Value handleValue = jsi::Value::undefined();
            if (imageArg.isObject() && !imageArg.getObject(r).isHostObject(r)) {
                handleValue = imageArg.getObject(r).getProperty(r, "nativeHandle");
            }
            TRGlyphImageRef image = marshal::ToHandle<TRGlyphImageRef>(
                r, handleValue.isUndefined() ? imageArg : handleValue, "drawGlyphImage", "image", false);
            TRPoint origin{
                marshal::ToNumber<TRFloat>(r, marshal::ArgAt(args, count, 1), "drawGlyphImage", "x"),
                marshal::ToNumber<TRFloat>(r, marshal::ArgAt(args, count, 2), "drawGlyphImage", "y")};
            TRFloat scaleX = marshal::ToNumber<TRFloat>(r, marshal::ArgAt(args, count, 3), "drawGlyphImage", "scaleX");
            TRFloat scaleY = marshal::ToNumber<TRFloat>(r, marshal::ArgAt(args, count, 4), "drawGlyphImage", "scaleY");
            TRColor color = marshal::ToNumber<TRColor>(r, marshal::ArgAt(args, count, 5), "drawGlyphImage", "color");
            const jsi::Value &clipArg = marshal::ArgAt(args, count, 6);
            if (marshal::IsNullish(clipArg)) {
                inner->DrawGlyphImage(image, origin, scaleX, scaleY, color, nullptr);
            } else {
                TRRect clip = RectFromJs(r, clipArg, "drawGlyphImage", "clip");
                inner->DrawGlyphImage(image, origin, scaleX, scaleY, color, &clip);
            }
            return jsi::Value::undefined();
        });

        Define(rt, context, "beginShadow", 4, [alive, inner](jsi::Runtime &r, const jsi::Value &, const jsi::Value *args, size_t count) {
            if (*alive) {
                inner->BeginShadow(
                    marshal::ToNumber<TRFloat>(r, marshal::ArgAt(args, count, 0), "beginShadow", "radius"),
                    marshal::ToNumber<TRFloat>(r, marshal::ArgAt(args, count, 1), "beginShadow", "dx"),
                    marshal::ToNumber<TRFloat>(r, marshal::ArgAt(args, count, 2), "beginShadow", "dy"),
                    marshal::ToNumber<TRColor>(r, marshal::ArgAt(args, count, 3), "beginShadow", "color"));
            }
            return jsi::Value::undefined();
        });

        Define(rt, context, "endShadow", 0, [alive, inner](jsi::Runtime &, const jsi::Value &, const jsi::Value *, size_t) {
            if (*alive) {
                inner->EndShadow();
            }
            return jsi::Value::undefined();
        });

        return context;
    }

    jsi::Runtime &_runtime;
    PaintTarget &_inner;
    std::shared_ptr<jsi::Function> _replacement;
    std::shared_ptr<bool> _alive;
    std::exception_ptr _error;
};

// testPaintFrame(frame, renderer, { width, height, background, replacement? }):
// draws the frame at the top left of an offscreen canvas of the platform, at the render scale of
// the renderer, and returns { width, height, pixels } with the pixels in pixels, RGBA, row by row.
jsi::Value PaintFrame(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "testPaintFrame";
    marshal::BeginCall();

    TRComposedFrameRef frame = marshal::ToHandle<TRComposedFrameRef>(rt, marshal::ArgAt(args, count, 0), kFunction, "frame", false);
    TRRendererRef renderer = marshal::ToHandle<TRRendererRef>(rt, marshal::ArgAt(args, count, 1), kFunction, "renderer", false);
    jsi::Object options = marshal::ToObject(rt, marshal::ArgAt(args, count, 2), kFunction, "options");

    float width = marshal::ToNumber<TRFloat>(rt, options.getProperty(rt, "width"), kFunction, "width");
    float height = marshal::ToNumber<TRFloat>(rt, options.getProperty(rt, "height"), kFunction, "height");
    TRColor background = marshal::ToNumber<TRColor>(rt, options.getProperty(rt, "background"), kFunction, "background");
    float density = TRRendererGetRenderScale(renderer);
    if (!(width > 0) || !(height > 0) || !(density > 0) || width * density > 4096 || height * density > 4096) {
        runtime::FailRange(rt, kFunction, "options", "the canvas must be between 0 and 4096 pixels in each direction");
    }

    std::shared_ptr<jsi::Function> replacement;
    jsi::Value member = options.getProperty(rt, "replacement");
    if (member.isObject() && member.getObject(rt).isFunction(rt)) {
        replacement = std::make_shared<jsi::Function>(member.getObject(rt).asFunction(rt));
    }

    painter::OffscreenPixels pixels;
    std::exception_ptr failure;
    bool made = painter::RenderOffscreen(width, height, density, background, [&](PaintTarget &platform) {
        HookTarget target(rt, platform, replacement);
        painter::DrawFrame(frame, renderer, target, TRPoint{0, 0});
        try {
            target.Rethrow();
        } catch (...) {
            failure = std::current_exception();
        }
    }, pixels);
    if (failure) {
        std::rethrow_exception(failure);
    }
    if (!made) {
        runtime::ThrowError(rt, "Error", "testPaintFrame: the platform could not make the canvas");
    }

    jsi::Object result(rt);
    result.setProperty(rt, "width", pixels.width);
    result.setProperty(rt, "height", pixels.height);
    result.setProperty(rt, "pixels", jsi::ArrayBuffer(rt, std::make_shared<VectorBuffer>(std::move(pixels.rgba))));
    return jsi::Value(rt, result);
}

jsi::Value GetPaintCounts(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t) {
    jsi::Object counts(rt);
    counts.setProperty(rt, "created", static_cast<double>(painter::PaintCounters::Created().load()));
    counts.setProperty(rt, "destroyed", static_cast<double>(painter::PaintCounters::Destroyed().load()));
    return jsi::Value(rt, counts);
}

} // namespace

void InstallPaintTestHooks(jsi::Runtime &runtime, jsi::Object &target) {
    Define(runtime, target, "testPaintFrame", 3, PaintFrame);
    Define(runtime, target, "testGetPaintCounts", 0, GetPaintCounts);
}

} // namespace tehreer

#endif
