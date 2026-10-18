import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

/**
 * The codegen spec of the C++ TurboModule. It has one job: hand the JS runtime to C++ once, so that
 * the host object with all bindings can be installed on `global`. Everything else is called through
 * that host object, never through this module.
 *
 * @internal
 */
export interface Spec extends TurboModule {
  /** Installs the host object on `global`. Safe to call again. Returns true when it is installed. */
  install(): boolean;
}

// Codegen only accepts a default export in a spec file. `get` (not `getEnforcing`) so that importing
// the library never throws when the native module is missing; initialize() reports that instead.
// eslint-disable-next-line no-restricted-exports
export default TurboModuleRegistry.get<Spec>("NativeTehreer");
