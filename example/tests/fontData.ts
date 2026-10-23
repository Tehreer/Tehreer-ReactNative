import { Image } from 'react-native';

// The fonts of the tests are binary assets (example/assets/fonts), not source code. Metro treats a
// `require()` of a `.ttf` as an asset, and a debug build serves it from the dev server, so it is
// fetched. That is asynchronous, so App.tsx calls `loadFonts()` before it runs the suites; the
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

async function fetchBytes(asset: number): Promise<Uint8Array> {
  const { uri } = Image.resolveAssetSource(asset);
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`Could not fetch the font ${uri}: status ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error(`The font ${uri} is empty`);
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
