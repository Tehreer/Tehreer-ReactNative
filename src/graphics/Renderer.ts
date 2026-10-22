import type { List } from "../collections/List.js";
import type { Color } from "../Color.js";
import type { Point, Rect } from "../geometry.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import type { WritingDirection } from "../sfnt/enums.js";
import { GlyphImageKind, type DrawStyle, type StrokeCap, type StrokeJoin } from "./enums.js";
import { GlyphCache } from "./GlyphCache.js";
import { GlyphImage } from "./GlyphImage.js";
import { Path } from "./Path.js";
import { Typeface } from "./Typeface.js";

/**
 * The glyphs of a run: what a `ShapingResult` has, and a glyph run of a layout will have. The lists
 * are read when a method of the renderer is called, and not kept.
 */
export interface GlyphBuffers {
  /** The IDs of the glyphs, in the order of the writing direction. */
  readonly glyphIds: List<number> | ArrayLike<number>;
  /** The offsets of the glyphs from their pen positions, with the y axis pointing up. */
  readonly glyphOffsets: List<Point> | ArrayLike<Point>;
  /** The advances of the glyphs. */
  readonly glyphAdvances: List<number> | ArrayLike<number>;
}

/** The image of a glyph and where to draw it. */
export interface GlyphPlacement {
  /** The index of the glyph in the run. */
  readonly glyphIndex: number;
  /** The image, which the caller owns and has to dispose. */
  readonly image: GlyphImage;
  /** The position of the left edge of the image, in pixels, rounded to a whole pixel. */
  readonly x: number;
  /** The position of the top edge of the image, in pixels, rounded to a whole pixel. */
  readonly y: number;
  /** How much to scale the image horizontally to match the size that was asked for. */
  readonly scaleX: number;
  /** How much to scale the image vertically to match the size that was asked for. */
  readonly scaleY: number;
}

interface RunArguments {
  readonly glyphIds: Uint16Array;
  readonly offsets: Point[];
  readonly advances: Float32Array;
  readonly count: number;
}

// Each member is a copy made for one call, so a list over memory of Core is never read by a binding
// while JavaScript runs, and a value that does not fit is refused instead of wrapping around.
function readRun(run: GlyphBuffers): RunArguments {
  if (run === null || typeof run !== "object") {
    throw new TypeError("run must be an object with glyphIds, glyphOffsets and glyphAdvances.");
  }
  const ids = elementsOf(run.glyphIds, "glyphIds");
  const offsets = elementsOf(run.glyphOffsets, "glyphOffsets");
  const advances = elementsOf(run.glyphAdvances, "glyphAdvances");
  const count = ids.length;

  if (offsets.length < count || advances.length < count) {
    throw new RangeError(
      `The run has ${count} glyphs, but ${offsets.length} offsets and ${advances.length} advances: each glyph needs both.`);
  }

  const glyphIds = new Uint16Array(count);
  for (let index = 0; index < count; index++) {
    const id = ids[index] as number;
    if (!Number.isInteger(id) || id < 0 || id > 0xffff) {
      throw new RangeError(`glyphIds[${index}] (${id}) must be a glyph ID, a whole number from 0 to 65535.`);
    }
    glyphIds[index] = id;
  }

  const points: Point[] = [];
  for (let index = 0; index < count; index++) {
    const point = offsets[index] as Point | null | undefined;
    if (point === null || typeof point !== "object") {
      throw new TypeError(`glyphOffsets[${index}] must be an object with x and y.`);
    }
    if (typeof point.x !== "number" || !Number.isFinite(point.x) || typeof point.y !== "number" || !Number.isFinite(point.y)) {
      throw new RangeError(`glyphOffsets[${index}] (${String(point.x)}, ${String(point.y)}) must have finite numbers for x and y.`);
    }
    points.push({ x: point.x, y: point.y });
  }

  const widths = new Float32Array(count);
  for (let index = 0; index < count; index++) {
    const advance = advances[index];
    if (typeof advance !== "number" || !Number.isFinite(advance)) {
      throw new RangeError(`glyphAdvances[${index}] (${String(advance)}) must be a finite number.`);
    }
    widths[index] = advance;
  }

  return { glyphIds, offsets: points, advances: widths, count };
}

function elementsOf<T>(source: List<T> | ArrayLike<T>, name: string): ArrayLike<T> {
  if (source === null || typeof source !== "object") {
    throw new TypeError(`run.${name} must be a list or an array.`);
  }
  return typeof (source as List<T>).toArray === "function" ? (source as List<T>).toArray() : (source as ArrayLike<T>);
}

function checkKind(kind: GlyphImageKind): void {
  // Core would fill for any other value; a typo is better caught than quietly treated as a fill.
  if (kind !== GlyphImageKind.Fill && kind !== GlyphImageKind.Stroke) {
    throw new RangeError(`kind (${String(kind)}) must be GlyphImageKind.Fill or GlyphImageKind.Stroke.`);
  }
}

function checkGlyphId(glyphId: number): void {
  if (!Number.isInteger(glyphId) || glyphId < 0 || glyphId > 0xffff) {
    throw new RangeError(`glyphId (${glyphId}) must be a glyph ID, a whole number from 0 to 65535.`);
  }
}

/**
 * Prepares glyphs for drawing: it finds their images and outlines in a glyph cache for the settings
 * that were made on it, and works out where each glyph of a run goes. Drawing itself is done by the
 * platform painters.
 *
 * It is a mutable configuration object and not thread safe: do not change it while a glyph run,
 * line or frame is drawn with it. Every property is stored in Core and asked from it when it is
 * read, so nothing here goes out of date; Core keeps a value that it does not understand (an
 * unknown stroke cap or draw style) as it was given.
 *
 * It is created with these values: the default glyph cache, a type size of 16, no scaling, no
 * skew, a render scale of 1, left to right, an opaque black foreground color, a stroke of radius
 * 0.5 with butt caps, round joins and a miter limit of 1 in opaque black, no shadow (transparent
 * black), and the draw style `Fill`. The typeface has to be set before it is used.
 */
export class Renderer extends NativeObject<"TRRenderer"> {
  /** @throws Error if Core cannot create the renderer. */
  constructor();
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRRenderer">);
  constructor(token?: typeof adopt, handle?: Handle<"TRRenderer">) {
    if (token === adopt) {
      super(handle as Handle<"TRRenderer">);
      return;
    }

    const created = getNativeBindings().TRRendererCreate();
    if (created === undefined) {
      throw new Error("Could not create a renderer.");
    }
    super(created);
  }

  /**
   * The cache that glyphs are found in, which is the default cache until another is set. Each read
   * gives a wrapper with a reference of its own. It is `undefined` only if the renderer uses the
   * default cache and Core could not create that.
   */
  get glyphCache(): GlyphCache | undefined {
    const handle = getNativeBindings().TRRendererGetGlyphCache(this.nativeHandle);
    return handle === undefined ? undefined : new GlyphCache(adopt, handle);
  }

  /** The renderer retains the cache; `undefined` selects the default cache. */
  set glyphCache(value: GlyphCache | undefined) {
    if (value !== undefined && !(value instanceof GlyphCache)) {
      throw new TypeError("glyphCache must be a GlyphCache, or undefined for the default cache.");
    }
    getNativeBindings().TRRendererSetGlyphCache(this.nativeHandle, value?.nativeHandle);
  }

  /**
   * The typeface of the glyphs, or `undefined` if it is not set. Each read gives a wrapper with a
   * reference of its own, so the caller disposes it; the renderer keeps its own.
   */
  get typeface(): Typeface | undefined {
    const handle = getNativeBindings().TRRendererGetTypeface(this.nativeHandle);
    return handle === undefined ? undefined : Typeface.adopting(handle);
  }

  /** The renderer retains the typeface, so the object that was given can be disposed. */
  set typeface(value: Typeface | undefined) {
    if (value !== undefined && !(value instanceof Typeface)) {
      throw new TypeError("typeface must be a Typeface, or undefined to clear it.");
    }
    getNativeBindings().TRRendererSetTypeface(this.nativeHandle, value?.nativeHandle);
  }

  /** The size of the em square, in the unit of the user space. */
  get typeSize(): number {
    return getNativeBindings().TRRendererGetTypeSize(this.nativeHandle);
  }

  /** @throws RangeError if the value is NaN. */
  set typeSize(value: number) {
    getNativeBindings().TRRendererSetTypeSize(this.nativeHandle, value);
  }

  /** The horizontal scale of the glyphs, which is applied to the type size. */
  get scaleX(): number {
    return getNativeBindings().TRRendererGetScaleX(this.nativeHandle);
  }

  /** @throws RangeError if the value is NaN. */
  set scaleX(value: number) {
    getNativeBindings().TRRendererSetScaleX(this.nativeHandle, value);
  }

  /** The vertical scale of the glyphs, which is applied to the type size. */
  get scaleY(): number {
    return getNativeBindings().TRRendererGetScaleY(this.nativeHandle);
  }

  /** @throws RangeError if the value is NaN. */
  set scaleY(value: number) {
    getNativeBindings().TRRendererSetScaleY(this.nativeHandle, value);
  }

  /**
   * The distance that a point of a glyph moves to the right for each unit it is above the baseline;
   * slanted text has a positive skew. It does not apply to a font that has only bitmap strikes.
   */
  get skewX(): number {
    return getNativeBindings().TRRendererGetSkewX(this.nativeHandle);
  }

  /** @throws RangeError if the value is NaN. */
  set skewX(value: number) {
    getNativeBindings().TRRendererSetSkewX(this.nativeHandle, value);
  }

  /** The number of pixels in a unit of the user space, such as the pixel ratio of a screen. */
  get renderScale(): number {
    return getNativeBindings().TRRendererGetRenderScale(this.nativeHandle);
  }

  /** @throws RangeError if the value is NaN. */
  set renderScale(value: number) {
    getNativeBindings().TRRendererSetRenderScale(this.nativeHandle, value);
  }

  /**
   * The direction of the runs that are passed in. In a right-to-left run the pen moves left before a
   * glyph. A value that is not a `WritingDirection` is kept and returned as it is, and Core treats
   * the runs as left to right.
   */
  get writingDirection(): WritingDirection {
    return getNativeBindings().TRRendererGetWritingDirection(this.nativeHandle) as WritingDirection;
  }

  /** Sets `writingDirection`; see the getter. */
  set writingDirection(value: WritingDirection) {
    getNativeBindings().TRRendererSetWritingDirection(this.nativeHandle, value);
  }

  /** The color of the glyphs, or of the parts of them, that follow the foreground. */
  get foregroundColor(): Color {
    return getNativeBindings().TRRendererGetForegroundColor(this.nativeHandle) >>> 0;
  }

  /** @throws RangeError if the value is not an unsigned 32-bit number. */
  set foregroundColor(value: Color) {
    getNativeBindings().TRRendererSetForegroundColor(this.nativeHandle, value);
  }

  /**
   * How far the stroke reaches from the outline of a glyph, so a stroked line is twice as wide. It
   * is as many pixels as it is, without the render scale. Core takes a negative radius as zero
   * when it draws, but returns the value as it was set.
   */
  get strokeRadius(): number {
    return getNativeBindings().TRRendererGetStrokeRadius(this.nativeHandle);
  }

  /** @throws RangeError if the value is NaN. */
  set strokeRadius(value: number) {
    getNativeBindings().TRRendererSetStrokeRadius(this.nativeHandle, value);
  }

  /** The shape at the ends of stroked lines. */
  get strokeCap(): StrokeCap {
    return getNativeBindings().TRRendererGetStrokeCap(this.nativeHandle) as StrokeCap;
  }

  /** Sets `strokeCap`; see the getter. */
  set strokeCap(value: StrokeCap) {
    getNativeBindings().TRRendererSetStrokeCap(this.nativeHandle, value);
  }

  /** The shape at the corners of stroked lines. */
  get strokeJoin(): StrokeJoin {
    return getNativeBindings().TRRendererGetStrokeJoin(this.nativeHandle) as StrokeJoin;
  }

  /** Sets `strokeJoin`; see the getter. */
  set strokeJoin(value: StrokeJoin) {
    getNativeBindings().TRRendererSetStrokeJoin(this.nativeHandle, value);
  }

  /** The limit of the length of miters, as a ratio of the stroke width. */
  get strokeMiter(): number {
    return getNativeBindings().TRRendererGetStrokeMiter(this.nativeHandle);
  }

  /** @throws RangeError if the value is NaN. */
  set strokeMiter(value: number) {
    getNativeBindings().TRRendererSetStrokeMiter(this.nativeHandle, value);
  }

  /** The color of the outlines of the glyphs when the draw style strokes them. */
  get strokeColor(): Color {
    return getNativeBindings().TRRendererGetStrokeColor(this.nativeHandle) >>> 0;
  }

  /** @throws RangeError if the value is not an unsigned 32-bit number. */
  set strokeColor(value: Color) {
    getNativeBindings().TRRendererSetStrokeColor(this.nativeHandle, value);
  }

  /** The blur radius of the shadow in pixels. No shadow is drawn unless it is above zero. */
  get shadowRadius(): number {
    return getNativeBindings().TRRendererGetShadowRadius(this.nativeHandle);
  }

  /** @throws RangeError if the value is NaN. */
  set shadowRadius(value: number) {
    getNativeBindings().TRRendererSetShadowRadius(this.nativeHandle, value);
  }

  /** The horizontal offset of the shadow in pixels, positive towards the right. */
  get shadowDx(): number {
    return getNativeBindings().TRRendererGetShadowDx(this.nativeHandle);
  }

  /** @throws RangeError if the value is NaN. */
  set shadowDx(value: number) {
    getNativeBindings().TRRendererSetShadowDx(this.nativeHandle, value);
  }

  /** The vertical offset of the shadow in pixels, positive downward. */
  get shadowDy(): number {
    return getNativeBindings().TRRendererGetShadowDy(this.nativeHandle);
  }

  /** @throws RangeError if the value is NaN. */
  set shadowDy(value: number) {
    getNativeBindings().TRRendererSetShadowDy(this.nativeHandle, value);
  }

  /** The color of the shadow, which is transparent black by default. */
  get shadowColor(): Color {
    return getNativeBindings().TRRendererGetShadowColor(this.nativeHandle) >>> 0;
  }

  /** @throws RangeError if the value is not an unsigned 32-bit number. */
  set shadowColor(value: Color) {
    getNativeBindings().TRRendererSetShadowColor(this.nativeHandle, value);
  }

  /** Whether the draw functions of runs, lines and frames fill the glyphs, stroke their outlines, or both. */
  get drawStyle(): DrawStyle {
    return getNativeBindings().TRRendererGetDrawStyle(this.nativeHandle) as DrawStyle;
  }

  /** Sets `drawStyle`; see the getter. */
  set drawStyle(value: DrawStyle) {
    getNativeBindings().TRRendererSetDrawStyle(this.nativeHandle, value);
  }

  /**
   * Tells whether the size is at least one pixel in each direction, counting the type size, the
   * scales and the render scale. It does not depend on the typeface: a new renderer is renderable,
   * and with no typeface it still makes no images or paths. A scale of zero or a negative one makes
   * it not renderable.
   */
  get isRenderable(): boolean {
    return getNativeBindings().TRRendererIsRenderable(this.nativeHandle);
  }

  /**
   * Makes the image that fills a glyph, in the foreground color for the parts that follow it. The
   * image of a glyph of a bitmap font is the one of its nearest strike, not scaled to the type size.
   *
   * @returns The image, which the caller disposes, or `undefined` if there is no typeface or the
   *   glyph has no image, such as a space.
   * @throws RangeError if `glyphId` is not a glyph ID.
   */
  getGlyphImage(glyphId: number): GlyphImage | undefined {
    checkGlyphId(glyphId);
    const handle = getNativeBindings().TRRendererCreateGlyphImage(this.nativeHandle, glyphId);
    return handle === undefined ? undefined : GlyphImage.adopting(handle);
  }

  /**
   * Makes the image of the outline of a glyph, for the stroke settings.
   *
   * @returns The image, which the caller disposes, or `undefined` if there is none.
   * @throws RangeError if `glyphId` is not a glyph ID.
   */
  getStrokeImage(glyphId: number): GlyphImage | undefined {
    checkGlyphId(glyphId);
    const handle = getNativeBindings().TRRendererCreateStrokeImage(this.nativeHandle, glyphId);
    return handle === undefined ? undefined : GlyphImage.adopting(handle);
  }

  /**
   * Makes the outline of a glyph at the type size, scales and skew of the renderer, with the y axis
   * pointing downward.
   *
   * @returns The outline, or `undefined` if there is no typeface or the glyph has none.
   * @throws RangeError if `glyphId` is not a glyph ID.
   */
  getGlyphPath(glyphId: number): Path | undefined {
    checkGlyphId(glyphId);
    const handle = getNativeBindings().TRRendererCreateGlyphPath(this.nativeHandle, glyphId);
    return handle === undefined ? undefined : Path.takeNative(handle);
  }

  /**
   * Computes the box around the image of a glyph, relative to its pen position, with the y axis
   * pointing downward. It is empty if the glyph has no image.
   *
   * @throws RangeError if `glyphId` is not a glyph ID.
   */
  computeGlyphInkBox(glyphId: number): Rect {
    checkGlyphId(glyphId);
    const { origin, size } = getNativeBindings().TRRendererComputeGlyphInkBox(this.nativeHandle, glyphId);
    return { x: origin.x, y: origin.y, width: size.width, height: size.height };
  }

  /**
   * Computes the box around the images of a run, relative to the start of the run, so that of a
   * right-to-left run is shifted by its advance, unlike the placements. It is empty if no glyph has
   * an image.
   *
   * @throws RangeError if a glyph ID is not valid, or the run has fewer offsets or advances than glyphs.
   */
  computeRunInkBox(run: GlyphBuffers): Rect {
    const { glyphIds, offsets, advances, count } = readRun(run);
    const { origin, size } = getNativeBindings().TRRendererComputeRunInkBox(this.nativeHandle, glyphIds, offsets, advances, count);
    return { x: origin.x, y: origin.y, width: size.width, height: size.height };
  }

  /**
   * Finds the image of each glyph of a run and where to draw it, skipping the glyphs that have no
   * image. The pen starts at the origin; in a right-to-left run it moves left before each glyph. The
   * positions are in pixels, rounded to whole ones.
   *
   * The caller owns every image of the result and disposes it. An image is shared with the glyph
   * cache, so it stays valid after the renderer and the cache are disposed.
   *
   * @throws RangeError if `kind` is not a `GlyphImageKind`, a glyph ID is not valid, or the run has
   *   fewer offsets or advances than glyphs.
   */
  getGlyphPlacements(kind: GlyphImageKind, run: GlyphBuffers): GlyphPlacement[] {
    checkKind(kind);
    const { glyphIds, offsets, advances, count } = readRun(run);
    const items = getNativeBindings().TRRendererEnumerateGlyphPlacements(
      this.nativeHandle, kind, glyphIds, offsets, advances, count);

    // Every item holds a reference, so a failure halfway must give back the rest.
    const placements: GlyphPlacement[] = [];
    try {
      for (const item of items) {
        placements.push({
          glyphIndex: item.glyphIndex,
          image: GlyphImage.adopting(item.image),
          x: item.origin.x,
          y: item.origin.y,
          scaleX: item.scaleX,
          scaleY: item.scaleY,
        });
      }
    } catch (error) {
      for (const placement of placements) {
        placement.image.dispose();
      }
      for (const item of items.slice(placements.length)) {
        getNativeBindings().disposeHandle(item.image);
      }
      throw error;
    }
    return placements;
  }

  /**
   * Makes the outlines of a run of glyphs in one path, placed where the glyphs go, in the user
   * space with the y axis pointing downward. The positions are not rounded. Glyphs without an
   * outline are skipped.
   *
   * @throws RangeError if a glyph ID is not valid, or the run has fewer offsets or advances than glyphs.
   */
  generatePath(run: GlyphBuffers): Path {
    const { glyphIds, offsets, advances, count } = readRun(run);
    return Path.fromElements(
      getNativeBindings().TRRendererEnumerateGlyphPaths(this.nativeHandle, glyphIds, offsets, advances, count));
  }
}
