/**
 * The host object that the C++ runtime installs on `global`.
 *
 * @internal
 */
export interface NativeBindings {
  /** Returns `TEHREER_VERSION_STRING` of Core. */
  getVersion(): string;
  /** Creates and releases a Core object, to prove that Core is linked and callable. */
  smokeTest(): boolean;
}

/** The name of the property of `global` that holds the host object. Must match `cpp/runtime`. */
export const nativeBindingsName = "__tehreer";

/** @internal */
export function findNativeBindings(): NativeBindings | undefined {
  const bindings = (globalThis as Record<string, unknown>)[nativeBindingsName];
  return bindings === undefined ? undefined : (bindings as NativeBindings);
}
