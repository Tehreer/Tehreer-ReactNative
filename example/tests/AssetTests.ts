import { initialize } from 'tehreer-react-native';
import type { NativeBindings } from '../../src/internal/NativeBindings';
import { FontFile } from '../../src/graphics/FontFile';
import { colorFontBytes, fontBytes, nastaliqFontBytes, variableFontBytes } from './fontData';

// The suite of FontFile.fromAsset (issue #53). The fonts are the real files in example/assets/fonts.
// fromAsset is asynchronous (a debug build fetches the bytes from Metro, a release build reads a
// file), and the suites are synchronous, so App.tsx calls prepareAssetTests() first; it loads every
// font and records what it saw, and the tests below only look at those records. In a release build
// the asset resolves to a file on the device (iOS) or to a copy of the res/raw resource in the
// cache directory (Android), in a debug build to an http URL, so one suite covers both.

export interface TestResult {
  passed: number;
  failures: string[];
}

/** What is read from a loaded font, to compare it with the font that fromBytes made. */
interface Summary {
  typefaceCount: number;
  faces: { family: string | undefined; full: string | undefined; glyphCount: number; glyphA: number }[];
}

type Outcome = { summary: Summary } | { error: unknown };

const sources = [
  { name: 'roboto', asset: require('../assets/fonts/Roboto-Regular.abc.ttf') as number, bytes: () => fontBytes },
  { name: 'variable', asset: require('../assets/fonts/Roboto-Variable.abc.ttf') as number, bytes: () => variableFontBytes },
  { name: 'color', asset: require('../assets/fonts/RocherColorGX.abc.ttf') as number, bytes: () => colorFontBytes },
  { name: 'nastaliq', asset: require('../assets/fonts/NotoNastaliqUrdu-Regular.ttf') as number, bytes: () => nastaliqFontBytes },
];

const loaded = new Map<string, Outcome>();
// A typeface that outlives the file it came from, and the file's state after dispose().
let ownership: Outcome | { disposed: boolean; family: string | undefined; glyphA: number } | undefined;
const failed = new Map<string, unknown>();

function summarize(file: FontFile): Summary {
  const faces = [];
  const count = file.typefaces.length;
  for (let index = 0; index < count; index++) {
    const face = file.typefaces.get(index);
    faces.push({ family: face.familyName, full: face.fullName, glyphCount: face.glyphCount, glyphA: face.getGlyphId(0x61) });
    face.dispose();
  }
  return { typefaceCount: count, faces };
}

async function rejection(action: () => Promise<unknown>): Promise<unknown> {
  try {
    await action();
  } catch (e) {
    return e;
  }
  return undefined;
}

/** Loads every font through fromAsset, and runs the failing calls. Never throws. */
export async function prepareAssetTests(): Promise<void> {
  // App.tsx initializes after the fonts are loaded, which is too late for fromAsset; it is idempotent.
  initialize();
  for (const source of sources) {
    try {
      const file = await FontFile.fromAsset(source.asset);
      try {
        loaded.set(source.name, { summary: summarize(file) });
      } finally {
        file.dispose();
      }
    } catch (error) {
      loaded.set(source.name, { error });
    }
  }

  try {
    const file = await FontFile.fromAsset(sources[0].asset);
    const face = file.typefaces.get(0);
    file.dispose();
    file.dispose();
    ownership = { disposed: file.isDisposed, family: face.familyName, glyphA: face.getGlyphId(0x61) };
    face.dispose();
  } catch (error) {
    ownership = { error };
  }

  failed.set('unregistered', await rejection(() => FontFile.fromAsset(2147483000)));
  failed.set('notAnAsset', await rejection(() => FontFile.fromAsset({} as unknown as number)));
  failed.set('missingFile', await rejection(() => FontFile.fromAsset({ uri: 'file:///tehreer-no-such-font.ttf' })));
  failed.set('missingResource', await rejection(() => FontFile.fromAsset({ uri: 'tehreer_no_such_resource' })));
  failed.set('missingServer', await rejection(() => FontFile.fromAsset({ uri: 'http://127.0.0.1:1/no-such-font.ttf' })));
  failed.set('unsupportedScheme', await rejection(() => FontFile.fromAsset({ uri: 'content://tehreer/font.ttf' })));
}

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function summaryOf(name: string): Summary {
  const outcome = loaded.get(name);
  check(outcome !== undefined, 'prepareAssetTests() did not run');
  if (outcome && 'error' in (outcome as object)) {
    const error = (outcome as { error: unknown }).error;
    throw new Error(`fromAsset rejected: ${error instanceof Error ? error.message : String(error)}`);
  }
  return (outcome as { summary: Summary }).summary;
}

function expectRejected(key: string, pattern: RegExp, name?: string): void {
  check(failed.has(key), 'prepareAssetTests() did not run');
  const error = failed.get(key);
  check(error instanceof Error, `expected a rejection with an Error, got ${String(error)}`);
  check(pattern.test((error as Error).message), `expected ${pattern}, got "${(error as Error).message}"`);
  if (name !== undefined) {
    check((error as Error).name === name, `expected ${name}, got ${(error as Error).name}`);
  }
}

const tests: [string, (b: NativeBindings) => void][] = [
  ...sources.map((source): [string, (b: NativeBindings) => void] => [
    `fromAsset loads ${source.name} like fromBytes`, () => {
      const summary = summaryOf(source.name);
      check(summary.typefaceCount >= 1, 'no typeface');
      const bytes = source.bytes();
      check(bytes.length > 0, 'the bytes of the font were not loaded');
      const file = FontFile.fromBytes(bytes);
      try {
        const expected = summarize(file);
        check(summary.typefaceCount === expected.typefaceCount, `typefaces ${summary.typefaceCount} != ${expected.typefaceCount}`);
        check(JSON.stringify(summary.faces) === JSON.stringify(expected.faces), `${JSON.stringify(summary.faces)} != ${JSON.stringify(expected.faces)}`);
      } finally {
        file.dispose();
      }
    },
  ]),

  ['the static Roboto asset has the known family, glyph count and glyph', () => {
    const summary = summaryOf('roboto');
    check(summary.typefaceCount === 1, `${summary.typefaceCount} typefaces`);
    const face = summary.faces[0];
    check(face.family === 'Roboto' && face.full === 'Roboto Regular', `${face.family} ${face.full}`);
    check(face.glyphCount === 4 && face.glyphA === 1, `${face.glyphCount} glyphs, a is ${face.glyphA}`);
  }],

  ['a typeface outlives the font file of the asset, and dispose is idempotent', () => {
    check(ownership !== undefined, 'prepareAssetTests() did not run');
    if (ownership && 'error' in (ownership as object)) {
      throw new Error(String((ownership as { error: unknown }).error));
    }
    const result = ownership as { disposed: boolean; family: string | undefined; glyphA: number };
    check(result.disposed, 'the file is not disposed');
    check(result.family === 'Roboto' && result.glyphA === 1, `${result.family} ${result.glyphA}`);
  }],

  ['a number that is not an asset is refused with a message that says so', () => {
    expectRejected('unregistered', /is not an asset/);
  }],
  ['an argument that is neither a number nor an object with a uri is a TypeError', () => {
    expectRejected('notAnAsset', /number from require\(\)/, 'TypeError');
  }],
  ['a missing file names the asset and the problem', () => {
    expectRejected('missingFile', /Could not load the font asset file:\/\/\/tehreer-no-such-font\.ttf.*usable font/);
  }],
  ['a missing resource name is refused (no raw resource, or no resolver on iOS)', () => {
    expectRejected('missingResource', /Could not load the font asset tehreer_no_such_resource: .*(no raw resource|not linked)/);
  }],
  ['an unreachable server is a rejection that names the asset', () => {
    expectRejected('missingServer', /Could not load the font asset http:\/\/127\.0\.0\.1:1\/no-such-font\.ttf/);
  }],
  ['a scheme that is no file is refused', () => {
    expectRejected('unsupportedScheme', /Could not load the font asset content:\/\/tehreer\/font\.ttf: Only /);
  }],
];

export function runAssetTests(bindings: NativeBindings): TestResult {
  const result: TestResult = { passed: 0, failures: [] };
  for (const [name, body] of tests) {
    try {
      body(bindings);
      result.passed++;
    } catch (e) {
      result.failures.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return result;
}

export const assetTestCount = tests.length;
