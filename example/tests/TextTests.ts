import type { NativeBindings } from '../../src/internal/NativeBindings';
import type { Handle } from '../../src/internal/NativeFunctions';
import { Typeface } from '../../src/graphics/Typeface';
import { TextAlignment } from '../../src/layout/enums';
import { TMutableText } from '../../src/layout/TMutableText';
import { TText } from '../../src/layout/TText';
import { FontFeatures } from '../../src/sfnt/FontFeatures';
import { SfntTag } from '../../src/sfnt/SfntTag';
import { fontBytes } from './fontData';

// The suite of issue #20: TText, TMutableText and the attribute codec against the real bindings.
// `replacement` is not covered: it waits for the layout package (issue #21).

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function expectThrows(action: () => unknown, expectedName: string, pattern?: RegExp): void {
  try {
    action();
  } catch (e) {
    const error = e as Error;
    check(error.name === expectedName, `expected ${expectedName}, got ${error.name}: ${error.message}`);
    check(pattern === undefined || pattern.test(error.message), `message "${error.message}" does not match ${pattern}`);
    return;
  }
  throw new Error(`expected ${expectedName}, but nothing was thrown`);
}

function makeTypeface(b: NativeBindings): Typeface {
  const file = b.TRFontFileCreateFromMemory(fontBytes, fontBytes.byteLength);
  check(file !== undefined, 'the font cannot be loaded');
  const typeface = b.TRFontFileGetTypeface(file as Handle<'TRFontFile'>, 0);
  b.disposeHandle(file as Handle<'TRFontFile'>);
  check(typeface !== undefined, 'the font has no typeface');
  return Typeface.adopting(typeface as Handle<'TRTypeface'>);
}

const near = (a: unknown, b: number) => typeof a === 'number' && Math.abs(a - b) < 1e-4;

type Test = [name: string, body: (b: NativeBindings) => void];

const tests: Test[] = [
  ['a text keeps its UTF-16 string', () => {
    const text = new TText('a\u{1F600}ب');
    check(text.length === 4 && text.string === 'a\u{1F600}ب', 'length and string');
    check(text.getString(1, 3) === '\u{1F600}', 'the pair');
    check(text.getString(2, 2) === '', 'empty range');
    check(new TText('').length === 0 && new TText('').string === '', 'empty text');
    text.dispose();
  }],

  ['a range may end inside a surrogate pair and lone surrogates survive', () => {
    const text = new TMutableText('a\u{1F600}b');
    check(text.getString(1, 2) === '\ud83d' && text.getString(2, 3) === '\ude00', 'halves');
    text.setAttributes(2, 4, { typeSize: 9 });
    check(text.getAttributeRun(1)?.length === 1, 'run before the split');
    check(text.getAttributeRun(2)?.attributes.typeSize === 9 && text.getAttributeRun(2)?.length === 2, 'run after the split');
    text.delete(2, 3);
    check(text.length === 3, 'delete of a half');
    text.setString('\ud800x\udc00');
    check(text.string === '\ud800x\udc00', 'lone surrogates');
    text.dispose();
  }],

  ['a text can be edited and edits can be batched', () => {
    const text = new TMutableText('hello');
    text.append(' world');
    text.insert(5, ',');
    text.delete(5, 6);
    text.replace(0, 5, 'HELLO');
    check(text.string === 'HELLO world', text.string);
    text.append('');
    text.insert(2, '');
    text.replace(0, 1, '');
    text.edit((editing) => {
      editing.append('!');
      editing.append('?');
    });
    check(text.string === 'ELLO world!?', text.string);
    expectThrows(() => text.edit(() => { throw new Error('boom'); }), 'Error', /boom/);
    text.setString('again');
    check(text.string === 'again', 'setString');
    text.setString('');
    check(text.length === 0, 'empty setString');
    text.dispose();
  }],

  ['every attribute is stored and read back', (b) => {
    const text = new TMutableText('abc');
    const typeface = makeTypeface(b);
    text.setAttributes(0, 3, {
      typeface,
      typeSize: 12.5, scaleX: 1.5, scaleY: 0.5, baselineOffset: 2, obliqueness: -0.25,
      foregroundColor: 0x80ff0000, backgroundColor: 0xff00ff00, underline: true, strikethrough: false,
      decorationColor: 0xff0000ff, userData: 4242, languageTag: SfntTag.make('URD'),
      fontFeatures: [{ tag: SfntTag.make('liga'), value: 0 }],
      textAlignment: TextAlignment.Center,
      firstLineHeadIndent: 10, headIndent: 8, tailIndent: -4, firstIndentLineCount: 2,
      paragraphSpacingBefore: 3, paragraphSpacing: 5, lineHeightMultiple: 1.25,
      minimumLineHeight: 14, maximumLineHeight: 40, lineSpacing: 2,
    });
    // The text retains what it needs: the caller's wrapper can go.
    typeface.dispose();

    const run = text.getAttributeRun(0);
    check(run !== undefined && run.length === 3, 'run');
    const a = run?.attributes ?? {};
    check(a.typeface instanceof Typeface && !a.typeface.isDisposed, 'typeface');
    check(near(a.typeSize, 12.5) && near(a.scaleX, 1.5) && near(a.scaleY, 0.5) && near(a.baselineOffset, 2) && near(a.obliqueness, -0.25), 'floats');
    check(a.foregroundColor === 0x80ff0000 && a.backgroundColor === 0xff00ff00 && a.decorationColor === 0xff0000ff, 'colors');
    check(a.underline === true && a.strikethrough === false, 'booleans');
    check(a.userData === 4242 && a.languageTag === SfntTag.make('URD') && a.textAlignment === TextAlignment.Center, 'integers');
    check(a.fontFeatures instanceof FontFeatures && JSON.stringify(a.fontFeatures.items.toArray()) === JSON.stringify([{ tag: SfntTag.make('liga'), value: 0 }]), 'features');
    check(near(a.firstLineHeadIndent, 10) && near(a.headIndent, 8) && near(a.tailIndent, -4) && a.firstIndentLineCount === 2, 'indents');
    check(near(a.paragraphSpacingBefore, 3) && near(a.paragraphSpacing, 5) && near(a.lineHeightMultiple, 1.25), 'spacing');
    check(near(a.minimumLineHeight, 14) && near(a.maximumLineHeight, 40) && near(a.lineSpacing, 2), 'heights');
    a.typeface?.dispose();
    if (a.fontFeatures instanceof FontFeatures) {
      a.fontFeatures.dispose();
    }
    text.dispose();
  }],

  ['attributes come back as runs and are removed from ranges', () => {
    const text = new TMutableText('abcde');
    text.setAttributes(0, 3, { typeSize: 20 });
    text.setAttributes(2, 5, { foregroundColor: 0xff112233 });
    const first = text.getAttributeRun(0);
    check(first?.length === 2 && near(first.attributes.typeSize, 20) && first.attributes.foregroundColor === undefined, 'first');
    check(text.getAttributeRun(3)?.length === 2 && text.getAttributeRun(3)?.attributes.typeSize === undefined, 'third');
    check(text.getAttributeRun(5) === undefined && text.getAttributeRun(500) === undefined, 'past the end');
    text.removeAttributes(1, 4, 'typeSize', 'foregroundColor', 'underline');
    check(Object.keys(text.getAttributeRun(1)?.attributes ?? { x: 1 }).length === 0, 'removed');
    check(text.getAttributeRun(4)?.attributes.foregroundColor === 0xff112233, 'kept');
    const before = JSON.stringify(text.getAttributeRun(0));
    text.setAttributes(1, 1, { typeSize: 3 });
    text.removeAttributes(1, 1, 'typeSize');
    check(text.getAttributeRun(0) !== undefined && JSON.stringify(text.getAttributeRun(0)) === before, 'an empty range changes nothing');
    check(text.getAttributeRun(1)?.attributes.typeSize === undefined, 'the empty range set nothing');
    text.dispose();
  }],

  ['a replacement of text keeps the attributes of the range it replaces', () => {
    const text = new TMutableText('abcd');
    text.setAttributes(0, 4, { typeSize: 10 });
    text.replace(1, 3, 'XYZ');
    const run = text.getAttributeRun(0);
    check(text.string === 'aXYZd' && run?.length === 5 && near(run.attributes.typeSize, 10), 'attributes');
    text.dispose();
  }],

  ['a copy does not change when its source is changed, and the other way round', () => {
    const source = new TMutableText('abc');
    source.setAttributes(0, 3, { typeSize: 10 });
    const copy = source.copy();
    const again = copy.mutableCopy();
    source.append('d');
    source.setAttributes(0, 1, { typeSize: 99, underline: true });
    again.append('e');
    again.removeAttributes(0, 3, 'typeSize');
    check(copy.string === 'abc' && copy.length === 3, 'copy string');
    const run = copy.getAttributeRun(0);
    check(run?.length === 3 && near(run.attributes.typeSize, 10) && run.attributes.underline === undefined, 'copy attributes');
    check(again.string === 'abce' && source.string === 'abcd', 'strings');
    check(near(source.getAttributeRun(0)?.attributes.typeSize, 99), 'source attributes');
    check(!copy.equals(source) && again instanceof TMutableText, 'objects');
    source.dispose();
    check(copy.string === 'abc', 'a copy outlives its source');
    copy.dispose();
    again.dispose();
  }],

  ['invalid ranges are a RangeError and change nothing', () => {
    const text = new TMutableText('abc');
    for (const [from, to] of [[2, 4], [-1, 2], [3, 2], [0.5, 2], [0, NaN]] as const) {
      expectThrows(() => text.getString(from, to), 'RangeError');
      expectThrows(() => text.delete(from, to), 'RangeError');
      expectThrows(() => text.replace(from, to, 'x'), 'RangeError');
      expectThrows(() => text.setAttributes(from, to, { typeSize: 1 }), 'RangeError');
      expectThrows(() => text.removeAttributes(from, to, 'typeSize'), 'RangeError');
    }
    expectThrows(() => text.insert(4, 'x'), 'RangeError');
    expectThrows(() => text.insert(-1, 'x'), 'RangeError');
    expectThrows(() => text.getAttributeRun(-1), 'RangeError');
    expectThrows(() => text.getAttributeRun(1.5), 'RangeError');
    check(text.string === 'abc' && Object.keys(text.getAttributeRun(0)?.attributes ?? { x: 1 }).length === 0, 'unchanged');
    text.insert(3, 'd');
    check(text.string === 'abcd', 'insert at the end');
    text.dispose();
  }],

  ['invalid attributes are refused by name, type and value, and change nothing', (b) => {
    const text = new TMutableText('abc');
    const typeface = makeTypeface(b);
    expectThrows(() => text.setAttributes(0, 3, { typeSize: 3, bogus: 1 } as never), 'TypeError', /bogus/);
    expectThrows(() => text.setAttributes(0, 3, { typeSize: 3, replacement: {} } as never), 'TypeError');
    expectThrows(() => text.setAttributes(0, 3, { typeSize: 3, scaleX: NaN }), 'RangeError');
    expectThrows(() => text.setAttributes(0, 3, { underline: 1 } as never), 'TypeError');
    expectThrows(() => text.setAttributes(0, 3, { foregroundColor: -1 }), 'RangeError');
    expectThrows(() => text.setAttributes(0, 3, { textAlignment: 9 as never }), 'RangeError');
    expectThrows(() => text.setAttributes(0, 3, { typeSize: 1e39 }), 'RangeError');
    expectThrows(() => text.setAttributes(0, 3, { userData: 2 ** 32 }), 'RangeError');
    expectThrows(() => text.setAttributes(0, 3, { userData: -1 }), 'RangeError');
    expectThrows(() => text.setAttributes(0, 3, { firstIndentLineCount: -1 }), 'RangeError');
    expectThrows(() => text.setAttributes(0, 3, { typeface: {} as never }), 'TypeError');
    expectThrows(() => text.removeAttributes(0, 3, 'bogus' as never), 'TypeError');
    typeface.dispose();
    expectThrows(() => text.setAttributes(0, 3, { typeSize: 3, typeface }), 'Error', /already disposed/);
    check(Object.keys(text.getAttributeRun(0)?.attributes ?? { x: 1 }).length === 0, 'nothing was set');
    text.dispose();
  }],

  ['the native binding refuses what the wrapper would not send', (b) => {
    const text = new TMutableText('abc');
    const handle = text.nativeHandle;
    expectThrows(() => b.TRTextSetAttribute(handle, 0, 3, { type: 999, value: 1 }), 'RangeError');
    expectThrows(() => b.TRTextSetAttribute(handle, 0, 3, { type: 2, value: 'big' as never }), 'Error');
    expectThrows(() => b.TRTextSetAttribute(handle, 0, 3, { type: 1, value: 5 as never }), 'Error');
    check(b.TRTextSetAttribute(handle, 0, 9, { type: 2, value: 1 }) === false, 'a range past the end is false');
    const immutable = new TText('x');
    expectThrows(() => b.TRTextSetAttribute(immutable.nativeHandle, 0, 1, { type: 2, value: 1 }), 'Error', /immutable/);
    text.dispose();
    immutable.dispose();
  }],

  ['dispose is idempotent and a disposed text is refused', () => {
    const text = new TMutableText('abc');
    const copy = text.copy();
    text.dispose();
    text.dispose();
    check(text.isDisposed, 'disposed');
    for (const use of [
      () => text.length, () => text.string, () => text.getString(0, 1), () => text.getAttributeRun(0),
      () => text.copy(), () => text.mutableCopy(), () => text.append('x'), () => text.insert(0, 'x'),
      () => text.delete(0, 1), () => text.replace(0, 1, 'x'), () => text.setString('x'),
      () => text.setAttributes(0, 1, { typeSize: 1 }), () => text.removeAttributes(0, 1, 'typeSize'),
      () => text.beginEditing(), () => text.endEditing(), () => text.equals(copy),
    ]) {
      expectThrows(use, 'Error', /already disposed/);
    }
    check(copy.string === 'abc', 'a copy lives on');
    copy.dispose();
  }],

  ['texts that are never disposed are collected without harm', (b) => {
    for (let index = 0; index < 20; index++) {
      const text = new TMutableText('abc');
      text.setAttributes(0, 3, { typeface: makeTypeface(b), fontFeatures: [{ tag: SfntTag.make('liga'), value: 1 }] });
      text.getAttributeRun(0);
      text.copy();
    }
    // Debug builds only; the device runs those, so a missing hook is a failure, not a skip.
    check(typeof b.testCollectGarbage === 'function', 'testCollectGarbage is missing: this needs a debug build');
    b.testCollectGarbage?.();
    check(b.smokeTest(), 'Core still works');
  }],
];

export function runTextTests(bindings: NativeBindings): { passed: number; failures: string[] } {
  const result = { passed: 0, failures: [] as string[] };
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

export const textTestCount = tests.length;
