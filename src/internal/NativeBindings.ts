import type { NativeFunctions } from "./NativeFunctions.js";
import type { Handle, PointerView, TRReplacementRoom } from "./NativeFunctions.js";

/**
 * The JavaScript side of a replacement. Core calls `computeRoom` while it shapes text and lays out
 * a line or a frame, from inside the binding that does it (for example `TRTypesetterCreate`), with
 * the handler as `this`. A handler without it, or one that Core calls from another thread, has no
 * room. An exception that `computeRoom` throws, or a result that is not a room, is thrown by that
 * binding once Core returns; Core is never unwound through.
 */
export interface ReplacementHandler {
  computeRoom?: (layoutWidth: number) => TRReplacementRoom;
}

/** What the native module installs on `global`: the functions of Core and the handle functions. */
export interface NativeBindings extends NativeFunctions {
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
   * `TRReplacementCreate`, bound by hand because Core keeps the callbacks and their `userData`
   * after the call. The handler is held in the native handler table until the replacement is
   * destroyed (when Core has released its last reference), and not by the handle: disposing the
   * handle while Core still holds the replacement, for example in a text attribute, keeps the
   * handler. `undefined` when Core made nothing (an invalid `kind`).
   */
  TRReplacementCreate(handler: ReplacementHandler, kind: number): Handle<"TRReplacement"> | undefined;

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
