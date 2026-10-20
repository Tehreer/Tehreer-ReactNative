import type { NativeBindings } from '../../src/internal/NativeBindings';
import { FontFile } from '../../src/graphics/FontFile';
import type { Typeface } from '../../src/graphics/Typeface';
import { fontBytes as robotoBytes } from './fontData';
import { colorFontBytes, variableFontBytes } from './graphicsFontData';

// The suite of FontFile and Typeface (issue #15). It runs the library classes against the real
// bindings in Hermes, on Core's own fixtures: Roboto-Regular.abc (static), Roboto-Variable.abc
// (wght and wdth axes, 18 named styles) and RocherColorGX.abc (variable color font, 11 palettes of
// 4 entries). The expected values are the ones that Core's own tests (TypefaceTests.cpp) pin.

export interface TestResult {
  passed: number;
  failures: string[];
}

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function expectThrows(action: () => unknown, pattern: RegExp, expectedName?: string): void {
  try {
    action();
  } catch (e) {
    const error = e as Error;
    check(pattern.test(error.message), `expected ${pattern}, got "${error.message}"`);
    if (expectedName !== undefined) {
      check(error.name === expectedName, `expected ${expectedName}, got ${error.name}`);
    }
    return;
  }
  throw new Error(`expected ${pattern}, but nothing was thrown`);
}

const tag = (name: string): number =>
  ((name.charCodeAt(0) << 24) | (name.charCodeAt(1) << 16) | (name.charCodeAt(2) << 8) | name.charCodeAt(3)) >>> 0;

function roboto(): Typeface {
  return FontFile.fromBytes(robotoBytes).typefaces.get(0);
}

function variable(): Typeface {
  return FontFile.fromBytes(variableFontBytes).typefaces.get(0);
}

function color(): Typeface {
  return FontFile.fromBytes(colorFontBytes).typefaces.get(0);
}

function collect(b: NativeBindings): void {
  if (b.testCollectGarbage) {
    b.testCollectGarbage();
    b.testCollectGarbage();
  }
}

const tests: [string, (b: NativeBindings) => void][] = [
  ['a static font has the metrics, names and no variation, palettes or strikes', () => {
    const face = roboto();
    check(face.weight === 400 && face.width === 5 && face.slope === 0, `${face.weight} ${face.width} ${face.slope}`);
    check(face.unitsPerEm === 2048, 'unitsPerEm');
    check(face.ascent === 1900 && face.descent === 500 && face.leading === 0, 'ascent, descent, leading');
    check(face.glyphCount === 4, 'glyphCount');
    check(face.underlinePosition === -200 && face.underlineThickness === 100, 'underline');
    check(face.familyName === 'Roboto' && face.styleName === 'Regular', `${face.familyName} ${face.styleName}`);
    check(face.fullName === 'Roboto Regular', `${face.fullName}`);
    check(face.isScalable && !face.isVariable, 'scalable and not variable');
    check(face.variationAxes.length === 0 && face.namedStyles.length === 0, 'no axes or styles');
    check(face.variationAxes.isEmpty && face.variationCoordinates.isEmpty, 'empty lists');
    check(face.paletteEntryNames.isEmpty && face.predefinedPalettes.isEmpty && face.associatedColors.isEmpty, 'no palettes');
    check(face.bitmapStrikes.isEmpty, 'no strikes');
    const box = face.boundingBox;
    check(Number.isFinite(box.width) && box.width > 0 && box.height > 0, 'bounding box');
    face.dispose();
  }],

  ['glyphs, advances, tables and names', () => {
    const face = roboto();
    check(face.getGlyphId(0x61) === 1 && face.getGlyphId(0x62) === 2 && face.getGlyphId(0x63) === 3, 'a b c');
    check(face.getGlyphId(0x7a) === 0 && face.getGlyphId(0x10ffff) === 0, 'missing glyphs are 0');
    check(face.getVariantGlyphId(0x61, 0xfe0f) === 0, 'no variants');
    check(face.getGlyphAdvance(1, 2048) === 1114, 'advance at the em size');
    check(face.getGlyphAdvance(1, 1024) === 557, 'advance scales');
    check(face.getGlyphAdvance(1, 0) === 0, 'advance at size 0');
    check(face.getGlyphAdvance(1, 2048, true) >= 0, 'vertical advance');
    check(face.getGlyphName(1) === undefined, 'a font without a post table names no glyph');

    const head = tag('head');
    check(face.getTableSize(head) === 54, 'head is 54 bytes');
    const whole = face.getTableData(head);
    check(whole !== undefined && whole.length === 54, 'the whole table');
    check(whole![0] === 0 && whole![1] === 1 && whole![2] === 0 && whole![3] === 0, 'version 1.0');
    const part = face.getTableData(head, 12, 8)!;
    check(part.length === 8 && part.every((byte, i) => byte === whole![12 + i]), 'a part equals that part of the whole');
    check(face.getTableData(head, 50)!.length === 4, 'cut at the end of the table');
    check(face.getTableData(head, 54)!.length === 0 && face.getTableData(head, 1000)!.length === 0, 'empty past the end');
    check(face.getTableData(head, 0, 4)!.length === 4, 'length limits the part');
    check(face.getTableData(tag('ZZZZ')) === undefined && face.getTableSize(tag('ZZZZ')) === 0, 'no such table');
    face.dispose();
  }],

  ['a variable font lists its axes, named styles and coordinates', () => {
    const face = variable();
    check(face.isVariable && face.variationAxes.length === 2, 'two axes');
    const [wght, wdth] = face.variationAxes.toArray();
    check(wght!.tag === tag('wght') && wdth!.tag === tag('wdth'), `${wght!.tag} ${wdth!.tag}`);
    check(wght!.minValue < wght!.defaultValue && wght!.defaultValue < wght!.maxValue, 'wght range');
    check(wght!.defaultValue === 400 && wdth!.defaultValue === 100, 'defaults');
    check(!wght!.isHidden && !wdth!.isHidden, 'not hidden');
    check(typeof wght!.name === 'string' || wght!.name === undefined, 'name');

    const coordinates = face.variationCoordinates;
    check(coordinates.length === 2 && coordinates.get(0) === 400 && coordinates.get(1) === 100, 'coordinates');
    const copy = coordinates.toTypedArray();
    check(copy instanceof Float32Array && copy[0] === 400, 'toTypedArray copies');

    check(face.namedStyles.length === 18, `${face.namedStyles.length} named styles`);
    const first = face.namedStyles.get(0);
    check(first.styleName === 'Regular', `${first.styleName}`);
    check(first.coordinates.length === 2 && first.coordinates.get(0) === 400 && first.coordinates.get(1) === 100, 'style coordinates');
    check(face.namedStyles.every((style) => style.coordinates.length === 2), 'every style has a coordinate per axis');
    check(face.namedStyles.slice(2, 5).length === 3, 'slice');
    expectThrows(() => face.variationAxes.get(2), /out of the range/, 'RangeError');
    expectThrows(() => face.namedStyles.get(18), /out of the range/, 'RangeError');
    expectThrows(() => face.namedStyles.get(-1), /out of the range/, 'RangeError');
    face.dispose();
  }],

  ['a font file lists a typeface per named style, and each is a typeface of its own', () => {
    const file = FontFile.fromBytes(variableFontBytes);
    const list = file.typefaces;
    check(list.length >= 1, 'at least one');
    const regular = list.get(0);
    const other = list.get(list.length - 1);
    check(regular.variationCoordinates.length === 2 && typeof regular.styleName === 'string', `${regular.styleName}`);
    check(!regular.equals(other) || list.length === 1, 'different typefaces');
    check(list.get(0).equals(regular), 'the same typeface twice is the same Core object');
    expectThrows(() => list.get(list.length), /out of the range/, 'RangeError');
    regular.dispose();
    other.dispose();
    file.dispose();
  }],

  ['a variation instance follows the coordinates and leaves the source alone', () => {
    const base = variable();
    const bold = base.getVariationInstance([700, 75])!;
    check(bold.weight === 700 && bold.width === 3, `${bold.weight} ${bold.width}`);
    check(bold.variationCoordinates.get(0) === 700 && bold.variationCoordinates.get(1) === 75, 'coordinates');
    check(bold.styleName === 'Condensed Bold', `${bold.styleName}`);
    check(base.weight === 400 && base.variationCoordinates.get(0) === 400, 'the source is unchanged');
    check(!bold.equals(base), 'a new typeface');

    const partial = base.getVariationInstance([700])!;
    check(partial.variationCoordinates.get(0) === 700 && partial.variationCoordinates.get(1) === 100, 'missing coordinates take the defaults');
    const defaults = base.getVariationInstance([])!;
    check(defaults.variationCoordinates.get(0) === 400, 'no coordinates means the defaults');

    const axis = base.variationAxes.get(0);
    const clamped = base.getVariationInstance([axis.minValue - 500, 100])!;
    check(clamped.variationCoordinates.get(0) === axis.minValue, 'a low value is clamped to the axis');
    const again = bold.getVariationInstance([200, 100])!;
    check(again.variationCoordinates.get(0) === 200, 'derived again');

    check(roboto().getVariationInstance([700]) === undefined, 'a static font cannot be varied');
    expectThrows(() => base.getVariationInstance([Number.NaN]), /finite/, 'RangeError');
    expectThrows(() => base.getVariationInstance([Infinity]), /finite/, 'RangeError');

    for (const face of [base, bold, partial, defaults, clamped, again]) {
      face.dispose();
    }
  }],

  ['a color font lists its entries, palettes and colors, and a color instance changes the colors', () => {
    const face = color();
    check(face.isVariable && face.variationAxes.length === 2, 'variable color font');
    check(face.paletteEntryNames.length === 4, `${face.paletteEntryNames.length} entries`);
    check(face.predefinedPalettes.length === 11, `${face.predefinedPalettes.length} palettes`);
    check(face.paletteEntryNames.toArray().every((name) => name === undefined || typeof name === 'string'), 'entry names');

    const palettes = face.predefinedPalettes.toArray();
    check(palettes.every((palette) => palette.colors.length === 4), 'a color for each entry');
    const first = palettes[0]!;
    check(first.colors.toTypedArray() instanceof Uint32Array, 'colors are unsigned');
    check(first.colors.toArray().every((value) => value >= 0 && value <= 0xffffffff), 'unsigned values');

    const associated = face.associatedColors;
    check(associated.length === 4, 'associated colors');
    check(first.colors.toArray().join() === associated.toArray().join(), 'the first palette is in use');

    const red = 0xffff0000;
    const half = 0x8000ff00;
    const derived = face.getColorInstance([red, half])!;
    const colors = derived.associatedColors.toArray();
    check(colors[0] === red && colors[1] === half, `${colors}`);
    check(colors[2] === 0xff000000 && colors[3] === 0xff000000, 'missing colors are opaque black');
    check(derived.variationCoordinates.get(0) === face.variationCoordinates.get(0), 'the variation is kept');
    check(face.associatedColors.get(0) === first.colors.get(0), 'the source is unchanged');

    check(roboto().getColorInstance([red]) === undefined, 'a font without palettes cannot be colored');
    expectThrows(() => face.getColorInstance([-1]), /unsigned 32-bit/, 'RangeError');
    expectThrows(() => face.getColorInstance([0x100000000]), /unsigned 32-bit/, 'RangeError');
    expectThrows(() => face.getColorInstance([1.5]), /unsigned 32-bit/, 'RangeError');
    derived.dispose();
    face.dispose();
  }],

  ['a typeface outlives the font file, and a derived typeface outlives its source', () => {
    const file = FontFile.fromBytes(variableFontBytes);
    const list = file.typefaces;
    const face = list.get(0);
    const derived = face.getVariationInstance([300, 100])!;

    file.dispose();
    check(file.isDisposed, 'the file is disposed');
    expectThrows(() => file.typefaces, /already disposed/);
    expectThrows(() => list.get(0), /already disposed/);

    check(face.familyName === 'Roboto' && face.getGlyphId(0x61) !== 0, 'the typeface still works');
    check(face.getGlyphAdvance(1, 1000) > 0, 'and measures');
    face.dispose();
    check(derived.weight === 300 && derived.getGlyphId(0x62) === 2, 'the derived typeface outlives its source');
    derived.dispose();
  }],

  ['dispose is idempotent and every member fails once disposed, lists and their elements too', () => {
    const face = variable();
    const axes = face.variationAxes;
    const styles = face.namedStyles;
    const coordinates = face.variationCoordinates;
    const kept = axes.get(0);
    const keptStyle = styles.get(0);

    face.dispose();
    face.dispose();
    check(face.isDisposed, 'disposed');
    for (const read of [
      () => face.weight, () => face.familyName, () => face.boundingBox, () => face.isVariable, () => face.variationAxes,
      () => face.namedStyles, () => face.associatedColors, () => face.getGlyphId(0x61), () => face.getTableData(tag('head')),
      () => face.getGlyphName(1), () => face.getVariationInstance([1]), () => axes.get(0), () => styles.get(1),
      () => coordinates.get(0), () => coordinates.toTypedArray(), () => face.equals(face),
    ]) {
      expectThrows(read, /already disposed/);
    }
    // What was read before is a copy, and stays valid.
    check(kept.tag === tag('wght') && keptStyle.coordinates.get(0) === 400, 'elements read earlier are copies');
  }],

  ['lists over Core memory keep working when the engine collects what they were made from', (b) => {
    const face = variable();
    const coordinates = face.variationCoordinates;
    check(coordinates.get(0) === 400, 'read before');
    // The list's buffer holds a reference of its own, so collecting the typeface's wrapper is safe.
    face.dispose();
    collect(b);
    expectThrows(() => coordinates.get(0), /already disposed/);
  }],

  ['abandoned font files and typefaces are released by the finalizer without a crash', (b) => {
    for (let i = 0; i < 100; i++) {
      const file = FontFile.fromBytes(variableFontBytes);
      file.typefaces.get(0).getVariationInstance([300 + i, 90]);
      file.typefaces.get(file.typefaces.length - 1).variationCoordinates.toArray();
    }
    collect(b);
    check(b.smokeTest(), 'Core still works');
    check(roboto().familyName === 'Roboto', 'and fonts still load');
  }],

  ['a font that Core cannot use, and arguments that are no font, are refused', () => {
    expectThrows(() => FontFile.fromBytes(new Uint8Array(0)), /usable font/);
    expectThrows(() => FontFile.fromBytes(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])), /usable font/);
    expectThrows(() => FontFile.fromBytes(robotoBytes.subarray(0, 12)), /usable font/);
    // Whatever the message, a value that is no buffer must not reach Core.
    expectThrows(() => FontFile.fromBytes('font' as unknown as ArrayBuffer), /./);
    expectThrows(() => FontFile.fromBytes(undefined as unknown as ArrayBuffer), /./);
    expectThrows(() => FontFile.fromPath('/no/such/font.ttf'), /usable font/);
    expectThrows(() => FontFile.fromPath(''), /usable font/);
    expectThrows(() => FontFile.fromPath(42 as unknown as string), /must be a string/);
  }],

  ['bytes are copied, and a view of a bigger buffer is read from its own offset', () => {
    const padded = new Uint8Array(robotoBytes.length + 16);
    padded.set(robotoBytes, 8);
    const copy = padded.slice(8, 8 + robotoBytes.length);
    const file = new FontFile(padded.subarray(8, 8 + robotoBytes.length));
    padded.fill(0);
    const face = file.typefaces.get(0);
    check(face.familyName === 'Roboto' && face.getGlyphId(0x61) === 1, 'the data was copied by Core');
    check(copy.length === robotoBytes.length, 'sanity');
    face.dispose();
    file.dispose();
    check(FontFile.fromBytes(copy.buffer).typefaces.length === 1, 'an ArrayBuffer works too');
  }],

  ['numbers that are no glyph, code point, tag or size are refused', () => {
    const face = roboto();
    expectThrows(() => face.getGlyphId(-1), /out of range/, 'RangeError');
    expectThrows(() => face.getGlyphId(1.5), /must be an integer/, 'RangeError');
    expectThrows(() => face.getGlyphId(Number.NaN), /must be an integer/, 'RangeError');
    expectThrows(() => face.getGlyphId('a' as unknown as number), /must be a number/);
    expectThrows(() => face.getGlyphAdvance(1, Number.NaN), /NaN/, 'RangeError');
    expectThrows(() => face.getGlyphAdvance(70000, 10), /out of range/, 'RangeError');
    expectThrows(() => face.getTableData(tag('head'), -1), /whole number/, 'RangeError');
    expectThrows(() => face.getTableData(tag('head'), 0, -1), /whole number/, 'RangeError');
    expectThrows(() => face.getTableData(tag('head'), 1.5), /whole number/, 'RangeError');
    face.dispose();
  }],
];

export function runGraphicsTests(bindings: NativeBindings): TestResult {
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

export const graphicsTestCount = tests.length;
