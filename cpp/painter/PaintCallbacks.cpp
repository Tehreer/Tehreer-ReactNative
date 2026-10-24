#include "PaintCallbacks.h"

#include "../fabric/StaticReplacements.h"

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

// Fills the rectangles of a static replacement; every other call goes to the platform target. The
// scale turns layout units into pixels, which the target takes.
class ReplacementTarget final : public PaintTarget {
public:
    ReplacementTarget(PaintTarget &inner, float scale) : _inner(inner), _scale(scale) {}

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
        if (replacement == nullptr) {
            return;
        }
        auto paint = fabric::StaticReplacements::FindPaint(replacement);
        if (!paint) {
            return;
        }
        // The origin is the start of the run on its baseline, in pixels.
        for (const fabric::ReplacementRect &rect : paint->rects) {
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

struct SelectionContext {
    PaintTarget *target;
    float scale;
    TRColor color;
};

void FillSelection(void *userData, TRRect rect, TRBoolean *) {
    auto *context = static_cast<SelectionContext *>(userData);
    rect.origin.x *= context->scale;
    rect.origin.y *= context->scale;
    rect.size.width *= context->scale;
    rect.size.height *= context->scale;
    context->target->FillRect(rect, context->color);
}

struct LineContext {
    TRComposedFrameRef frame;
    TRRendererRef renderer;
};

void DrawLine(void *userData, TRUInteger lineIndex, TRBoolean *) {
    auto *context = static_cast<LineContext *>(userData);
    if (TRComposedLineRef line = TRComposedFrameGetLine(context->frame, lineIndex)) {
        // A line takes the origin of its container, which is the top left of the frame.
        TRComposedLineDraw(line, context->renderer, TRPoint{0, 0});
    }
}

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

void FramePainter::ReleaseLocator() {
    if (_locator != nullptr) {
        TRLineLocatorRelease(_locator);
        _locator = nullptr;
    }
    if (_locatorFrame != nullptr) {
        TRComposedFrameRelease(_locatorFrame);
        _locatorFrame = nullptr;
    }
}

FramePainter::~FramePainter() {
    ReleaseLocator();
    if (_renderer != nullptr) {
        TRRendererRelease(_renderer);
    }
}

void FramePainter::Draw(TRComposedFrameRef frame, PaintTarget &target, float renderScale) {
    Draw(frame, target, renderScale, FramePaint{});
}

void FramePainter::Draw(TRComposedFrameRef frame, PaintTarget &target, float renderScale, const FramePaint &paint) {
    if (_renderer == nullptr || frame == nullptr) {
        return;
    }

    TRRendererSetRenderScale(_renderer, renderScale);
    TRRendererSetForegroundColor(_renderer, paint.textColor);

    // The selection lies behind the text, so it is filled first.
    if (paint.selectionStart >= 0 && paint.selectionEnd > paint.selectionStart) {
        SelectionContext selection{&target, renderScale, paint.selectionColor};
        TRComposedFrameEnumerateSelection(frame, static_cast<TRUInteger>(paint.selectionStart),
                                          static_cast<TRUInteger>(paint.selectionEnd - paint.selectionStart),
                                          &FillSelection, &selection);
    }

    ReplacementTarget replacements(target, renderScale);
    if (!paint.isWindowed) {
        DrawFrame(frame, _renderer, replacements, TRPoint{0, 0});
        return;
    }

    if (_locator == nullptr || _locatorFrame != frame || _locatorScale != renderScale) {
        ReleaseLocator();
        _locator = TRLineLocatorCreate(frame, _renderer);
        if (_locator == nullptr) {
            // The locator cannot bound the lines (a frame this tall in pixels): paint all of them.
            DrawFrame(frame, _renderer, replacements, TRPoint{0, 0});
            return;
        }
        _locatorFrame = TRComposedFrameRetain(frame);
        _locatorScale = renderScale;
    }

    LineContext lines{frame, _renderer};
    CallbacksScope scope(_renderer, PaintCallbacks(), &replacements);
    TRLineLocatorEnumerateLines(_locator, paint.visible, &DrawLine, &lines);
}

} // namespace tehreer::painter
