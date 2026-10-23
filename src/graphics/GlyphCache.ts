import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";

// A capacity goes through `TRUInteger`, where the bindings read -1 as `TRInvalidIndex`, which would
// be a cache that never drops an image. A byte count has no such value.
function checkCapacity(capacity: number): void {
  if (!Number.isSafeInteger(capacity) || capacity < 0) {
    throw new RangeError(`capacity (${capacity}) must be a whole number of bytes that is not negative.`);
  }
}

/**
 * A cache of the images and outlines of glyphs, which renderers fill. Renderers that share a cache
 * share its images. The cache keeps the most recently used glyphs within its capacity; a glyph that
 * is dropped while someone still uses it stays alive until that user lets go. Core makes the cache
 * safe to use from several threads, but a renderer is not.
 */
export class GlyphCache extends NativeObject<"TRGlyphCache"> {
  /**
   * Makes a cache that keeps glyphs up to `capacity` bytes.
   *
   * @throws RangeError if `capacity` is not a whole number that is zero or more.
   * @throws Error if Core cannot create the cache.
   */
  constructor(capacity: number);
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRGlyphCache">);
  constructor(capacity: number | typeof adopt, handle?: Handle<"TRGlyphCache">) {
    if (capacity === adopt) {
      super(handle as Handle<"TRGlyphCache">);
      return;
    }

    checkCapacity(capacity);
    const created = getNativeBindings().TRGlyphCacheCreate(capacity);
    if (created === undefined) {
      throw new Error("Could not create a glyph cache.");
    }
    super(created);
  }

  /**
   * The cache that renderers use unless they are given another one. It is shared by the process
   * and has a capacity of 8 MB. Each read gives a wrapper with a reference of its own, which the
   * caller may dispose without affecting the cache; clearing or resizing it affects every renderer
   * that uses it.
   *
   * @throws Error if Core cannot create the default cache.
   */
  static get default(): GlyphCache {
    const handle = getNativeBindings().TRGlyphCacheGetDefault();
    if (handle === undefined) {
      throw new Error("Could not create the default glyph cache.");
    }
    return new GlyphCache(adopt, handle);
  }

  /** The number of bytes of glyphs that the cache keeps up to. */
  get capacity(): number {
    return getNativeBindings().TRGlyphCacheGetCapacity(this.nativeHandle);
  }

  /**
   * Glyphs are dropped, least recently used first, if the cache holds more than the new capacity.
   *
   * @throws RangeError if the value is not a whole number that is zero or more.
   */
  set capacity(value: number) {
    checkCapacity(value);
    getNativeBindings().TRGlyphCacheSetCapacity(this.nativeHandle, value);
  }

  /** The number of bytes of glyphs that the cache holds now. */
  get size(): number {
    return getNativeBindings().TRGlyphCacheGetSize(this.nativeHandle);
  }

  /** Drops every glyph. Images that someone still holds stay valid until they are disposed. */
  clear(): void {
    getNativeBindings().TRGlyphCacheClear(this.nativeHandle);
  }
}
