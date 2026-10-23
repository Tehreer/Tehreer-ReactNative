import type { TurboModule } from "react-native";
import { TurboModuleRegistry } from "react-native";

/**
 * The codegen spec of the asset resolver. It exists for the one case where a bundled asset has no
 * path that JavaScript can compute: a release build on Android, where Metro puts a font into
 * `res/raw` and `Image.resolveAssetSource` gives only the resource name. iOS needs no resolver
 * because the URI of a bundled asset there is already a file URL.
 *
 * @internal
 */
export interface Spec extends TurboModule {
  /**
   * Copies the `raw` resource of that name into the cache directory of the app, once, and returns
   * the path of the copy. Rejects if there is no such resource or it cannot be copied.
   */
  resolveAsset(name: string): Promise<string>;
}

// Codegen only accepts a default export in a spec file. `get` (not `getEnforcing`) so that importing
// the library never throws when the module is missing; the caller reports that instead.
// eslint-disable-next-line no-restricted-exports
export default TurboModuleRegistry.get<Spec>("NativeTehreerAssets");
