import type { Size } from "../geometry.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import { NativeObject } from "../internal/NativeObject.js";
import { checkConstant, checkIndex, checkOrderedRange } from "./Checks.js";
import { ComposedFrame } from "./ComposedFrame.js";
import { BreakMode, TextAlignment, TruncationPlace, VerticalAlignment } from "./enums.js";
import { Typesetter } from "./Typesetter.js";

/**
 * Lays the lines of a typesetter out in frames. It is a configuration object, so it is not thread
 * safe: do not change it while another thread makes a frame with it. The frames it makes do not
 * depend on it.
 *
 * It starts with no typesetter, an unbounded frame that does not fit its lines, leading text
 * alignment, top vertical alignment, no truncation (with the line break mode and the end as its
 * defaults), no justification (with the level 1), no limit of lines, no extra line spacing, and a
 * line height multiplier of 1. The paragraphs take their alignment, indents, spacing and line
 * heights from the attributes of the text; the alignment here is for those that have none.
 *
 * The numbers that it takes are not NaN (a NaN is a `RangeError`); an infinite one is valid.
 */
export class FrameResolver extends NativeObject<"TRFrameResolver"> {
  /** @throws Error if Core cannot create the resolver. */
  constructor() {
    const created = getNativeBindings().TRFrameResolverCreate();
    if (created === undefined) {
      throw new Error("Could not create a frame resolver.");
    }
    super(created);
  }

  /**
   * The typesetter to make frames with, or `undefined` if there is none. The resolver retains the
   * one that is set, so the object that was given can be disposed. Each read gives a wrapper with a
   * reference of its own, which the caller disposes.
   */
  get typesetter(): Typesetter | undefined {
    const handle = getNativeBindings().TRFrameResolverGetTypesetter(this.nativeHandle);
    return handle === undefined ? undefined : Typesetter.adopting(handle);
  }

  set typesetter(value: Typesetter | undefined) {
    if (value !== undefined && !(value instanceof Typesetter)) {
      throw new TypeError("typesetter must be a Typesetter, or undefined to clear it.");
    }
    getNativeBindings().TRFrameResolverSetTypesetter(this.nativeHandle, value?.nativeHandle);
  }

  /** The width of the frame, as it was set. Unbounded (infinite) by default; a negative one counts as zero. */
  get frameWidth(): number {
    return this.#getFrameSize().width;
  }

  set frameWidth(width: number) {
    this.#setFrameSize(width, this.#getFrameSize().height);
  }

  /** The height of the frame, as it was set. Unbounded (infinite) by default; a negative one counts as zero. */
  get frameHeight(): number {
    return this.#getFrameSize().height;
  }

  set frameHeight(height: number) {
    this.#setFrameSize(this.#getFrameSize().width, height);
  }

  /** Tells whether the frame is as wide as its widest line, instead of the width that is set. */
  get fitsHorizontally(): boolean {
    return getNativeBindings().TRFrameResolverGetFitsHorizontally(this.nativeHandle);
  }

  set fitsHorizontally(value: boolean) {
    getNativeBindings().TRFrameResolverSetFitsHorizontally(this.nativeHandle, checkBoolean("fitsHorizontally", value));
  }

  /** Tells whether the frame is as tall as its lines, instead of the height that is set. */
  get fitsVertically(): boolean {
    return getNativeBindings().TRFrameResolverGetFitsVertically(this.nativeHandle);
  }

  set fitsVertically(value: boolean) {
    getNativeBindings().TRFrameResolverSetFitsVertically(this.nativeHandle, checkBoolean("fitsVertically", value));
  }

  /** The alignment of the lines of the paragraphs that do not have their own. */
  get textAlignment(): TextAlignment {
    return getNativeBindings().TRFrameResolverGetTextAlignment(this.nativeHandle) as TextAlignment;
  }

  set textAlignment(value: TextAlignment) {
    checkConstant("textAlignment", value, TextAlignment);
    getNativeBindings().TRFrameResolverSetTextAlignment(this.nativeHandle, value);
  }

  /** Where the lines are placed if the frame is taller than they are. */
  get verticalAlignment(): VerticalAlignment {
    return getNativeBindings().TRFrameResolverGetVerticalAlignment(this.nativeHandle) as VerticalAlignment;
  }

  set verticalAlignment(value: VerticalAlignment) {
    checkConstant("verticalAlignment", value, VerticalAlignment);
    getNativeBindings().TRFrameResolverSetVerticalAlignment(this.nativeHandle, value);
  }

  /** How the last line is cut if there is more text than the frame can show. It does not enable the truncation. */
  get truncationMode(): BreakMode {
    return getNativeBindings().TRFrameResolverGetTruncationMode(this.nativeHandle) as BreakMode;
  }

  set truncationMode(value: BreakMode) {
    checkConstant("truncationMode", value, BreakMode);
    getNativeBindings().TRFrameResolverSetTruncationMode(this.nativeHandle, value);
  }

  /** Where the last line is cut. It does not enable the truncation. */
  get truncationPlace(): TruncationPlace {
    return getNativeBindings().TRFrameResolverGetTruncationPlace(this.nativeHandle) as TruncationPlace;
  }

  set truncationPlace(value: TruncationPlace) {
    checkConstant("truncationPlace", value, TruncationPlace);
    getNativeBindings().TRFrameResolverSetTruncationPlace(this.nativeHandle, value);
  }

  /** Tells whether the last line is cut when there is more text than the frame can show. */
  get isTruncationEnabled(): boolean {
    return getNativeBindings().TRFrameResolverIsTruncationEnabled(this.nativeHandle);
  }

  set isTruncationEnabled(value: boolean) {
    getNativeBindings().TRFrameResolverSetTruncationEnabled(this.nativeHandle, checkBoolean("isTruncationEnabled", value));
  }

  /** Tells whether the lines that end before the end of their paragraph are justified. */
  get isJustificationEnabled(): boolean {
    return getNativeBindings().TRFrameResolverIsJustificationEnabled(this.nativeHandle);
  }

  set isJustificationEnabled(value: boolean) {
    getNativeBindings().TRFrameResolverSetJustificationEnabled(this.nativeHandle, checkBoolean("isJustificationEnabled", value));
  }

  /** How far the words are spread to justify a line, from 0 to 1. A higher level spreads them further. */
  get justificationLevel(): number {
    return getNativeBindings().TRFrameResolverGetJustificationLevel(this.nativeHandle);
  }

  set justificationLevel(value: number) {
    getNativeBindings().TRFrameResolverSetJustificationLevel(this.nativeHandle, value);
  }

  /** The greatest number of lines of a frame, or `undefined` for no limit. */
  get maxLines(): number | undefined {
    const count = getNativeBindings().TRFrameResolverGetMaxLines(this.nativeHandle);
    return count === 0 ? undefined : count;
  }

  /**
   * @throws RangeError if the value is not `undefined` or a whole number that is not negative. 0
   *   means no limit, as `undefined` does.
   */
  set maxLines(value: number | undefined) {
    if (value !== undefined) {
      // Not -1: the binding would read it as Core's invalid index, which is a huge count.
      checkIndex("maxLines", value);
    }
    getNativeBindings().TRFrameResolverSetMaxLines(this.nativeHandle, value ?? 0);
  }

  /** The space that is added below each line. It is ignored if it is not positive. */
  get extraLineSpacing(): number {
    return getNativeBindings().TRFrameResolverGetExtraLineSpacing(this.nativeHandle);
  }

  set extraLineSpacing(value: number) {
    getNativeBindings().TRFrameResolverSetExtraLineSpacing(this.nativeHandle, value);
  }

  /** The factor that the height of each line is multiplied with. It is ignored if it is not positive. */
  get lineHeightMultiplier(): number {
    return getNativeBindings().TRFrameResolverGetLineHeightMultiplier(this.nativeHandle);
  }

  set lineHeightMultiplier(value: number) {
    getNativeBindings().TRFrameResolverSetLineHeightMultiplier(this.nativeHandle, value);
  }

  /**
   * Makes a frame of the code units from `fromIndex` up to `toIndex`. It is filled until the text
   * ends or what is left does not fit; it has at least one line. The `computeRoom` of a replacement
   * runs during the call, and an error it throws is thrown from here.
   *
   * @throws Error if there is no typesetter.
   * @throws RangeError if the range is empty or is not within the text.
   */
  createFrame(fromIndex: number, toIndex: number): ComposedFrame {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    checkOrderedRange(fromIndex, toIndex);
    if (fromIndex === toIndex) {
      throw new RangeError("The range must not be empty.");
    }
    // The binding retains what it returns, so the reference is given back at once.
    const typesetter = b.TRFrameResolverGetTypesetter(handle);
    if (typesetter === undefined) {
      throw new Error("The typesetter is not set.");
    }
    b.disposeHandle(typesetter);

    const frame = b.TRFrameResolverCreateFrame(handle, fromIndex, toIndex - fromIndex);
    if (frame === undefined) {
      throw new RangeError(`The range ${fromIndex}..${toIndex} is not within the text.`);
    }
    return ComposedFrame.adopting(frame);
  }

  #getFrameSize(): Size {
    return getNativeBindings().TRFrameResolverGetFrameSize(this.nativeHandle);
  }

  #setFrameSize(width: number, height: number): void {
    getNativeBindings().TRFrameResolverSetFrameSize(this.nativeHandle, { width, height });
  }
}

function checkBoolean(name: string, value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new TypeError(`${name} must be a boolean.`);
  }
  return value;
}
