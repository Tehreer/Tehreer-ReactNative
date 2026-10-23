#pragma once

#include "PaintTarget.h"

namespace tehreer::painter {

/**
 * The draw callbacks of Core that forward to a `PaintTarget`: pass the target as the `userData`
 * of `TRRendererSetDrawCallbacks`. The functions never throw, and a call that Core makes with a
 * NULL target is ignored.
 */
const TRDrawCallbacks &PaintCallbacks();

/**
 * Draws a frame into a target through a renderer: sets the callbacks of `PaintCallbacks()` on the
 * renderer, runs `TRComposedFrameDraw` and puts back the callbacks the renderer had (also if the
 * draw throws), so a renderer that belongs to someone else is left as it was found.
 *
 * @param origin The top left of the frame, in the user space; Core multiplies it, like every
 *      distance, by the render scale of the renderer.
 */
void DrawFrame(TRComposedFrameRef frame, TRRendererRef renderer, PaintTarget &target, TRPoint origin);

/**
 * The renderer of a view: the default one (black text, no shadow) with the render scale of the
 * display. A renderer must not be used by two threads at once, so a view has its own and draws on
 * its UI thread.
 */
class FramePainter final {
public:
    FramePainter();
    ~FramePainter();

    FramePainter(const FramePainter &) = delete;
    FramePainter &operator=(const FramePainter &) = delete;

    /**
     * Draws the frame with its top left at the origin of the target. `renderScale` is the number of
     * pixels in a layout unit, so the glyphs are rendered sharp for the display.
     */
    void Draw(TRComposedFrameRef frame, PaintTarget &target, float renderScale);

private:
    TRRendererRef _renderer;
};

} // namespace tehreer::painter
