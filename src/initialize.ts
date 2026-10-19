import { findNativeBindings, getNativeBindings } from "./internal/NativeBindings.js";
import NativeTehreer from "./specs/NativeTehreer.js";

/**
 * Installs the native bindings into the JS runtime. Call it once before using anything else of the
 * library; calling it again does nothing.
 *
 * @throws Error if the native module is not linked into the app or fails to install the bindings.
 * Importing the library never throws.
 */
export function initialize(): void {
  if (findNativeBindings() !== undefined) {
    return;
  }

  if (!NativeTehreer?.install() || findNativeBindings() === undefined) {
    throw new Error("Tehreer native bindings could not be installed.");
  }
}

/**
 * Returns the version of Tehreer Core that the library is built with, in the form `"1.0.0"`.
 *
 * @throws Error if {@link initialize} was not called.
 */
export function getVersion(): string {
  return getNativeBindings().getVersion();
}
