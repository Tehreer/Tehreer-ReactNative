/**
 * What `FontFile.fromAsset` accepts: the module number that `require('./font.ttf')` gives, or an
 * object with the URI of the asset, such as the result of `Image.resolveAssetSource`.
 */
export type FontAsset = number | { readonly uri: string };

/**
 * The parts of React Native that loading an asset needs. They are passed in, so that the decision
 * of which way to load can be tested without a device.
 *
 * @internal
 */
export interface AssetHost {
  /** `Image.resolveAssetSource`: the URI of a registered asset, or null if the number is not one. */
  resolveAssetSource(asset: number): { readonly uri: string } | null;
  /** Reads the body of an http(s) URL, which is how a debug build serves its assets. */
  fetchBytes(uri: string): Promise<ArrayBuffer>;
  /**
   * Turns a bare Android resource name into a file path (the native resolver), or is undefined when
   * the native module is not linked.
   */
  resolveNativeAsset: ((name: string) => Promise<string>) | undefined;
}

/**
 * Where the bytes of an asset are, as `FontFile` reads them: in memory (a debug build, which
 * serves assets over http) or in a file (a release build).
 *
 * @internal
 */
export type AssetData = ({ readonly bytes: ArrayBuffer } | { readonly path: string }) & {
  /** The URI that was resolved, for the messages of errors that happen later. */
  readonly uri: string;
};

let installedHost: AssetHost | undefined;

/**
 * Sets the host that {@link FontFile.fromAsset} uses. `initialize()` installs the React Native one;
 * it is not imported by `FontFile`, so that the font classes load without `react-native`.
 *
 * @internal
 */
export function installAssetHost(host: AssetHost): void {
  installedHost = host;
}

/** @internal */
export function getAssetHost(): AssetHost {
  if (installedHost === undefined) {
    throw new Error("Tehreer is not initialized. Call initialize() first.");
  }
  return installedHost;
}

const httpScheme = /^https?:\/\//i;
const fileScheme = /^file:\/\//i;
// Anything else that names a scheme (`content:`, `asset:`, `data:`) is not a file we can open. A
// Windows drive letter does not count: the app never runs there.
const otherScheme = /^[a-z][a-z0-9+.-]*:/i;

/** The path of a `file:` URL: the host part is empty or `localhost`, the rest is percent-encoded. */
function pathOfFileUrl(uri: string): string {
  const rest = uri.replace(fileScheme, "").replace(/^localhost(?=\/)/i, "");
  try {
    return decodeURIComponent(rest);
  } catch {
    throw new Error(`The URI is not a valid file URL: ${uri}`);
  }
}

/**
 * Finds the bytes or the file of a bundled font. The URI that React Native resolves tells the
 * build apart: http(s) is a debug build served by Metro, a `file:` URL is a release build on iOS
 * (the app bundle) or a bundle on the file system, and a bare name is the `raw` resource of a
 * release build on Android.
 *
 * @throws Error with a message that names the asset when it cannot be found or read.
 * @internal
 */
export async function loadFontAsset(host: AssetHost, asset: FontAsset): Promise<AssetData> {
  if (typeof asset !== "number" && (typeof asset !== "object" || asset === null || typeof asset.uri !== "string")) {
    throw new TypeError("A font asset is the number from require() or an object with a uri.");
  }

  let uri: string;
  if (typeof asset === "number") {
    const source = host.resolveAssetSource(asset);
    if (!source || typeof source.uri !== "string" || source.uri === "") {
      throw new Error(`Could not load the font: ${asset} is not an asset. Use the result of require('./font.ttf').`);
    }
    uri = source.uri;
  } else {
    uri = asset.uri;
  }

  try {
    if (httpScheme.test(uri)) {
      const bytes = await host.fetchBytes(uri);
      if (bytes.byteLength === 0) {
        throw new Error("The asset is empty.");
      }
      return { bytes, uri };
    }
    if (fileScheme.test(uri)) {
      return { path: pathOfFileUrl(uri), uri };
    }
    if (uri.startsWith("/")) {
      return { path: uri, uri };
    }
    if (otherScheme.test(uri)) {
      throw new Error("Only http(s), file and Android resource assets are supported.");
    }
    if (!host.resolveNativeAsset) {
      throw new Error("The native asset resolver is not linked into the app.");
    }
    return { path: await host.resolveNativeAsset(uri), uri };
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`Could not load the font asset ${uri}: ${reason}`, { cause });
  }
}
