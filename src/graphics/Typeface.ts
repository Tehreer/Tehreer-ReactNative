import { ArrayNumberList } from "../collections/ArrayNumberList.js";
import { coreNumbers, coreStructs } from "../collections/CoreList.js";
import { IndexedList } from "../collections/IndexedList.js";
import type { List, NumberList } from "../collections/List.js";
import type { Float, UInt32 } from "../collections/NumberKind.js";
import type { Color } from "../Color.js";
import type { AffineTransform, Rect } from "../geometry.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import type { BitmapStrike } from "./BitmapStrike.js";
import type { ColorPalette } from "./ColorPalette.js";
import type { TypeSlope, TypeWidth } from "./enums.js";
import type { NamedStyle } from "./NamedStyle.js";
import { Path } from "./Path.js";
import type { VariationAxis } from "./VariationAxis.js";

/** Flag of a variation axis that asks to hide it from user interfaces (`TRVariationAxisFlagHidden`). */
const AXIS_FLAG_HIDDEN = 0x0001;

// Room for the longest glyph name Core gives (the names of the post table are at most 255 bytes).
const GLYPH_NAME_CAPACITY = 256;

// The structs as the native side converts them: it copies the members, including the strings and
// the arrays they point to, so nothing here points into Core memory.
interface RawVariationAxis {
  name: string | undefined;
  tag: number;
  flags: number;
  minValue: number;
  maxValue: number;
  defaultValue: number;
}

interface RawNamedStyle {
  subfamilyName: string | undefined;
  coordinates: number[];
  postScriptName: string | undefined;
}

interface RawPaletteEntry {
  name: string | undefined;
}

interface RawPredefinedPalette {
  name: string | undefined;
  colors: number[];
  flags: number;
}

function checkWholeNumber(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} (${value}) must be a whole number that is not negative.`);
  }
}

/**
 * A face of a font, at a size that is chosen when it is used. Typefaces come from a `FontFile`, or
 * are made from another one by `getVariationInstance()` and `getColorInstance()`.
 *
 * A typeface is immutable and can be shared freely. It owns a reference of its own, so it stays
 * valid after the `FontFile` it came from, or any other typeface it was derived from, is disposed.
 * Core keeps the font data alive for as long as a typeface needs it. The metrics are in font units
 * unless the member says otherwise.
 *
 * Nothing about the font is cached here: every property is asked from Core when it is read, and
 * the lists read their elements when they are asked for. The elements of a list (axes, styles,
 * palettes, strikes) are copies made at that moment.
 */
export class Typeface extends NativeObject<"TRTypeface"> {
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRTypeface">) {
    if (token !== adopt) {
      throw new Error("A Typeface comes from a FontFile or from another Typeface.");
    }
    super(handle);
  }

  /** The thickness on the scale of the CSS weight classes, such as 400 for regular. */
  get weight(): number {
    return getNativeBindings().TRTypefaceGetWeight(this.nativeHandle);
  }

  /** How condensed or expanded the typeface is. */
  get width(): TypeWidth {
    return getNativeBindings().TRTypefaceGetWidth(this.nativeHandle) as TypeWidth;
  }

  /** Whether the typeface is upright, italic or oblique. */
  get slope(): TypeSlope {
    return getNativeBindings().TRTypefaceGetSlope(this.nativeHandle) as TypeSlope;
  }

  /** The number of font units in the em square. */
  get unitsPerEm(): number {
    return getNativeBindings().TRTypefaceGetUnitsPerEM(this.nativeHandle);
  }

  /** The distance from the baseline to the top of the line. */
  get ascent(): number {
    return getNativeBindings().TRTypefaceGetAscent(this.nativeHandle);
  }

  /** The distance from the baseline to the bottom of the line, positive for a descender. */
  get descent(): number {
    return getNativeBindings().TRTypefaceGetDescent(this.nativeHandle);
  }

  /** The extra space between two lines. */
  get leading(): number {
    return getNativeBindings().TRTypefaceGetLeading(this.nativeHandle);
  }

  /** The number of glyphs in the typeface. */
  get glyphCount(): number {
    return getNativeBindings().TRTypefaceGetGlyphCount(this.nativeHandle);
  }

  /** The box that contains all glyphs, in font units with the y axis pointing up. */
  get boundingBox(): Rect {
    const { origin, size } = getNativeBindings().TRTypefaceGetBoundingBox(this.nativeHandle);
    return { x: origin.x, y: origin.y, width: size.width, height: size.height };
  }

  /** The position of the underline relative to the baseline, in font units. */
  get underlinePosition(): number {
    return getNativeBindings().TRTypefaceGetUnderlinePosition(this.nativeHandle);
  }

  /** The thickness of the underline, in font units. */
  get underlineThickness(): number {
    return getNativeBindings().TRTypefaceGetUnderlineThickness(this.nativeHandle);
  }

  /** The position of the strikeout, which is zero if the font has no `OS/2` table. */
  get strikeoutPosition(): number {
    return getNativeBindings().TRTypefaceGetStrikeoutPosition(this.nativeHandle);
  }

  /** The thickness of the strikeout, in font units. */
  get strikeoutThickness(): number {
    return getNativeBindings().TRTypefaceGetStrikeoutThickness(this.nativeHandle);
  }

  /** The family name, or `undefined` if the font has none in a supported encoding. */
  get familyName(): string | undefined {
    return getNativeBindings().TRTypefaceGetFamilyName(this.nativeHandle);
  }

  /** The style name, such as "Bold Italic", which the font calls the subfamily name. */
  get styleName(): string | undefined {
    return getNativeBindings().TRTypefaceGetStyleName(this.nativeHandle);
  }

  /** The full name, or `undefined` if there is none (see `TRTypefaceGetFullName`). */
  get fullName(): string | undefined {
    return getNativeBindings().TRTypefaceGetFullName(this.nativeHandle);
  }

  /** Tells whether the glyphs have outlines, or only images at the sizes of the bitmap strikes. */
  get isScalable(): boolean {
    return getNativeBindings().TRTypefaceIsScalable(this.nativeHandle);
  }

  /** Tells whether the typeface has variation axes. */
  get isVariable(): boolean {
    return getNativeBindings().TRTypefaceIsVariable(this.nativeHandle);
  }

  /** The axes of a variable font, which is empty for any other font. */
  get variationAxes(): List<VariationAxis> {
    const bindings = getNativeBindings();
    const handle = this.nativeHandle;
    const count = bindings.TRTypefaceGetVariationAxisCount(handle);
    const raw = coreStructs<RawVariationAxis>(this, bindings.TRTypefaceGetVariationAxesPtr(handle), count);

    return new IndexedList(this, count, (index): VariationAxis => {
      const axis = raw.get(index);
      return {
        tag: axis.tag,
        name: axis.name,
        isHidden: (axis.flags & AXIS_FLAG_HIDDEN) !== 0,
        minValue: axis.minValue,
        maxValue: axis.maxValue,
        defaultValue: axis.defaultValue,
      };
    });
  }

  /** The coordinates that the typeface uses, in the order of its axes. Empty if it has no axes. */
  get variationCoordinates(): NumberList<Float> {
    const bindings = getNativeBindings();
    const handle = this.nativeHandle;
    return coreNumbers(this, bindings.TRTypefaceGetVariationCoordinatesPtr(handle), bindings.TRTypefaceGetVariationAxisCount(handle), "Float");
  }

  /** The named instances of a variable font, which is empty for any other font. */
  get namedStyles(): List<NamedStyle> {
    const bindings = getNativeBindings();
    const handle = this.nativeHandle;
    const count = bindings.TRTypefaceGetNamedStyleCount(handle);
    const raw = coreStructs<RawNamedStyle>(this, bindings.TRTypefaceGetNamedStylesPtr(handle), count);

    return new IndexedList(this, count, (index): NamedStyle => {
      const style = raw.get(index);
      return {
        styleName: style.subfamilyName,
        coordinates: new ArrayNumberList("Float", style.coordinates),
        postScriptName: style.postScriptName,
      };
    });
  }

  /** The English names of the palette entries of a color font, which is empty for any other font. */
  get paletteEntryNames(): List<string | undefined> {
    const bindings = getNativeBindings();
    const handle = this.nativeHandle;
    const count = bindings.TRTypefaceGetPaletteEntryCount(handle);
    const raw = coreStructs<RawPaletteEntry>(this, bindings.TRTypefaceGetPaletteEntriesPtr(handle), count);

    return new IndexedList(this, count, (index) => raw.get(index).name);
  }

  /** The palettes that a color font defines, which is empty for any other font. */
  get predefinedPalettes(): List<ColorPalette> {
    const bindings = getNativeBindings();
    const handle = this.nativeHandle;
    const count = bindings.TRTypefaceGetPredefinedPaletteCount(handle);
    const raw = coreStructs<RawPredefinedPalette>(this, bindings.TRTypefaceGetPredefinedPalettesPtr(handle), count);

    return new IndexedList(this, count, (index): ColorPalette => {
      const palette = raw.get(index);
      return { name: palette.name, flags: palette.flags, colors: new ArrayNumberList("UInt32", palette.colors) };
    });
  }

  /** The colors that the typeface uses for its palette entries, in order, as `0xAARRGGBB`. */
  get associatedColors(): NumberList<UInt32> {
    const bindings = getNativeBindings();
    const handle = this.nativeHandle;
    return coreNumbers(this, bindings.TRTypefaceGetAssociatedColorsPtr(handle), bindings.TRTypefaceGetPaletteEntryCount(handle), "UInt32");
  }

  /** The sizes at which the typeface has images of its glyphs, which is empty if it has none. */
  get bitmapStrikes(): List<BitmapStrike> {
    const bindings = getNativeBindings();
    const handle = this.nativeHandle;
    const count = bindings.TRTypefaceGetBitmapStrikeCount(handle);
    const raw = coreStructs<BitmapStrike>(this, bindings.TRTypefaceGetBitmapStrikesPtr(handle), count);

    return new IndexedList(this, count, (index) => raw.get(index));
  }

  /**
   * Makes the typeface at the given coordinates of a variable font. Each one is clamped to the
   * range of its axis, and coordinates that are missing take the default values of their axes.
   * The new typeface keeps the colors of this one.
   *
   * @param coordinates The coordinates in the order of the variation axes.
   * @returns The new typeface, or `undefined` if the typeface has no variation axes.
   * @throws RangeError if a coordinate is not a finite number.
   */
  getVariationInstance(coordinates: ArrayLike<number>): Typeface | undefined {
    const values = Float32Array.from(coordinates);
    for (let index = 0; index < values.length; index++) {
      // After the conversion, because a finite double such as 1e300 becomes Infinity as a float.
      if (typeof coordinates[index] !== "number" || !Number.isFinite(values[index])) {
        throw new RangeError(`coordinates[${index}] must be a finite number.`);
      }
    }

    const created = getNativeBindings().TRTypefaceCreateWithVariation(this.nativeHandle, values, values.length);
    return created === undefined ? undefined : Typeface.adopting(created);
  }

  /**
   * Makes the typeface with other colors for its palette entries. Colors that are missing are
   * opaque black. The new typeface keeps the variation coordinates of this one.
   *
   * @param colors The colors as `0xAARRGGBB`, in the order of the palette entries.
   * @returns The new typeface, or `undefined` if the typeface has no palette entries.
   * @throws RangeError if a color is not an unsigned 32-bit integer.
   */
  getColorInstance(colors: ArrayLike<Color>): Typeface | undefined {
    const values = new Uint32Array(colors.length);
    for (let index = 0; index < values.length; index++) {
      const color = colors[index] as number;
      if (!Number.isInteger(color) || color < 0 || color > 0xffffffff) {
        throw new RangeError(`colors[${index}] must be an unsigned 32-bit integer.`);
      }
      values[index] = color;
    }

    const created = getNativeBindings().TRTypefaceCreateWithColors(this.nativeHandle, values, values.length);
    return created === undefined ? undefined : Typeface.adopting(created);
  }

  /** Returns the glyph that represents a code point, or 0 (the missing glyph) if there is none. */
  getGlyphId(codePoint: number): number {
    return getNativeBindings().TRTypefaceGetGlyphID(this.nativeHandle, codePoint);
  }

  /** Returns the glyph of a code point followed by a variation selector, or 0 if there is none. */
  getVariantGlyphId(codePoint: number, variantSelector: number): number {
    return getNativeBindings().TRTypefaceGetVariantGlyphID(this.nativeHandle, codePoint, variantSelector);
  }

  /**
   * Returns the unhinted advance of a glyph, in the unit of the type size.
   *
   * @param typeSize The size of the em square.
   * @param isVertical Asks for the vertical advance.
   */
  getGlyphAdvance(glyphId: number, typeSize: number, isVertical = false): number {
    return getNativeBindings().TRTypefaceGetGlyphAdvance(this.nativeHandle, glyphId, typeSize, isVertical);
  }

  /**
   * Makes the outline of a glyph. Its origin is the pen position on the baseline, and the y axis
   * points downward. Core makes the outline and applies the transform; the native outline is
   * released once it is copied.
   *
   * @param typeSize The size of the em square, which must be positive.
   * @param transform An optional transform that Core applies to every point.
   * @returns The outline, or `undefined` if the type size is not positive or the glyph has none.
   * @throws RangeError if `glyphId` is not a glyph ID, `typeSize` is NaN, or the transform has a
   *   member that is not a finite number.
   */
  getGlyphPath(glyphId: number, typeSize: number, transform?: AffineTransform): Path | undefined {
    const created = getNativeBindings().TRTypefaceCreateGlyphPath(this.nativeHandle, glyphId, typeSize);
    return created === undefined ? undefined : Path.takeNative(created, transform);
  }

  /**
   * Returns the size of a table of the font in bytes, which is zero if the font has no such table.
   *
   * @param tag The tag of the table as a number, such as `head`. Core treats tag 0 as the whole font
   *   file, so its size is the size of the file.
   */
  getTableSize(tag: number): number {
    return getNativeBindings().TRTypefaceGetTableSize(this.nativeHandle, tag);
  }

  /**
   * Copies a part of a table of the font. Only the part that is asked for is read from the font.
   *
   * @param tag The tag of the table as a number, such as `head`. Core treats tag 0 as the whole font
   *   file, so its data is the bytes of the file.
   * @param offset The offset in the table from where to copy, in bytes.
   * @param length The number of bytes to copy, which is the rest of the table by default. A part
   *   that goes beyond the end of the table is cut short.
   * @returns The bytes, which are empty if `offset` is not within the table, or `undefined` if the
   *   font has no such table.
   * @throws RangeError if `offset` or `length` is not a whole number that is not negative.
   */
  getTableData(tag: number, offset = 0, length?: number): Uint8Array | undefined {
    checkWholeNumber("offset", offset);
    if (length !== undefined) {
      checkWholeNumber("length", length);
    }

    const bindings = getNativeBindings();
    const handle = this.nativeHandle;
    const size = bindings.TRTypefaceGetTableSize(handle, tag);
    if (size === 0) {
      return undefined;
    }

    const capacity = Math.max(0, Math.min(length ?? size, size - offset));
    if (capacity === 0) {
      return new Uint8Array(0);
    }

    const bytes = new Uint8Array(capacity);
    const copied = bindings.TRTypefaceGetTableData(handle, tag, offset, bytes, capacity);
    return copied === capacity ? bytes : bytes.slice(0, copied);
  }

  /** Returns the name that the font gives to a glyph, or `undefined` if it gives none. */
  getGlyphName(glyphId: number): string | undefined {
    const bindings = getNativeBindings();
    const handle = this.nativeHandle;
    const buffer = new Uint8Array(GLYPH_NAME_CAPACITY);
    const length = bindings.TRTypefaceGetGlyphName(handle, glyphId, buffer, GLYPH_NAME_CAPACITY);
    if (length === 0) {
      return undefined;
    }

    // Core gives ASCII, and Hermes has no TextDecoder.
    let name = "";
    for (let index = 0; index < length; index++) {
      name += String.fromCharCode(buffer[index] as number);
    }
    return name;
  }
}
