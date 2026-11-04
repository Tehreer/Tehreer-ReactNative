import type { NativeBindings } from '../../src/internal/NativeBindings';
import type { Handle } from '../../src/internal/NativeFunctions';
import { Typeface } from '../../src/graphics/Typeface';
import { BoundaryDirection, BoundaryType, BreakMode, TextAlignment } from '../../src/layout/enums';
import { MutableTypesetter } from '../../src/layout/MutableTypesetter';
import { Typesetter } from '../../src/layout/Typesetter';
import { mutableText } from './mutableText';
import { FontFeatures } from '../../src/sfnt/FontFeatures';
import { SfntTag } from '../../src/sfnt/SfntTag';
import { fontBytes } from './fontData';

// The suite of issue #20, ported for the merge of the text into the typesetter (issue #72): Typesetter,
// MutableTypesetter, the editing batch, copies, the boundary search and the attribute codec against the
// real bindings. `replacement` is covered by the layout suite.

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

const next = (text: Typesetter, index: number, type: BoundaryType) => text.findBoundary(index, type, BoundaryDirection.Forward);
const prev = (text: Typesetter, index: number, type: BoundaryType) => text.findBoundary(index, type, BoundaryDirection.Backward);

const tests: Test[] = [
  ['a typesetter keeps its UTF-16 string', () => {
    const text = new Typesetter('a\u{1F600}ب');
    check(text.length === 4 && text.string === 'a\u{1F600}ب', 'length and string');
    check(text.getString(1, 3) === '\u{1F600}', 'the pair');
    check(text.getString(2, 2) === '', 'empty range');
    check(new Typesetter('').length === 0 && new Typesetter('').string === '', 'empty text');
    text.dispose();
  }],

  ['a range may end inside a surrogate pair and lone surrogates survive', () => {
    const text = mutableText('a\u{1F600}b');
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
    const text = mutableText('hello');
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
    const text = mutableText('abc');
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
    const text = mutableText('abcde');
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
    const text = mutableText('abcd');
    text.setAttributes(0, 4, { typeSize: 10 });
    text.replace(1, 3, 'XYZ');
    const run = text.getAttributeRun(0);
    check(text.string === 'aXYZd' && run?.length === 5 && near(run.attributes.typeSize, 10), 'attributes');
    text.dispose();
  }],

  ['a copy does not change when its source is changed, and the other way round', () => {
    const source = mutableText('abc');
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
    check(!copy.equals(source) && again instanceof MutableTypesetter && !(copy instanceof MutableTypesetter), 'objects');
    source.dispose();
    check(copy.string === 'abc', 'a copy outlives its source');
    copy.dispose();
    again.dispose();
  }],

  ['invalid ranges are a RangeError and change nothing', () => {
    const text = mutableText('abc');
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
    const text = mutableText('abc');
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
    const text = mutableText('abc');
    const handle = text.nativeHandle;
    expectThrows(() => b.TRTypesetterSetAttribute(handle, 0, 3, { type: 999, value: 1 }), 'RangeError');
    expectThrows(() => b.TRTypesetterSetAttribute(handle, 0, 3, { type: 2, value: 'big' as never }), 'Error');
    expectThrows(() => b.TRTypesetterSetAttribute(handle, 0, 3, { type: 1, value: 5 as never }), 'Error');
    check(b.TRTypesetterSetAttribute(handle, 0, 9, { type: 2, value: 1 }) === false, 'a range past the end is false');
    const immutable = new Typesetter('x');
    expectThrows(() => b.TRTypesetterSetAttribute(immutable.nativeHandle, 0, 1, { type: 2, value: 1 }), 'Error', /immutable/);
    text.dispose();
    immutable.dispose();
  }],

  ['dispose is idempotent and a disposed text is refused', () => {
    const text = mutableText('abc');
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
      const text = mutableText('abc');
      text.setAttributes(0, 3, { typeface: makeTypeface(b), fontFeatures: [{ tag: SfntTag.make('liga'), value: 1 }] });
      text.getAttributeRun(0);
      text.copy();
    }
    // Debug builds only; the device runs those, so a missing hook is a failure, not a skip.
    check(typeof b.testCollectGarbage === 'function', 'testCollectGarbage is missing: this needs a debug build');
    b.testCollectGarbage?.();
    check(b.smokeTest(), 'Core still works');
  }],

  // ---- Merged from TRText: default attributes, text without a typeface, batches and copies ----

  ['a typesetter takes default attributes, and lines need a typeface from them or from the text', (b) => {
    const typeface = makeTypeface(b);
    const bare = new Typesetter('abc def');
    check(bare.length === 7 && bare.string === 'abc def', 'a text without a typeface exists');
    expectThrows(() => bare.createSimpleLine(0, 7), 'RangeError');
    expectThrows(() => bare.suggestForwardBreak(0, 7, 100, BreakMode.Line), 'RangeError');
    check(bare.findBoundary(0, BoundaryType.Word, BoundaryDirection.Forward) === 3, 'boundaries need no typeface');

    const given = new Typesetter('abc def', { typeface, typeSize: 20 });
    const line = given.createSimpleLine(0, 7);
    check(line.endIndex === 7 && line.width > 0, 'the defaults give the typeface and the size');
    line.dispose();

    const mutable = new MutableTypesetter({ typeface, typeSize: 20 });
    mutable.append('abc');
    typeface.dispose();
    const kept = mutable.createSimpleLine(0, 3);
    check(kept.width > 0, 'the typesetter retains the typeface of its defaults');
    kept.dispose();

    // The typeface may come from the attributes of the text instead.
    const withAttribute = new MutableTypesetter({ typeSize: 20 });
    withAttribute.append('abc');
    expectThrows(() => withAttribute.createSimpleLine(0, 3), 'RangeError');
    const again = makeTypeface(b);
    withAttribute.setAttributes(0, 3, { typeface: again });
    withAttribute.createSimpleLine(0, 3).dispose();
    again.dispose();

    for (const typesetter of [bare, given, mutable, withAttribute]) {
      typesetter.dispose();
    }
  }],

  ['an editing batch defers shaping: no copy, no line and no boundary in it, and all of them after it', (b) => {
    const typeface = makeTypeface(b);
    const text = new MutableTypesetter({ typeface, typeSize: 20 });
    text.beginEditing();
    text.append('abc def');
    text.setAttributes(0, 3, { foregroundColor: 0xff112233 });
    check(text.string === 'abc def', 'the text can be read in a batch');
    expectThrows(() => text.copy(), 'Error', /editing batch/);
    expectThrows(() => text.mutableCopy(), 'Error', /editing batch/);
    expectThrows(() => text.createSimpleLine(0, 3), 'RangeError');
    check(text.findBoundary(0, BoundaryType.Word, BoundaryDirection.Forward) === undefined, 'no boundary in a batch');
    check(text.getBoundaryRange(0, BoundaryType.Word) === undefined, 'no boundary range in a batch');
    text.beginEditing();
    text.endEditing();
    const copy = text.copy();
    check(copy.string === 'abc def' && copy.getAttributeRun(0)?.attributes.foregroundColor === 0xff112233, 'the copy has the text and the attributes');
    const line = copy.createSimpleLine(0, 7);
    check(line.width > 0, 'a line can be made once the batch ended');
    check(text.findBoundary(0, BoundaryType.Word, BoundaryDirection.Forward) === 3, 'and a boundary found');

    // The body of edit() ends the batch also when it throws, and its error wins.
    expectThrows(() => text.edit((editing) => { editing.append('!'); throw new Error('body'); }), 'Error', /body/);
    text.copy().dispose();
    line.dispose();
    copy.dispose();
    text.dispose();
    typeface.dispose();
  }],

  ['copies share the shaping but not the edits, and keep the defaults', (b) => {
    const typeface = makeTypeface(b);
    const source = new MutableTypesetter({ typeface, typeSize: 20 });
    source.append('abc abc');
    const copy = source.copy();
    const editable = copy.mutableCopy();
    source.append(' more');
    editable.delete(0, 4);
    check(copy.string === 'abc abc' && editable.string === 'abc' && source.string === 'abc abc more', 'edits stay apart');
    const before = copy.createSimpleLine(0, 7).width;
    const sameOnSource = (() => { const l = source.createSimpleLine(0, 7); const w = l.width; l.dispose(); return w; })();
    check(Math.abs(before - sameOnSource) < 1e-3, 'a copy lays out like its source');
    editable.createSimpleLine(0, 3).dispose();
    source.dispose();
    check(copy.createSimpleLine(0, 3).width > 0, 'a copy outlives its source');
    copy.dispose();
    editable.dispose();
    typeface.dispose();
  }],

  ['boundaries of graphemes, words and paragraphs follow Unicode and the separators of the text', () => {
    const next = (text: Typesetter, index: number, type: BoundaryType) => text.findBoundary(index, type, BoundaryDirection.Forward);
    const previous = (text: Typesetter, index: number, type: BoundaryType) => text.findBoundary(index, type, BoundaryDirection.Backward);

    // A letter with a combining mark, a surrogate pair, and a carriage return with a line feed.
    const graphemes = new Typesetter('á\u{1F600}\r\nb');
    const g = BoundaryType.Grapheme;
    check(next(graphemes, 0, g) === 2 && next(graphemes, 1, g) === 2 && next(graphemes, 2, g) === 4 && next(graphemes, 3, g) === 4, 'grapheme forward');
    check(next(graphemes, 4, g) === 6 && next(graphemes, 6, g) === 7, 'grapheme forward over CR LF');
    check(previous(graphemes, 7, g) === 6 && previous(graphemes, 6, g) === 4 && previous(graphemes, 5, g) === 4 && previous(graphemes, 4, g) === 2 && previous(graphemes, 2, g) === 0, 'grapheme backward');
    graphemes.dispose();

    const words = new Typesetter('Hello, world');
    const w = BoundaryType.Word;
    check(next(words, 0, w) === 5 && next(words, 3, w) === 5 && next(words, 5, w) === 6 && next(words, 6, w) === 7 && next(words, 7, w) === 12, 'word forward');
    check(previous(words, 12, w) === 7 && previous(words, 9, w) === 7 && previous(words, 7, w) === 6 && previous(words, 5, w) === 0, 'word backward');
    words.dispose();

    // Apostrophes and points inside of a word or a number do not break it.
    const joined = new Typesetter("can't 3.14 a_b x");
    check(next(joined, 0, w) === 5 && next(joined, 6, w) === 10 && next(joined, 11, w) === 14, `joined words: ${next(joined, 0, w)} ${next(joined, 6, w)} ${next(joined, 11, w)}`);
    joined.dispose();

    // Urdu words are separated by spaces, and the text of a script keeps together.
    const urdu = new Typesetter('تحریر ایک');
    check(next(urdu, 0, w) === 5 && next(urdu, 5, w) === 6 && next(urdu, 6, w) === 9, `Urdu words: ${next(urdu, 0, w)} ${next(urdu, 5, w)} ${next(urdu, 6, w)}`);
    urdu.dispose();

    // A line feed, and a carriage return with a line feed, each end their paragraph.
    const paragraphs = new Typesetter('ab\ncd\r\nef');
    const p = BoundaryType.Paragraph;
    check(next(paragraphs, 0, p) === 3 && next(paragraphs, 2, p) === 3 && next(paragraphs, 3, p) === 7 && next(paragraphs, 6, p) === 7 && next(paragraphs, 7, p) === 9, 'paragraph forward');
    check(previous(paragraphs, 9, p) === 7 && previous(paragraphs, 8, p) === 7 && previous(paragraphs, 7, p) === 3 && previous(paragraphs, 4, p) === 3 && previous(paragraphs, 3, p) === 0, 'paragraph backward');
    paragraphs.dispose();
  }],

  ['a boundary search that finds nothing is undefined, and a bad argument is refused', () => {
    const text = new Typesetter('abc');
    check(next(text, 3, BoundaryType.Grapheme) === undefined && prev(text, 0, BoundaryType.Grapheme) === undefined, 'nothing after the end or before the start');
    check(next(text, 3, BoundaryType.Paragraph) === undefined && prev(text, 0, BoundaryType.Paragraph) === undefined, 'nor for paragraphs');
    check(next(text, 4, BoundaryType.Word) === undefined && prev(text, 4, BoundaryType.Word) === undefined, 'an index past the length');
    check(new Typesetter('').findBoundary(0, BoundaryType.Grapheme, BoundaryDirection.Forward) === undefined, 'an empty text has none');
    for (const index of [-1, 1.5, NaN, Infinity]) {
      expectThrows(() => text.findBoundary(index, BoundaryType.Word, BoundaryDirection.Forward), 'RangeError');
      expectThrows(() => text.getBoundaryRange(index, BoundaryType.Word), 'RangeError');
    }
    expectThrows(() => text.findBoundary(0, 3 as BoundaryType, BoundaryDirection.Forward), 'RangeError');
    expectThrows(() => text.findBoundary(0, BoundaryType.Word, 2 as BoundaryDirection), 'RangeError');
    expectThrows(() => text.getBoundaryRange(0, 3 as BoundaryType), 'RangeError');
    text.dispose();
  }],

  ['the range of the segment under an index includes its separator, and the end has an empty one', () => {
    const text = new Typesetter('Hello, world\nbye');
    const range = (index: number, type: BoundaryType) => text.getBoundaryRange(index, type);
    const same = (found: { startIndex: number; endIndex: number } | undefined, start: number, end: number) => found !== undefined && found.startIndex === start && found.endIndex === end;
    check(same(range(1, BoundaryType.Word), 0, 5), 'the word under a caret');
    check(same(range(5, BoundaryType.Word), 5, 6), 'a boundary belongs to the segment that starts at it');
    check(same(range(0, BoundaryType.Grapheme), 0, 1), 'a grapheme');
    check(same(range(12, BoundaryType.Paragraph), 0, 13), 'a paragraph includes its separator');
    check(same(range(14, BoundaryType.Paragraph), 13, 16), 'the last paragraph');
    check(same(range(16, BoundaryType.Word), 16, 16), 'the end of the text has an empty segment');
    check(range(17, BoundaryType.Word) === undefined, 'past the end there is none');
    text.dispose();
  }],

  ['boundaries follow the edits, also across paragraphs, and a copy has its own', () => {
    const word = (text: Typesetter, index: number) => text.findBoundary(index, BoundaryType.Word, BoundaryDirection.Forward);
    const back = (text: Typesetter, index: number) => text.findBoundary(index, BoundaryType.Word, BoundaryDirection.Backward);

    const text = mutableText('ab cd');
    check(word(text, 0) === 2, 'start');
    text.insert(2, 'xyz');
    check(word(text, 0) === 5, 'insert');
    text.delete(0, 3);
    check(word(text, 0) === 2, 'delete');
    text.replace(0, 2, 'a b c');
    check(word(text, 0) === 1, 'replace');
    text.setString('one two');
    check(word(text, 0) === 3, 'setString');
    text.append('three');
    check(word(text, 8) === 12, 'append');
    const copy = text.copy();
    text.delete(0, 4);
    check(word(copy, 0) === 3 && word(text, 0) === 8, 'a copy has its own analysis');
    copy.dispose();
    text.dispose();

    const paragraphs = mutableText('ab cd\nef gh');
    check(word(paragraphs, 3) === 5 && word(paragraphs, 5) === 6 && word(paragraphs, 6) === 8 && back(paragraphs, 8) === 6 && back(paragraphs, 6) === 5, 'no word crosses a separator');
    paragraphs.delete(5, 6);
    check(word(paragraphs, 3) === 7 && back(paragraphs, 7) === 3, 'deleting the separator merges the words');
    paragraphs.insert(5, '\n');
    check(word(paragraphs, 3) === 5 && word(paragraphs, 6) === 8, 'inserting a separator splits the paragraph');
    paragraphs.insert(0, 'xy');
    check(word(paragraphs, 0) === 4 && word(paragraphs, 8) === 10, 'an edit in one paragraph leaves the others');
    paragraphs.dispose();
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
