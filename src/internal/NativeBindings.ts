import type { NativeFunctions } from "./NativeFunctions.js";
import type { Handle, PointerView, TRReplacementRoom } from "./NativeFunctions.js";
import type { SheenBidiFunctions } from "./SheenBidiFunctions.js";
import type { DrawingContext } from "../drawing/DrawingContext.js";
import type { DrawAdapter, DrawScope } from "./DrawAdapter.js";
import type { ReplacementBounds } from "../drawing/ReplacementDelegate.js";

/**
 * The JavaScript side of a replacement. Core calls `computeRoom` while it shapes text and lays out
 * a line or a frame, from inside the binding that does it (for example `TRTypesetterCreate`), with
 * the handler as `this`. A handler without it, or one that Core calls from another thread, has no
 * room. An exception that `computeRoom` throws, or a result that is not a room, is thrown by that
 * binding once Core returns; Core is never unwound through.
 */
export interface ReplacementHandler {
  computeRoom?: (layoutWidth: number) => TRReplacementRoom;
  /**
   * Draws the replacement. Core never calls it itself (a replacement has no draw callback): the
   * painter of a run that has the replacement finds the handler (`invokeReplacementDraw`).
   */
  draw?: (context: DrawingContext, bounds: ReplacementBounds) => void;
}


/**
 * A `TRAttribute` as the native side converts it, and as `readPointerStructs` reads one: the Core
 * type of the attribute and its value. The value is a number (a float, a color, a tag, a count, an
 * alignment or an application token), a boolean, or the handle of a typeface or of font features.
 * A handle that is read arrives as a reference of its own, which the reader owns.
 */
export interface NativeAttribute {
  type: number;
  value: number | boolean | Handle<string>;
}

/**
 * What the native module installs on `global`: the functions of Core, those of SheenBidi's classic
 * API (`SheenBidiFunctions.ts`) and the handle functions.
 */
export interface NativeBindings extends NativeFunctions, SheenBidiFunctions {
  /** Returns `TEHREER_VERSION_STRING` of Core. */
  getVersion(): string;
  /** Creates and releases a Core object, to prove that Core is linked and callable. */
  smokeTest(): boolean;
  /**
   * Releases the reference that the handle owns. Calling it again does nothing. The handle is
   * unusable afterwards: every binding that is given it throws "already disposed".
   */
  disposeHandle(handle: Handle<string>): void;
  /** Tells whether `disposeHandle` has been called on the handle, or its reference was released. */
  isHandleDisposed(handle: Handle<string>): boolean;
  /**
   * Tells whether Core lets the object change after it is made (a `TRMutable*` or a renderer, a
   * shaping engine, ...). Throws if the handle is disposed. What such an object owns can be freed by
   * a setter while it lives, so a pointer into it must not be kept.
   */
  isHandleMutable(handle: Handle<string>): boolean;
  /**
   * Tells if both handles hold a reference to the same object of Core. Throws if either is disposed.
   * (Two handles are never the same JavaScript object, even for one Core object.)
   */
  handleEquals(handle: Handle<string>, other: Handle<string>): boolean;
  /**
   * A new handle with a reference of its own to the same object, which the caller disposes. It does
   * not depend on `handle` afterwards. Throws if the handle is disposed.
   */
  retainHandle(handle: Handle<string>): Handle<string>;
  /**
   * `TRReplacementCreate`, bound by hand because Core keeps the callbacks and their `userData`
   * after the call. The handler is held in the native handler table until the replacement is
   * destroyed (when Core has released its last reference), and not by the handle: disposing the
   * handle while Core still holds the replacement, for example in a text attribute, keeps the
   * handler. `undefined` when Core made nothing (an invalid `kind`).
   */
  TRReplacementCreate(handler: ReplacementHandler, kind: number): Handle<"TRReplacement"> | undefined;
  /**
   * Calls the `draw` of the delegate that made the replacement, with `context` and `bounds`, as the
   * delegate. Returns false, calling nothing, when the delegate has no `draw` (or the replacement
   * is not one of this runtime's). An error that `draw` throws is thrown from here.
   */
  invokeReplacementDraw(replacement: Handle<"TRReplacement">, context: DrawingContext, bounds: ReplacementBounds): boolean;
  /**
   * Puts the draw callbacks of the JavaScript drawing surface on the renderer (`TRDrawCallbacks`
   * with `drawGlyphImage`, `fillRect` and `drawReplacement`, and the shadow pair when the adapter has
   * both functions) and returns a scope that remembers the callbacks and the user data it had.
   * Hand-written because the callbacks are C function pointers. Every call must be paired with
   * {@link restoreDrawContext}, in a `finally`.
   */
  installDrawContext(renderer: Handle<"TRRenderer">, adapter: DrawAdapter): DrawScope;
  /** Puts the callbacks back that {@link installDrawContext} replaced. Idempotent. */
  restoreDrawContext(scope: DrawScope): void;
  /**
   * Gives the native side of the views a typesetter by an id, for the `typesetterId` prop (a prop
   * cannot carry a native object). The table retains it, so the handle may be disposed. The id is
   * never 0.
   */
  registerTypesetter(typesetter: Handle<"TRTypesetter">): number;
  /** Drops the table's reference; a view keeps the one it took. Idempotent; an unknown id is ignored. */
  unregisterTypesetter(id: number): void;
  /**
   * A replacement whose room is `{ ascent, descent, extent }` and whose drawing is the flat list
   * `rects` (x, y, width, height and `0xAARRGGBB` color of each filled rectangle, relative to its
   * start on the baseline, in layout units). Both are plain data, so it can be laid out and painted
   * on any thread. The data lives exactly as long as the Core replacement.
   */
  createReplacementHolder(kind: number, ascent: number, descent: number, extent: number, rects: readonly number[]): Handle<"TRReplacement"> | undefined;
  /** Debug builds: the number of registered typesetters and of live replacement holders. */
  testGetViewCounts?(): { typesetters: number; replacements: number };
  /** Debug builds: applies the numbers of the `rendererInts` and `rendererFloats` props to a renderer. */
  testApplyRendererSettings?(renderer: Handle<"TRRenderer">, ints: readonly number[], floats: readonly number[]): void;
  /**
   * `TRTextSetAttribute`, bound by hand because its argument is a union. The text copies the
   * attribute and retains the typeface or font features that it holds, so the caller may dispose
   * them afterwards. Returns false when the range is not within the text. Throws `RangeError` for a
   * type that Core does not know or a number that does not fit its type, and a plain `Error` for a
   * value of the wrong JavaScript type and for a handle that is disposed, immutable or of the
   * wrong group.
   */
  TRTextSetAttribute(text: Handle<"TRText">, index: number, length: number, attribute: NativeAttribute): boolean;
  /**
   * `TRTypesetterCreate`, bound by hand because the default attributes are `TRAttribute` structs
   * with a union. The text is copied, and the typesetter retains the typeface, font features and
   * replacement that the attributes hold, so the caller may dispose them afterwards. `undefined`
   * when Core made nothing (some text has no typeface). The `computeRoom` handler of a replacement
   * runs during the call, and an error it throws is thrown by it once Core returns. Throws
   * `RangeError` for a type that Core does not know or a number that does not fit its type, and a
   * plain `Error` for a value of the wrong JavaScript type and for a handle that is disposed or of
   * the wrong group.
   */
  TRTypesetterCreate(text: Handle<"TRText">, defaultAttributes: readonly NativeAttribute[] | undefined): Handle<"TRTypesetter"> | undefined;

  /**
   * An `ArrayBuffer` of `count` elements of a pointer that Core gave (a `*Ptr()` getter), over the
   * memory of Core itself: nothing is copied. The buffer holds a reference of its own to the object
   * that owns the memory, so the memory stays valid for as long as the engine keeps the buffer,
   * even if the owner's wrapper is disposed meanwhile and nothing touches the buffer again; the
   * reference goes back when the engine frees it, on any thread, without running JavaScript.
   *
   * The bytes are Core's and immutable. An `ArrayBuffer` cannot say so, so never write to it and
   * never hand it to app code or to a binding that fills a buffer in.
   *
   * @param alignment The alignment, 1, 2, 4 or 8, that the typed array which will read the buffer
   *   needs (its `BYTES_PER_ELEMENT`). A typed array does not check the address, only its offset.
   * Checks run in this order, so the first failure is the one reported: the owner (disposed), then
   * the alignment, then the count and the address.
   *
   * @throws Error if the owner of the pointer is disposed ("already disposed"), or `pointer` is not
   *   one that Core gave.
   * @throws RangeError if the address is not a multiple of `alignment`, or the count is more than
   *   the pointer has (the count of Core that the getter was paired with, recorded in the view).
   */
  createPointerBuffer(pointer: PointerView<string>, count: number, alignment: number): ArrayBuffer;
  /**
   * The elements `fromIndex` up to `toIndex` of a pointer to structs, as objects made by the codec of
   * the struct (the same as the by-value structs of the bindings), so that TypeScript never knows an
   * offset. Throws if the owner is disposed (checked first, before anything else about the
   * request), if the element is not a struct that is converted, or for a range that is not within
   * `count`.
   */
  readPointerStructs(pointer: PointerView<string>, count: number, fromIndex: number, toIndex: number): unknown[];

  // The functions below exist only in debug builds of the native module (no `NDEBUG`).

  /**
   * A handle that owns no Core object but counts its release in {@link testGetProbeReleaseCount}.
   * `kind` (0 or 1) keeps the counts of two groups of probes apart.
   */
  testCreateProbe?(kind?: number): Handle<"TRProbe">;
  /** How many probe handles of the kind have released their reference, by `disposeHandle` or by collection. */
  testGetProbeReleaseCount?(kind?: number): number;
  /** Asks the engine for a full garbage collection, which runs the finalizers of dead handles. */
  testCollectGarbage?(): void;
  /**
   * Converts `value` to the C struct called `name` (`"TRRect"`, `"TRAttribute"`, ...) and the C
   * struct back to an object, which is what the bindings do with a struct argument and a struct
   * result. Throws what the bindings throw for an invalid value.
   */
  testRoundTripStruct?(name: string, value: unknown): unknown;
  /** The names that {@link testRoundTripStruct} accepts, one for each struct that is converted. */
  testGetStructNames?(): string[];
  /** How many handlers the native handler table holds, for every runtime of the process. */
  testGetHandlerCount?(): number;
  /** How many handlers were dropped on another thread and wait to be destroyed on the JS thread. */
  testGetRetiredHandlerCount?(): number;
  /** Destroys the handlers that were dropped on another thread. */
  testDrainHandlers?(): void;
  /** Gives the handle's replacement back to Core on a new thread, as a finalizer on any thread could. */
  testReleaseOnOtherThread?(handle: Handle<"TRReplacement">): void;
  /** Gives the renderer draw callbacks of a native painter (a `fillRect` and a user data of its own), or clears them. */
  testSetNativeDrawCallbacks?(renderer: Handle<"TRRenderer">, isSet: boolean): void;
  /** Which draw callbacks the renderer has, and whether they are those of {@link testSetNativeDrawCallbacks}. */
  testGetDrawCallbacks?(renderer: Handle<"TRRenderer">): {
    drawGlyphImage: boolean; drawGlyphPath: boolean; fillRect: boolean; drawReplacement: boolean;
    beginShadow: boolean; endShadow: boolean; isNativePainter: boolean; hasUserData: boolean;
  };
  /**
   * Asks Core for the room of the replacement from a new thread and returns it. The handler must
   * not run there, so the room is zero.
   */
  testComputeRoomOnOtherThread?(handle: Handle<"TRReplacement">, layoutWidth: number): TRReplacementRoom;
  /**
   * A fake enumeration with no Core behind it: a C-style loop (that cannot be unwound through)
   * calls `handler.item(index)` through the same trampoline machinery as a real callback, `count`
   * times, and stops at the first failure when `honorsStop` (default true). Returns how many times
   * the loop called its callback, also as `handler.coreCalls` since a failure throws instead of
   * returning; rethrows the first error the handler threw, as a binding does.
   */
  testEnumerate?(handler: { item(index: number): void; coreCalls?: number }, count: number, honorsStop?: boolean): number;

  /**
   * A handle for an object that owns `bytes` (at most 256) in memory of its own, and counts its
   * references like an object of Core does (it can be retained, and is freed with the last one).
   * Stands in for a getter of Core that returns a pointer, with no font. `mutable` (default false)
   * makes the handle one of an object that can change, whose memory {@link testReplaceMemoryProbe}
   * can free and replace.
   */
  testCreateMemoryProbe?(bytes: ArrayBuffer | ArrayBufferView, mutable?: boolean): Handle<"TRMemoryProbe">;
  /**
   * Frees the memory of a mutable probe and gives it `bytes` (at most 256, any length) in a new
   * block, while the probe lives, as a setter of Core does. The old block is overwritten with 0xDD
   * before it is freed, so a pointer or a buffer that was kept shows it.
   */
  testReplaceMemoryProbe?(probe: Handle<"TRMemoryProbe">, bytes: ArrayBuffer | ArrayBufferView): void;
  /**
   * The pointer that a `*Ptr()` getter would return for the probe: its memory `byteOffset` bytes in,
   * with the name and the size of its elements (`"TRPoint"`, 8). Its count is what is left of the
   * block after `byteOffset`, in whole elements.
   */
  testGetMemoryProbeView?(probe: Handle<"TRMemoryProbe">, element: string, elementSize: number, byteOffset?: number): PointerView<string>;
  /** Overwrites the memory of the probe, which a pointer into it shows at once. */
  testWriteMemoryProbe?(probe: Handle<"TRMemoryProbe">, byteOffset: number, bytes: ArrayBuffer | ArrayBufferView): void;
  /** How many references the memory of the probe has: the handle's, plus one for each buffer over it. */
  testGetMemoryProbeReferences?(probe: Handle<"TRMemoryProbe">): number;
  /** How many probe memories exist, that is, have a reference left. */
  testGetMemoryBlockCount?(): number;
  /**
   * Makes the memory that {@link createPointerBuffer} puts in a buffer and ends it on a thread of
   * its own, as the engine's collector can, so that giving the reference back is seen to work there.
   */
  testDropPointerBufferOnOtherThread?(pointer: PointerView<string>, count: number): void;

  /**
   * Stands in for a native painter: gives the image native data (a probe with a serial number) with
   * `GetOrAttachNativeData` of `cpp/runtime/GlyphImageNativeData.h`, or finds the data it already has,
   * and returns the serial number. `simulateRace` makes another attach win in between, so that the
   * probe made here loses and is destroyed at once.
   */
  testAttachNativeData?(image: Handle<"TRGlyphImage">, simulateRace?: boolean): number;
  /** The serial number of the probe the image holds, or -1 if it holds none. */
  testGetNativeDataSerial?(image: Handle<"TRGlyphImage">): number;
  /** How many probes were made and how many destroyed, in this process. */
  testGetNativeDataCounts?(): { created: number; destroyed: number };
  /**
   * Draws a composed frame with the native painter of the platform (an Android `Canvas` over a
   * `Bitmap`, a UIKit image context) onto a canvas that is cleared to `background`, at the render
   * scale of the renderer, with the frame's top left at the origin, and returns the pixels: RGBA,
   * 8 bits each, premultiplied, row by row from the top. `width` and `height` are in layout units
   * (the canvas has `round(width * renderScale)` pixels across). The callbacks the renderer had
   * are put back afterwards. `replacement(context, run, x, y)` is called for the runs that have a
   * replacement, with a drawing context whose `fillRect`, `drawGlyphImage`, `beginShadow` and
   * `endShadow` go to the same painter, and a handle of the run that it must dispose.
   */
  testPaintFrame?(
    frame: Handle<"TRComposedFrame">,
    renderer: Handle<"TRRenderer">,
    options: {
      width: number;
      height: number;
      background: number;
      replacement?: (context: Record<string, unknown>, run: Handle<"TRGlyphRun">, x: number, y: number) => void;
    },
  ): { width: number; height: number; pixels: ArrayBuffer };
  /** How many platform images (bitmaps, layers) painters made and destroyed, in this process. */
  testGetPaintCounts?(): { created: number; destroyed: number };
}

export const nativeBindingsName = "__tehreer";

export function findNativeBindings(): NativeBindings | undefined {
  const bindings = (globalThis as Record<string, unknown>)[nativeBindingsName];
  return bindings === undefined ? undefined : (bindings as NativeBindings);
}

/** @throws Error if `initialize()` was not called. */
export function getNativeBindings(): NativeBindings {
  const bindings = findNativeBindings();
  if (bindings === undefined) {
    throw new Error("Tehreer is not initialized. Call initialize() first.");
  }

  return bindings;
}
