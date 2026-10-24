#include "PaintCallbacks.h"

#include "../views/ReplacementHolder.h"

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

// Draws the replacements for Core, as `ReplacementDrawer` does in Tehreer-Android: one that a holder
// made is filled from what the holder recorded, anything else goes to the target. The scale turns
// layout units into pixels, which the target takes.
class ReplacementDrawer final : public PaintTarget {
public:
    ReplacementDrawer(PaintTarget &inner, float scale) : _inner(inner), _scale(scale) {}

    void DrawGlyphImage(TRGlyphImageRef image, TRPoint origin, TRFloat scaleX, TRFloat scaleY, TRColor color,
                        const TRRect *clip) override {
        _inner.DrawGlyphImage(image, origin, scaleX, scaleY, color, clip);
    }
    void FillRect(TRRect rect, TRColor color) override { _inner.FillRect(rect, color); }
    void BeginShadow(TRFloat radius, TRFloat dx, TRFloat dy, TRColor color) override {
        _inner.BeginShadow(radius, dx, dy, color);
    }
    void EndShadow() override { _inner.EndShadow(); }

    void DrawReplacement(const struct _TRGlyphRun *run, TRPoint origin) override {
        TRReplacementRef replacement = TRGlyphRunGetReplacement(run);
        const views::ReplacementHolder *holder = replacement == nullptr ? nullptr : views::ReplacementHolder::Find(replacement);
        if (holder == nullptr) {
            _inner.DrawReplacement(run, origin);
            return;
        }
        // The origin is the start of the run on its baseline, in pixels.
        for (const views::ReplacementRect &rect : holder->rects) {
            TRRect pixels;
            pixels.origin.x = origin.x + rect.x * _scale;
            pixels.origin.y = origin.y + rect.y * _scale;
            pixels.size.width = rect.width * _scale;
            pixels.size.height = rect.height * _scale;
            _inner.FillRect(pixels, rect.color);
        }
    }

private:
    PaintTarget &_inner;
    float _scale;
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
    ReplacementDrawer drawer(target, TRRendererGetRenderScale(renderer));
    CallbacksScope scope(renderer, PaintCallbacks(), &drawer);
    TRComposedFrameDraw(frame, renderer, origin);
}

void DrawLine(TRComposedLineRef line, TRRendererRef renderer, PaintTarget &target, TRPoint origin) {
    ReplacementDrawer drawer(target, TRRendererGetRenderScale(renderer));
    CallbacksScope scope(renderer, PaintCallbacks(), &drawer);
    TRComposedLineDraw(line, renderer, origin);
}

} // namespace tehreer::painter
