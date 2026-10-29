import { IndexedList } from "../collections/IndexedList.js";
import type { List } from "../collections/List.js";
import type { Rect } from "../geometry.js";
import { drawIntoContext } from "../drawing/Drawing.js";
import type { DrawingContext } from "../drawing/DrawingContext.js";
import type { Renderer } from "../graphics/Renderer.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import { toRect } from "../internal/Rects.js";
import { checkIndex, checkOrderedRange } from "./Checks.js";
import { ComposedLine } from "./ComposedLine.js";

/**
 * Lines of text that are laid out in a frame. A frame is immutable and thread safe. Its coordinates
 * have the origin at its top left, with the y axis pointing downward.
 */
export class ComposedFrame extends NativeObject<"TRComposedFrame"> {
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRComposedFrame">) {
    if (token !== adopt) {
      throw new Error("A frame is made by a frame resolver.");
    }
    super(handle);
  }

  /** The index of the first code unit of the frame. */
  get startIndex(): number {
    return getNativeBindings().TRComposedFrameGetStartIndex(this.nativeHandle);
  }

  /** The index after the last code unit of the frame. */
  get endIndex(): number {
    return getNativeBindings().TRComposedFrameGetEndIndex(this.nativeHandle);
  }

  /** The width of the frame, which is the extent of its widest line when the frame fits horizontally. */
  get width(): number {
    return getNativeBindings().TRComposedFrameGetWidth(this.nativeHandle);
  }

  /** The height of the frame, which is the extent of all lines when the frame fits vertically. */
  get height(): number {
    return getNativeBindings().TRComposedFrameGetHeight(this.nativeHandle);
  }

  /**
   * The lines of the frame, from the top. Each element that is read is a wrapper with a reference of
   * its own, which the caller disposes, and which stays valid when the frame is disposed.
   */
  get lines(): List<ComposedLine> {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    return new IndexedList(this, b.TRComposedFrameGetLineCount(handle), (index) => {
      const line = b.TRComposedFrameGetLine(handle, index);
      if (line === undefined) {
        throw new Error(`Core did not return the line ${index}.`);
      }
      return ComposedLine.adopting(line);
    });
  }

  /**
   * Returns the index of the line that has a code unit. The end index of the frame belongs to the
   * last line.
   *
   * @returns The index of the line, or -1 if the code unit has none.
   * @throws RangeError if the index is not a whole number that is not negative.
   */
  getLineIndexForCodeUnit(codeUnitIndex: number): number {
    checkIndex("codeUnitIndex", codeUnitIndex);
    return getNativeBindings().TRComposedFrameGetLineIndexForCodeUnit(this.nativeHandle, codeUnitIndex);
  }

  /**
   * Returns the index of the line that suits a position best: the line whose top and bottom have its
   * y, or the last line if there is none. Only the y is considered.
   */
  getLineIndexAtPosition(x: number, y: number): number {
    return getNativeBindings().TRComposedFrameGetLineIndexAtPosition(this.nativeHandle, { x, y });
  }

  /**
   * Returns the first code unit of the cluster that is under a position, which is the character that
   * a point hits, for any direction of text. The line is the one whose top and bottom have the y, and
   * the x is measured from the origin of the line (see `ComposedLine.getClusterStartAtDistance`). A
   * cluster is never split.
   *
   * @param x The x in the coordinates of the frame. An infinite one hits nothing.
   * @param y The y in the coordinates of the frame. An infinite one hits nothing.
   * @returns The index, or -1 if no character is there: the position is above or below the lines,
   *   outside the runs of the line, or on a truncation token, or the frame has no lines.
   * @throws RangeError if `x` or `y` is NaN (Core answers -1 for it, but a NaN is a mistake of the
   *   caller everywhere in this library).
   */
  getClusterStartAtPosition(x: number, y: number): number {
    return getNativeBindings().TRComposedFrameGetClusterStartAtPosition(this.nativeHandle, { x, y });
  }

  /**
   * Returns the rectangles that cover the code units from `fromIndex` up to `toIndex`, in the
   * coordinates of the frame. A range that spans lines is covered with the paddings of the lines too:
   * the space after the text of the first line, the whole width of each line in between, and the
   * space before the text of the last line. The text that a truncated line cuts out has no rectangle.
   *
   * @throws RangeError if the range is not within the frame.
   */
  getSelectionRects(fromIndex: number, toIndex: number): Rect[] {
    checkOrderedRange(fromIndex, toIndex);
    const rects = getNativeBindings().TRComposedFrameEnumerateSelection(this.nativeHandle, fromIndex, toIndex - fromIndex);
    if (rects === undefined) {
      throw new RangeError(`The range ${fromIndex}..${toIndex} is not within the frame.`);
    }
    return rects.map(toRect);
  }

  /**
   * Draws the lines of the frame into a context, in the order of the text, as
   * {@link ComposedLine.draw} does. Selections and carets are not drawn: fill the rectangles of
   * {@link getSelectionRects} before or after.
   *
   * Core sets the renderer up for each run while it draws and gives it back as it was. Its render
   * scale, draw style, stroke and shadow settings are used. This is the slow path (see
   * {@link DrawingContext}): the callbacks of the context are installed on the renderer for the
   * call and removed after it, also when an error is thrown, and the callbacks the renderer had
   * before are restored.
   *
   * @param renderer The renderer whose settings and glyph cache are used.
   * @param context The surface that receives the glyph images, rectangles and shadows.
   * @param x The x of the top left of the frame, in the user space.
   * @param y The y of the top left, with the y axis pointing downward.
   *
   * @throws TypeError if `renderer` is not a `Renderer`, or the context lacks `drawGlyphImage` or `fillRect`.
   * @throws Error if this object, the renderer or a number is not valid (disposed, NaN), or with the
   *   first error that a member of the context (or a replacement's `draw`) throws, after Core returned.
   */
  draw(renderer: Renderer, context: DrawingContext, x: number, y: number): void {
    drawIntoContext(this.nativeHandle, renderer, context, (frame, rendererHandle) =>
      getNativeBindings().TRComposedFrameDraw(frame, rendererHandle, { x, y }));
  }
}
