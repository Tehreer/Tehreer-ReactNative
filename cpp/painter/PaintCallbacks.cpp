#include "PaintCallbacks.h"

namespace tehreer::painter {
namespace {

// Every function catches everything: a target is not meant to throw, but an exception that left
// one would unwind through the C frames of Core.

PaintTarget *TargetOf(void *userData) {
    return static_cast<PaintTarget *>(userData);
}

void DrawGlyphImage(void *userData, TRGlyphImageRef image, TRPoint origin, TRFloat scaleX, TRFloat scaleY,
                    TRColor color, const TRRect *clip) noexcept {
    try {
        if (PaintTarget *target = TargetOf(userData)) {
            target->DrawGlyphImage(image, origin, scaleX, scaleY, color, clip);
        }
    } catch (...) {
    }
}

void FillRect(void *userData, TRRect rect, TRColor color) noexcept {
    try {
        if (PaintTarget *target = TargetOf(userData)) {
            target->FillRect(rect, color);
        }
    } catch (...) {
    }
}

void DrawReplacement(void *userData, const struct _TRGlyphRun *run, TRPoint origin) noexcept {
    try {
        if (PaintTarget *target = TargetOf(userData)) {
            target->DrawReplacement(run, origin);
        }
    } catch (...) {
    }
}

void BeginShadow(void *userData, TRFloat radius, TRFloat dx, TRFloat dy, TRColor color) noexcept {
    try {
        if (PaintTarget *target = TargetOf(userData)) {
            target->BeginShadow(radius, dx, dy, color);
        }
    } catch (...) {
    }
}

void EndShadow(void *userData) noexcept {
    try {
        if (PaintTarget *target = TargetOf(userData)) {
            target->EndShadow();
        }
    } catch (...) {
    }
}

// Puts the callbacks a renderer had back, on every path out of the draw.
class CallbacksScope final {
public:
    CallbacksScope(TRRendererRef renderer, const TRDrawCallbacks &callbacks, void *userData)
        : _renderer(renderer), _userData(TRRendererGetDrawUserData(renderer)) {
        _previous = {};
        TRRendererGetDrawCallbacks(renderer, &_previous);
        TRRendererSetDrawCallbacks(renderer, &callbacks, userData);
    }

    ~CallbacksScope() { TRRendererSetDrawCallbacks(_renderer, &_previous, _userData); }

    CallbacksScope(const CallbacksScope &) = delete;
    CallbacksScope &operator=(const CallbacksScope &) = delete;

private:
    TRRendererRef _renderer;
    TRDrawCallbacks _previous;
    void *_userData;
};

} // namespace

const TRDrawCallbacks &PaintCallbacks() {
    static const TRDrawCallbacks callbacks = [] {
        // Zero first: members added to the struct later must read as NULL.
        TRDrawCallbacks result = {};
        result.drawGlyphImage = &DrawGlyphImage;
        result.fillRect = &FillRect;
        result.drawReplacement = &DrawReplacement;
        result.beginShadow = &BeginShadow;
        result.endShadow = &EndShadow;
        return result;
    }();
    return callbacks;
}

void DrawFrame(TRComposedFrameRef frame, TRRendererRef renderer, PaintTarget &target, TRPoint origin) {
    CallbacksScope scope(renderer, PaintCallbacks(), &target);
    TRComposedFrameDraw(frame, renderer, origin);
}

FramePainter::FramePainter() : _renderer(TRRendererCreate()) {}

FramePainter::~FramePainter() {
    if (_renderer != nullptr) {
        TRRendererRelease(_renderer);
    }
}

void FramePainter::Draw(TRComposedFrameRef frame, PaintTarget &target, float renderScale) {
    if (_renderer == nullptr || frame == nullptr) {
        return;
    }

    TRRendererSetRenderScale(_renderer, renderScale);
    DrawFrame(frame, _renderer, target, TRPoint{0, 0});
}

} // namespace tehreer::painter
