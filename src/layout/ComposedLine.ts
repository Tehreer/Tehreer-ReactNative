import { IndexedList } from "../collections/IndexedList.js";
import type { List } from "../collections/List.js";
import type { Point, Rect } from "../geometry.js";
import { Renderer } from "../graphics/Renderer.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import { toRect } from "../internal/Rects.js";
import { checkIndex, checkOrderedRange } from "./Checks.js";
import { GlyphRun } from "./GlyphRun.js";

/** The left and the right edge of a part of a line, measured from its start. */
export interface VisualEdge {
  readonly left: number;
  readonly right: number;
}

/**
 * A line of text that is laid out. It is made of glyph runs, which are in its visual order. A line is
 * immutable and thread safe. The y axis of its positions points downward, and its baseline is at the
 * y of its origin.
 */
export class ComposedLine extends NativeObject<"TRComposedLine"> {
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRComposedLine">) {
    if (token !== adopt) {
      throw new Error("A line is made by a typesetter or a frame.");
    }
    super(handle);
  }

  /** The index of the first code unit of the line. */
  get startIndex(): number {
    return getNativeBindings().TRComposedLineGetStartIndex(this.nativeHandle);
  }

  /** The index after the last code unit of the line. */
  get endIndex(): number {
    return getNativeBindings().TRComposedLineGetEndIndex(this.nativeHandle);
  }

  /** The base level of the paragraph: even for left-to-right and odd for right-to-left. */
  get paragraphLevel(): number {
    return getNativeBindings().TRComposedLineGetParagraphLevel(this.nativeHandle);
  }

  /**
   * The position of the start of the line on its baseline: in the coordinates of its frame, or at
   * zero for a line that a typesetter made.
   */
  get origin(): Point {
    return getNativeBindings().TRComposedLineGetOrigin(this.nativeHandle);
  }

  /** The distance from the baseline to the top of the line. */
  get ascent(): number {
    return getNativeBindings().TRComposedLineGetAscent(this.nativeHandle);
  }

  /** The distance from the baseline to the bottom of the line. */
  get descent(): number {
    return getNativeBindings().TRComposedLineGetDescent(this.nativeHandle);
  }

  /** The extra space below the descent of the line. */
  get leading(): number {
    return getNativeBindings().TRComposedLineGetLeading(this.nativeHandle);
  }

  /** The extent of the line along its direction, including its trailing whitespace. */
  get width(): number {
    return getNativeBindings().TRComposedLineGetWidth(this.nativeHandle);
  }

  /** The sum of the ascent, descent and leading. */
  get height(): number {
    return getNativeBindings().TRComposedLineGetHeight(this.nativeHandle);
  }

  /** The extent of the whitespace at the end of the line, which is part of its width. */
  get trailingWhitespaceExtent(): number {
    return getNativeBindings().TRComposedLineGetTrailingWhitespaceExtent(this.nativeHandle);
  }

  /** Tells whether the line holds a block replacement, which is all that it has. */
  get isBlock(): boolean {
    return getNativeBindings().TRComposedLineIsBlock(this.nativeHandle);
  }

  /** Tells whether the line shows a token in place of some of its text. */
  get isTruncated(): boolean {
    return getNativeBindings().TRComposedLineIsTruncated(this.nativeHandle);
  }

  /**
   * The runs of the line, in the order they appear on the screen. Each element that is read is a
   * wrapper with a reference of its own, which the caller disposes.
   */
  get runs(): List<GlyphRun> {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    return new IndexedList(this, b.TRComposedLineGetGlyphRunCount(handle), (index) => {
      const run = b.TRComposedLineGetGlyphRun(handle, index);
      if (run === undefined) {
        throw new Error(`Core did not return the run ${index}.`);
      }
      return GlyphRun.adopting(run);
    });
  }

  /**
   * Returns the distance from the start of the line to the boundary before a code unit, which can be
   * the end of the line too. The start of the line is its left edge, so the distance is measured
   * along the screen, also in a right-to-left run.
   *
   * @throws RangeError if the code unit is not in the line.
   */
  getCodeUnitDistance(codeUnitIndex: number): number {
    checkIndex("codeUnitIndex", codeUnitIndex);
    const distance = getNativeBindings().TRComposedLineGetCodeUnitDistance(this.nativeHandle, codeUnitIndex);
    if (distance === undefined) {
      throw new RangeError(`The code unit ${codeUnitIndex} is not in the line.`);
    }
    return distance;
  }

  /**
   * Returns the parts of the line that the code units from `fromIndex` up to `toIndex` cover, as
   * their left and right visual edges: a part for each run that the range touches, in the order of
   * the runs.
   *
   * @throws RangeError if the range is not within the line.
   */
  getVisualEdges(fromIndex: number, toIndex: number): VisualEdge[] {
    checkOrderedRange(fromIndex, toIndex);
    const edges = getNativeBindings().TRComposedLineEnumerateVisualEdges(this.nativeHandle, fromIndex, toIndex - fromIndex);
    if (edges === undefined) {
      throw new RangeError(`The range ${fromIndex}..${toIndex} is not within the line.`);
    }
    return edges;
  }

  /** Returns the code unit boundary that is closest to a distance from the start of the line. */
  getCodeUnitIndexAtDistance(distance: number): number {
    return getNativeBindings().TRComposedLineGetCodeUnitIndexAtDistance(this.nativeHandle, distance);
  }

  /**
   * Returns how far to move the start of the line so that it is aligned. The extent that the line
   * does not take, without its trailing whitespace, is multiplied by the flush factor.
   *
   * @param flushFactor 0 to align to the left of the extent, 1 to the right, and 0.5 to center.
   * @param flushExtent The width of the space in which the line is aligned.
   */
  getPenOffset(flushFactor: number, flushExtent: number): number {
    return getNativeBindings().TRComposedLineGetPenOffset(this.nativeHandle, flushFactor, flushExtent);
  }

  /**
   * Computes the box that the ink of the line covers, relative to its origin: an empty rectangle at
   * the origin if no run has ink. The renderer measures the glyphs; it is not changed.
   *
   * @throws TypeError if `renderer` is not a `Renderer`.
   */
  computeInkBox(renderer: Renderer): Rect {
    if (!(renderer instanceof Renderer)) {
      throw new TypeError("renderer must be a Renderer.");
    }
    return toRect(getNativeBindings().TRComposedLineComputeInkBox(this.nativeHandle, renderer.nativeHandle));
  }
}
