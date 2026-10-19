import type { NativeFunctions } from "./NativeFunctions.js";
import type { Handle, TRReplacementRoom } from "./NativeFunctions.js";

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
