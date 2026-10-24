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
 * draw throws), so a renderer that belongs to someone else is left as it was found. The target is
 * wrapped in the `ReplacementDrawer`, which fills what a `ReplacementHolder` recorded and gives
 * every other replacement to the target.
 *
 * @param origin The top left of the frame, in the user space; Core multiplies it, like every
 *      distance, by the render scale of the renderer.
 */
void DrawFrame(TRComposedFrameRef frame, TRRendererRef renderer, PaintTarget &target, TRPoint origin);

/**
 * Draws one line of a frame as `DrawFrame` draws the frame. `origin` is the origin of the line's
 * container, which is the top left of the frame (a line adds its own origin to it), so the line
 * views of a scrolling text draw their line with the offset of their own box.
 */
void DrawLine(TRComposedLineRef line, TRRendererRef renderer, PaintTarget &target, TRPoint origin);

} // namespace tehreer::painter
