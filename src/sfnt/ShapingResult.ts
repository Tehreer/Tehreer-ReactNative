import { coreIndices, coreNumbers, corePoints } from "../collections/CoreList.js";
import type { NumberList, PointList } from "../collections/List.js";
import type { Float, UInt16, UInt32 } from "../collections/NumberKind.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";

/**
 * The glyphs that a shaping engine made for a run of text. It is immutable. The lists read Core's
 * memory when an element is asked for, and fail once the result is disposed.
 */
export class ShapingResult extends NativeObject<"TRShapingResult"> {
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRShapingResult">) {
    if (token !== adopt) {
      throw new Error("A shaping result is made by a shaping engine.");
    }
    super(handle);
  }

  /** The number of code units that were shaped. */
  get codeUnitCount(): number {
    return getNativeBindings().TRShapingResultGetCodeUnitCount(this.nativeHandle);
  }

  /** Tells whether the glyphs are in the reverse order of the code units. */
  get isBackward(): boolean {
    return getNativeBindings().TRShapingResultIsBackward(this.nativeHandle);
  }

  /** Tells whether the text was shaped right to left. */
  get isRTL(): boolean {
    return getNativeBindings().TRShapingResultIsRTL(this.nativeHandle);
  }

  /** The number of glyphs. */
  get glyphCount(): number {
    return getNativeBindings().TRShapingResultGetGlyphCount(this.nativeHandle);
  }

  /** The ID of each glyph, in the order of the writing direction. */
  get glyphIds(): NumberList<UInt16> {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    return coreNumbers(this, b.TRShapingResultGetGlyphIDsPtr(handle), b.TRShapingResultGetGlyphCount(handle), "UInt16");
  }

  /** The offset of each glyph from its pen position. */
  get glyphOffsets(): PointList {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    return corePoints(this, b.TRShapingResultGetGlyphOffsetsPtr(handle), b.TRShapingResultGetGlyphCount(handle));
  }

  /** The advance of each glyph. */
  get glyphAdvances(): NumberList<Float> {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    return coreNumbers(this, b.TRShapingResultGetGlyphAdvancesPtr(handle), b.TRShapingResultGetGlyphCount(handle), "Float");
  }

  /** The index of the glyph of each code unit, which is the first glyph of its cluster. */
  get clusterMap(): NumberList<UInt32> {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    return coreIndices(this, b.TRShapingResultGetClusterMapPtr(handle), b.TRShapingResultGetCodeUnitCount(handle));
  }

  /**
   * Computes the distance from the start of the run to each code unit boundary, measured along the
   * writing direction. The advance of a cluster is divided evenly between the caret stops inside it.
   *
   * @param caretStops Tells for each code unit whether the caret can stop before it. It needs a
   *   flag for each code unit; a stop is allowed at every code unit by default.
   * @returns The edges, one more than the code units.
   * @throws RangeError if there are fewer flags than code units.
   */
  getCaretEdges(caretStops?: ArrayLike<boolean | number>): Float32Array {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    const count = b.TRShapingResultGetCodeUnitCount(handle);

    let stops: Uint8Array | undefined;
    if (caretStops !== undefined) {
      if (caretStops.length < count) {
        throw new RangeError("There must be a caret stop flag for each code unit.");
      }

      stops = new Uint8Array(count);
      for (let index = 0; index < count; index++) {
        stops[index] = caretStops[index] ? 1 : 0;
      }
    }

    const edges = new Float32Array(count + 1);
    b.TRShapingResultGetCaretEdges(handle, stops, edges);
    return edges;
  }
}
