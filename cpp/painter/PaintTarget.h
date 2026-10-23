#pragma once

#include <Tehreer/Tehreer.h>

namespace tehreer::painter {

/**
 * The primitives that a platform provides to draw what Core produces: this is the whole of a
 * painter. Core does all the math (positions are absolute, in pixels, y pointing downward, and
 * already multiplied by the render scale), so an implementation only maps each call onto its
 * canvas. The trampolines in `PaintCallbacks.h` forward the `TRDrawCallbacks` of Core to it.
 *
 * A target is used by one thread at a time, for the length of one draw call, and must not throw:
 * Core is C, and an exception must never unwind through its frames.
 */
class PaintTarget {
public:
    virtual ~PaintTarget() = default;

    /**
     * Draws a glyph image at `origin` (its top-left corner) scaled by `scaleX` and `scaleY`. An
     * alpha image is tinted with `color`; an ARGB image is premultiplied and keeps its own colors.
     * `clip` limits the drawing when it is not NULL. The image is lent for the call.
     */
    virtual void DrawGlyphImage(TRGlyphImageRef image, TRPoint origin, TRFloat scaleX, TRFloat scaleY,
                                TRColor color, const TRRect *clip) = 0;

    virtual void FillRect(TRRect rect, TRColor color) = 0;

    /** Opens a scope: what is drawn until `EndShadow` casts one shadow. Scopes do not nest. */
    virtual void BeginShadow(TRFloat radius, TRFloat dx, TRFloat dy, TRColor color) = 0;
    virtual void EndShadow() = 0;

    /**
     * Draws the replacement of a run, at the start of the run on its baseline. A replacement is
     * application content, which a native painter has nothing to draw from unless a subclass says
     * how (the views do not have any replacement yet), so the default draws nothing.
     */
    virtual void DrawReplacement(const struct _TRGlyphRun * /*run*/, TRPoint /*origin*/) {}
};

} // namespace tehreer::painter
