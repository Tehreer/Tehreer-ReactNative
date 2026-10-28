import { coreIndices, coreNumbers, corePoints } from "../collections/CoreList.js";
import type { NumberList, PointList } from "../collections/List.js";
import type { Float, UInt16, UInt32 } from "../collections/NumberKind.js";
import type { Color } from "../Color.js";
import type { Point, Rect } from "../geometry.js";
import { Renderer } from "../graphics/Renderer.js";
import { Typeface } from "../graphics/Typeface.js";
import { drawIntoContext } from "../drawing/Drawing.js";
import type { DrawingContext } from "../drawing/DrawingContext.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import { toRect } from "../internal/Rects.js";
import type { WritingDirection } from "../sfnt/enums.js";
import { checkIndex } from "./Checks.js";
import { Replacement } from "./Replacement.js";

/**
 * A run of glyphs that share their typeface, size, direction and other attributes. A line is made
 * of runs, which are in its visual order. A run is immutable and thread safe.
 *
 * Positions are relative to the start of the line, and indices are those of the text. The lists read
 * the memory of Core when an element is asked for, and fail once the run is disposed.
 */
export class GlyphRun extends NativeObject<"TRGlyphRun"> {
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRGlyphRun">) {
    if (token !== adopt) {
      throw new Error("A glyph run is made by a line.");
    }
    super(handle);
  }

  /** The index of the first code unit of the run. */
  get startIndex(): number {
    return getNativeBindings().TRGlyphRunGetStartIndex(this.nativeHandle);
  }

  /** The index after the last code unit of the run. */
  get endIndex(): number {
    return getNativeBindings().TRGlyphRunGetEndIndex(this.nativeHandle);
  }

  /** The number of code units before the start of the run that its first cluster takes too. */
  get startExtraLength(): number {
    return getNativeBindings().TRGlyphRunGetStartExtraLength(this.nativeHandle);
  }

  /** The number of code units after the end of the run that its last cluster takes too. */
  get endExtraLength(): number {
    return getNativeBindings().TRGlyphRunGetEndExtraLength(this.nativeHandle);
  }

  /** The bidirectional level: even for left-to-right and odd for right-to-left. */
  get bidiLevel(): number {
    return getNativeBindings().TRGlyphRunGetBidiLevel(this.nativeHandle);
  }

  /** The direction in which the glyphs of the run are written. */
  get writingDirection(): WritingDirection {
    return getNativeBindings().TRGlyphRunGetWritingDirection(this.nativeHandle) as WritingDirection;
  }

  /**
   * Tells whether the direction of the run opposes the default direction of its script, which is
   * what Core means by backward. It is false for right-to-left Urdu, whose script is right to left.
   */
  get isBackward(): boolean {
    return getNativeBindings().TRGlyphRunIsBackward(this.nativeHandle);
  }

  /**
   * The typeface of the glyphs. A run of a replacement has one too, since Core refuses text that has none; it is
   * `undefined` only if Core gives none. Each read gives a wrapper
   * with a reference of its own, which the caller disposes.
   */
  get typeface(): Typeface | undefined {
    const handle = getNativeBindings().TRGlyphRunGetTypeface(this.nativeHandle);
    return handle === undefined ? undefined : Typeface.adopting(handle);
  }

  /** The size of the em square used to scale the glyphs. */
  get typeSize(): number {
    return getNativeBindings().TRGlyphRunGetTypeSize(this.nativeHandle);
  }

  /** The horizontal scale of the glyphs. */
  get scaleX(): number {
    return getNativeBindings().TRGlyphRunGetScaleX(this.nativeHandle);
  }

  /** The vertical scale of the glyphs. */
  get scaleY(): number {
    return getNativeBindings().TRGlyphRunGetScaleY(this.nativeHandle);
  }

  /**
   * What replaces the text of the run, if anything does. Each read gives a wrapper with a reference
   * of its own, which the caller disposes.
   */
  get replacement(): Replacement | undefined {
    const handle = getNativeBindings().TRGlyphRunGetReplacement(this.nativeHandle);
    return handle === undefined ? undefined : Replacement.adopting(handle);
  }

  /** The foreground color that the text sets, or `undefined` if it sets none. */
  get foregroundColor(): Color | undefined {
    return getNativeBindings().TRGlyphRunGetForegroundColor(this.nativeHandle);
  }

  /** The background color that the text sets, or `undefined` if it sets none. */
  get backgroundColor(): Color | undefined {
    return getNativeBindings().TRGlyphRunGetBackgroundColor(this.nativeHandle);
  }

  /** The color of the decorations that the text sets, or `undefined` if it sets none. */
  get decorationColor(): Color | undefined {
    return getNativeBindings().TRGlyphRunGetDecorationColor(this.nativeHandle);
  }

  /** Tells whether the run is underlined. */
  get hasUnderline(): boolean {
    return getNativeBindings().TRGlyphRunHasUnderline(this.nativeHandle);
  }

  /** Tells whether the run is struck through. */
  get hasStrikethrough(): boolean {
    return getNativeBindings().TRGlyphRunHasStrikethrough(this.nativeHandle);
  }

  /** The token that the text sets as its `userData` attribute, or 0 if it sets none. */
  get userData(): number {
    return getNativeBindings().TRGlyphRunGetUserData(this.nativeHandle);
  }

  /** The distance from the baseline to the top of the run. */
  get ascent(): number {
    return getNativeBindings().TRGlyphRunGetAscent(this.nativeHandle);
  }

  /** The distance from the baseline to the bottom of the run. */
  get descent(): number {
    return getNativeBindings().TRGlyphRunGetDescent(this.nativeHandle);
  }

  /** The extra space between this run and the next line. */
  get leading(): number {
    return getNativeBindings().TRGlyphRunGetLeading(this.nativeHandle);
  }

  /** The position of the start of the run on its baseline, relative to the line. */
  get origin(): Point {
    return getNativeBindings().TRGlyphRunGetOrigin(this.nativeHandle);
  }

  /** The advance of the whole run. */
  get width(): number {
    return getNativeBindings().TRGlyphRunGetWidth(this.nativeHandle);
  }

  /** The height of the run, which is its ascent plus its descent plus its leading. */
  get height(): number {
    return getNativeBindings().TRGlyphRunGetHeight(this.nativeHandle);
  }

  /** The number of glyphs in the run. */
  get glyphCount(): number {
    return getNativeBindings().TRGlyphRunGetGlyphCount(this.nativeHandle);
  }

  /** The ID of each glyph, in the order of the writing direction. */
  get glyphIds(): NumberList<UInt16> {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    return coreNumbers(this, b.TRGlyphRunGetGlyphIDsPtr(handle), b.TRGlyphRunGetGlyphCount(handle), "UInt16");
  }

  /** The offset of each glyph from its pen position, with the y axis pointing up. */
  get glyphOffsets(): PointList {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    return corePoints(this, b.TRGlyphRunGetGlyphOffsetsPtr(handle), b.TRGlyphRunGetGlyphCount(handle));
  }

  /** The advance of each glyph. */
  get glyphAdvances(): NumberList<Float> {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    return coreNumbers(this, b.TRGlyphRunGetGlyphAdvancesPtr(handle), b.TRGlyphRunGetGlyphCount(handle), "Float");
  }

  /** The index of the first glyph of the cluster of each code unit of the run, from its start. */
  get clusterMap(): NumberList<UInt32> {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    return coreIndices(this, b.TRGlyphRunGetClusterMapPtr(handle), b.TRGlyphRunGetClusterMapCount(handle));
  }

  /**
   * Returns the index of the first code unit of the cluster that has a code unit.
   *
   * @returns The index, or -1 if the code unit is not in the run.
   * @throws RangeError if the index is not a whole number that is not negative.
   */
  getClusterStart(codeUnitIndex: number): number {
    checkIndex("codeUnitIndex", codeUnitIndex);
    return getNativeBindings().TRGlyphRunGetClusterStart(this.nativeHandle, codeUnitIndex);
  }

  /**
   * Returns the index after the last code unit of the cluster that has a code unit.
   *
   * @returns The index, or -1 if the code unit is not in the run.
   * @throws RangeError if the index is not a whole number that is not negative.
   */
  getClusterEnd(codeUnitIndex: number): number {
    checkIndex("codeUnitIndex", codeUnitIndex);
    return getNativeBindings().TRGlyphRunGetClusterEnd(this.nativeHandle, codeUnitIndex);
  }

  /**
   * Returns the distance from the start of the run to the boundary before a code unit, which can be
   * the end of the run too. The start of the run is its left edge.
   *
   * @throws RangeError if the code unit is not in the run.
   */
  getCodeUnitDistance(codeUnitIndex: number): number {
    checkIndex("codeUnitIndex", codeUnitIndex);
    const distance = getNativeBindings().TRGlyphRunGetCodeUnitDistance(this.nativeHandle, codeUnitIndex);
    if (distance === undefined) {
      throw new RangeError(`The code unit ${codeUnitIndex} is not in the run.`);
    }
    return distance;
  }

  /** Returns the code unit boundary that is closest to a distance from the start of the run. */
  getCodeUnitIndexAtDistance(distance: number): number {
    return getNativeBindings().TRGlyphRunGetCodeUnitIndexAtDistance(this.nativeHandle, distance);
  }

  /**
   * Computes the box that the ink of the run covers, relative to the start of the run on its
   * baseline.
   *
   * @throws TypeError if `renderer` is not a `Renderer`.
   */
  computeInkBox(renderer: Renderer): Rect {
    if (!(renderer instanceof Renderer)) {
      throw new TypeError("renderer must be a Renderer.");
    }
    return toRect(getNativeBindings().TRGlyphRunComputeInkBox(this.nativeHandle, renderer.nativeHandle));
  }

  /**
   * Draws the background, the glyphs or the replacement, and the underline and strikethrough of the
   * run into a context.
   *
   * Core sets the renderer up for each run while it draws and gives it back as it was. Its render
   * scale, draw style, stroke and shadow settings are used. This is the slow path (see
   * {@link DrawingContext}): the callbacks of the context are installed on the renderer for the
   * call and removed after it, also when an error is thrown, and the callbacks the renderer had
   * before are restored.
   *
   * @param renderer The renderer whose settings and glyph cache are used.
   * @param context The surface that receives the glyph images, rectangles and shadows.
   * @param x The x of the start of the run on its baseline, in the user space. The origin of the run
   *   in its line is not added.
   * @param y The y of the baseline, with the y axis pointing downward.
   *
   * @throws TypeError if `renderer` is not a `Renderer`, or the context lacks `drawGlyphImage` or `fillRect`.
   * @throws Error if this object, the renderer or a number is not valid (disposed, NaN), or with the
   *   first error that a member of the context (or a replacement's `draw`) throws, after Core returned.
   */
  draw(renderer: Renderer, context: DrawingContext, x: number, y: number): void {
    drawIntoContext(this.nativeHandle, renderer, context, (run, rendererHandle) =>
      getNativeBindings().TRGlyphRunDraw(run, rendererHandle, { x, y }));
  }
}
