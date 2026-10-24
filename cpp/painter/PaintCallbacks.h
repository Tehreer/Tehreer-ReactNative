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

/** What a view paints besides the frame itself; none of it changes the layout. */
struct FramePaint {
    /** The foreground color of the text that has none of its own. */
    TRColor textColor = 0xFF000000u;
    /** The range of code units to cover with `selectionColor` before the text, or -1 for none. */
    long selectionStart = -1;
    long selectionEnd = -1;
    TRColor selectionColor = 0x553390FFu;
    /**
     * Draws only the lines whose boxes meet `visible` (in the coordinates of the frame, layout
     * units) when `isWindowed` is set: a scrolling view paints the lines in view and nothing else.
     */
    bool isWindowed = false;
    TRRect visible = {};
};

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

    /**
     * As above, with the selection, the text color and, for a scrolling view, the visible window.
     * The replacements of the frame are static ones (`StaticReplacements`), whose rectangles are
     * filled through the target; a replacement of another kind draws nothing.
     */
    void Draw(TRComposedFrameRef frame, PaintTarget &target, float renderScale, const FramePaint &paint);

    /**
     * Lets go of the locator and the reference of the frame that it keeps, so that a view that no
     * longer shows the frame does not keep the frame (and what it holds, such as a replacement's
     * data) alive until its next draw.
     */
    void Reset() { ReleaseLocator(); }

private:
    void ReleaseLocator();

    TRRendererRef _renderer;
    /**
     * The locator of the last windowed frame, and a reference of that frame (a locator does not
     * keep it, and a new frame can have the address of a freed one). Rebuilt when either changes.
     */
    TRLineLocatorRef _locator = nullptr;
    TRComposedFrameRef _locatorFrame = nullptr;
    float _locatorScale = 0;
};

} // namespace tehreer::painter
