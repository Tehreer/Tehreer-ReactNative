import type { NativeFunctions } from "./NativeFunctions.js";
import type { Handle } from "./NativeFunctions.js";

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

  // The functions below exist only in debug builds of the native module (no `NDEBUG`).

  /** A handle that owns no Core object but counts its release in {@link testGetProbeReleaseCount}. */
  testCreateProbe?(): Handle<"TRProbe">;
  /** How many probe handles have released their reference, by `disposeHandle` or by collection. */
  testGetProbeReleaseCount?(): number;
  /** Asks the engine for a full garbage collection, which runs the finalizers of dead handles. */
  testCollectGarbage?(): void;
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
