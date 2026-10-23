import { loadFontAsset } from '../../src/internal/FontAssets';
import { reactNativeAssetHost } from '../../src/internal/ReactNativeAssetHost';

// The fonts of the tests are binary assets (example/assets/fonts), not source code. Metro treats a
// `require()` of a `.ttf` as an asset. A debug build serves it from the dev server, so it is fetched;
// a release build has it as a file, which `fetch()` reads through a `file:` URL. That is asynchronous, so App.tsx calls `loadFonts()` before it runs the suites; the
// bytes below are `let` bindings that it fills in, and the suites read them when they run.

const assets = {
  roboto: require('../assets/fonts/Roboto-Regular.abc.ttf') as number,
  variable: require('../assets/fonts/Roboto-Variable.abc.ttf') as number,
  color: require('../assets/fonts/RocherColorGX.abc.ttf') as number,
  nastaliq: require('../assets/fonts/NotoNastaliqUrdu-Regular.ttf') as number,
};

/** The bytes of a font whose glyphs `a`, `b` and `c` have outlines. */
export let fontBytes: Uint8Array = new Uint8Array(0);
/** Roboto with the `wght` and `wdth` axes and 18 named styles. */
export let variableFontBytes: Uint8Array = new Uint8Array(0);
/** A variable color font with 11 palettes. */
export let colorFontBytes: Uint8Array = new Uint8Array(0);
/** Noto Nastaliq Urdu, which shapes Urdu. */
export let nastaliqFontBytes: Uint8Array = new Uint8Array(0);

async function readFile(path: string): Promise<Uint8Array> {
  const url = `file://${path.split('/').map(encodeURIComponent).join('/')}`;
  const response = await fetch(url);
  if (!response.ok && response.status !== 0) {
    throw new Error(`Could not read the font ${path}: status ${response.status}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function fetchBytes(asset: number): Promise<Uint8Array> {
  // The library resolves the asset to bytes (debug) or to a path (release); the tests only need bytes.
  const data = await loadFontAsset(reactNativeAssetHost, asset);
  const bytes = 'bytes' in data
    ? new Uint8Array(data.bytes)
    : await readFile(data.path);
  if (bytes.length === 0) {
    throw new Error(`The font ${data.uri} is empty`);
  }
  return bytes;
}

/** Fetches every font. It must finish before the suites run. */
export async function loadFonts(): Promise<void> {
  const [roboto, variable, color, nastaliq] = await Promise.all([
    fetchBytes(assets.roboto), fetchBytes(assets.variable), fetchBytes(assets.color), fetchBytes(assets.nastaliq),
  ]);
  // Plain assignments: the transform of an export that is a `let` follows these best.
  fontBytes = roboto;
  variableFontBytes = variable;
  colorFontBytes = color;
  nastaliqFontBytes = nastaliq;
}
