import type { Rect } from "../geometry.js";
import { Renderer } from "../graphics/Renderer.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import { NativeObject } from "../internal/NativeObject.js";
import { toNativeRect, toRect } from "../internal/Rects.js";
import { checkIndex } from "./Checks.js";
import { ComposedFrame } from "./ComposedFrame.js";

/**
 * Finds the lines of a frame that are in an area, by the boxes that cover their ink, without looking
 * at all of them. It is made once for a frame, and measures the lines with the renderer as it is at
 * that time. It is immutable and thread safe.
 *
 * Core does not retain the frame, so the locator keeps a reference to the frame and to the renderer of
 * its own until it is disposed: disposing the objects it was made with does not affect it.
 */
export class LineLocator extends NativeObject<"TRLineLocator"> {
  #frame: ComposedFrame | undefined;
  #renderer: Renderer | undefined;

  /**
   * @throws TypeError if `frame` or `renderer` is of the wrong class.
   * @throws Error if Core cannot make the locator, for example because the boxes of the lines are
   *   not finite or exceed its limits.
   */
  constructor(frame: ComposedFrame, renderer: Renderer) {
    if (!(frame instanceof ComposedFrame)) {
      throw new TypeError("frame must be a ComposedFrame.");
    }
    if (!(renderer instanceof Renderer)) {
      throw new TypeError("renderer must be a Renderer.");
    }

    const b = getNativeBindings();
    const created = b.TRLineLocatorCreate(frame.nativeHandle, renderer.nativeHandle);
    if (created === undefined) {
      throw new Error("Could not create a line locator.");
    }

    // Two references of its own, taken before anything is kept, so that a failure gives back all
    // that was taken.
    let keptFrame: ComposedFrame | undefined;
    let keptRenderer: Renderer | undefined;
    try {
      keptFrame = ComposedFrame.retaining(frame.nativeHandle, b.TRComposedFrameRetain);
      keptRenderer = Renderer.retaining(renderer.nativeHandle, b.TRRendererRetain);
    } catch (error) {
      keptFrame?.dispose();
      b.disposeHandle(created);
      throw error;
    }

    super(created);
    this.#frame = keptFrame;
    this.#renderer = keptRenderer;
  }

  /** The number of lines of the frame, which is never zero. */
  get lineCount(): number {
    return getNativeBindings().TRLineLocatorGetLineCount(this.nativeHandle);
  }

  /**
   * Returns the box that covers the ink of a line, in the coordinates of the frame. Its edges are
   * whole numbers.
   *
   * @throws RangeError if the index is not of a line.
   */
  getLineBox(lineIndex: number): Rect {
    checkIndex("lineIndex", lineIndex);
    const box = getNativeBindings().TRLineLocatorGetLineBox(this.nativeHandle, lineIndex);
    if (box === undefined) {
      throw new RangeError(`lineIndex (${lineIndex}) is not a line of the frame.`);
    }
    return toRect(box);
  }

  /**
   * Returns the indices of the lines whose boxes meet a rectangle, which are in the order of the
   * frame unless the ink of a line reaches above the lines before it. A box that only touches the
   * rectangle is not found. The origin and the size may be infinite.
   *
   * @throws RangeError if the origin or the size is NaN, or a size is negative.
   */
  findLines(bounds: Rect): number[] {
    const lines = getNativeBindings().TRLineLocatorEnumerateLines(this.nativeHandle, toNativeRect(bounds));
    if (lines === undefined) {
      throw new RangeError("The bounds must have a size that is not negative, and no NaN.");
    }
    return lines;
  }

  /**
   * Returns the index of the first line whose box reaches below a y.
   *
   * @returns The index, or -1 if no box reaches below it.
   */
  getFirstLineIndexBelow(y: number): number {
    return getNativeBindings().TRLineLocatorGetFirstLineIndexBelow(this.nativeHandle, y);
  }

  override dispose(): void {
    super.dispose();
    this.#frame?.dispose();
    this.#frame = undefined;
    this.#renderer?.dispose();
    this.#renderer = undefined;
  }
}
