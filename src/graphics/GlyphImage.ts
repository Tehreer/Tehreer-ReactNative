import { coreNumbers } from "../collections/CoreList.js";
import type { MemoryState } from "../collections/CoreMemory.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import type { GlyphImageFormat } from "./enums.js";

/**
 * The image of a glyph, which a renderer made at its size, scale and skew. Images are shared with
 * the glyph cache and are immutable. An image owns a reference of its own, so it stays valid after
 * the renderer and the cache it came from are disposed.
 *
 * Native painters attach their platform bitmap to the image in Core (`TRGlyphImageSetNativeData`,
 * see `cpp/runtime/GlyphImageNativeData.h`); that data is destroyed with the image, not with this
 * wrapper, and is not visible from TypeScript.
 */
export class GlyphImage extends NativeObject<"TRGlyphImage"> {
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRGlyphImage">) {
    if (token !== adopt) {
      throw new Error("A glyph image is made by a renderer.");
    }
    super(handle);
  }

  /** How the pixels are stored. */
  get format(): GlyphImageFormat {
    return getNativeBindings().TRGlyphImageGetFormat(this.nativeHandle) as GlyphImageFormat;
  }

  /** The distance from the pen position to the left edge of the image, in pixels. */
  get left(): number {
    return getNativeBindings().TRGlyphImageGetLeft(this.nativeHandle);
  }

  /** The distance from the baseline up to the top edge of the image, in pixels. */
  get top(): number {
    return getNativeBindings().TRGlyphImageGetTop(this.nativeHandle);
  }

  /** The width in pixels. */
  get width(): number {
    return getNativeBindings().TRGlyphImageGetWidth(this.nativeHandle);
  }

  /** The height in pixels. */
  get height(): number {
    return getNativeBindings().TRGlyphImageGetHeight(this.nativeHandle);
  }

  /** The size of the pixels in bytes. */
  get byteCount(): number {
    return getNativeBindings().TRGlyphImageGetByteCount(this.nativeHandle);
  }

  /**
   * A copy of the pixels, row by row from the top. An `Alpha` image has one byte of coverage for
   * each pixel; an `ARGB` image has four, in the order alpha, red, green and blue, with the color
   * channels premultiplied by alpha. The copy is made when this is read.
   */
  get pixels(): Uint8Array {
    const b = getNativeBindings();
    const handle = this.nativeHandle;
    const byteCount = b.TRGlyphImageGetByteCount(handle);
    if (byteCount === 0) {
      return new Uint8Array(0);
    }
    // The handle is marked mutable (it is not a const ref type), so a list over its memory keeps no
    // pointer and asks Core again on each read. The pixels of an image never change.
    const source = (): MemoryState => {
      const bindings = getNativeBindings();
      const owner = this.nativeHandle;
      return { pointer: bindings.TRGlyphImageGetPixelsPtr(owner), length: bindings.TRGlyphImageGetByteCount(owner) };
    };
    return coreNumbers(this, b.TRGlyphImageGetPixelsPtr(handle), byteCount, "UInt8", source).toTypedArray();
  }
}
