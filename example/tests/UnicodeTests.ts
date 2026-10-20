import type { NativeBindings } from '../../src/internal/NativeBindings';
import type { Handle } from '../../src/internal/NativeFunctions';
import { BaseDirection } from '../../src/unicode/BaseDirection';
import { BidiAlgorithm } from '../../src/unicode/BidiAlgorithm';
import { BidiPair } from '../../src/unicode/BidiPair';
import { BidiRun } from '../../src/unicode/BidiRun';
import { CodePoint } from '../../src/unicode/CodePoint';
import { BidiClass, GeneralCategory, Script } from '../../src/unicode/enums';
import { ScriptClassifier } from '../../src/unicode/ScriptClassifier';
import { ScriptRun } from '../../src/unicode/ScriptRun';
import { SfntTag } from '../../src/sfnt/SfntTag';

// The suite of issue #19: the classic API of SheenBidi against the real bindings, and with real
// text. The text copy that the native side keeps is observed through `testGetBidiTextCount` (debug
// builds), which counts the copies that are alive.

const ARABIC = 'ابج';

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

function same(actual: unknown, expected: unknown): boolean {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function describe(value: unknown): string {
  return JSON.stringify(value);
}

function texts(b: NativeBindings): number {
  if (b.testGetBidiTextCount === undefined) {
    throw new Error('the debug hook is missing: the unicode tests need a debug build of the native module');
  }
  return b.testGetBidiTextCount();
}

// Frees what nothing refers to any more; two rounds, as a buffer's memory is freed in the sweep that
// follows the one that found the buffer dead.
function collect(b: NativeBindings): void {
  b.testCollectGarbage?.();
  b.testCollectGarbage?.();
}

const runPairs = (runs: Iterable<BidiRun>): number[][] => [...runs].map((run) => [run.startIndex, run.endIndex, run.embeddingLevel]);
const scriptPairs = (runs: Iterable<ScriptRun>): number[][] => [...runs].map((run) => [run.startIndex, run.endIndex, run.script]);

function units(text: string): Uint16Array {
  const array = new Uint16Array(text.length);
  for (let index = 0; index < text.length; index++) {
    array[index] = text.charCodeAt(index);
  }
  return array;
}

const INVALID = 0xffffffff;

const tests: [string, (b: NativeBindings) => void][] = [
  ['SheenBidi is linked and its version is read', (b) => {
    check(/^\d+\.\d+\.\d+/.test(b.SBVersionGetString()), `version ${b.SBVersionGetString()}`);
  }],

  ['a paragraph resolves the levels and the logical runs of mixed text', () => {
    const algorithm = new BidiAlgorithm(`abc ${ARABIC} def`);
    const paragraph = algorithm.createParagraph(0, 11, BaseDirection.DefaultLeftToRight);
    check(paragraph.startIndex === 0 && paragraph.endIndex === 11 && paragraph.baseLevel === 0, 'the extent and the base level');
    check(same(paragraph.charLevels.toArray(), [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0]), describe(paragraph.charLevels.toArray()));
    const runs = [...paragraph.logicalRuns];
    check(same(runPairs(runs), [[0, 4, 0], [4, 7, 1], [7, 11, 0]]), describe(runPairs(runs)));
    check(runs[1]?.isRightToLeft === true && runs[0]?.isRightToLeft === false, 'only the Arabic run is right-to-left');
    check(algorithm.charBidiClasses.length === 11, 'a bidi class for each character');
    check(algorithm.charBidiClasses.get(0) === BidiClass.LeftToRight && algorithm.charBidiClasses.get(4) === BidiClass.RightToLeftArabic, 'the classes');
    paragraph.dispose();
    algorithm.dispose();
  }],

  ['the base direction is found, forced or given as a level', () => {
    const owned: { dispose(): void }[] = [];
    try {
      const algorithm = new BidiAlgorithm(`${ARABIC} abc`);
      owned.push(algorithm);
      const detected = algorithm.createParagraph(0, 7, BaseDirection.DefaultLeftToRight);
      const forced = algorithm.createParagraph(0, 7, BaseDirection.LeftToRight);
      const level = algorithm.createParagraph(0, 7, 2);
      owned.push(detected, forced, level);
      check(detected.baseLevel === 1 && forced.baseLevel === 0 && level.baseLevel === 2, `${detected.baseLevel} ${forced.baseLevel} ${level.baseLevel}`);

      // Digits are not strong, so no character decides and the default of the request is used.
      const neutral = new BidiAlgorithm('123');
      owned.push(neutral);
      const rtl = neutral.createParagraph(0, 3, BaseDirection.DefaultRightToLeft);
      const ltr = neutral.createParagraph(0, 3, BaseDirection.DefaultLeftToRight);
      owned.push(rtl, ltr);
      check(rtl.baseLevel === 1 && ltr.baseLevel === 0, `without a strong character: ${rtl.baseLevel} ${ltr.baseLevel}`);
    } finally {
      for (const object of owned.reverse()) {
        object.dispose();
      }
    }
  }],

  ['paragraph boundaries follow the separators', () => {
    const algorithm = new BidiAlgorithm('ab\ncd\r\nef');
    check(algorithm.getParagraphBoundary(0, 9) === 3, 'after the line feed');
    check(algorithm.getParagraphBoundary(3, 9) === 7, 'after CR LF as one separator');
    check(algorithm.getParagraphBoundary(7, 9) === 9, 'the end of the text');
    check(algorithm.getParagraphBoundary(0, 2) === 2, 'the suggested end');
    const second = algorithm.createParagraph(3, 5, BaseDirection.LeftToRight);
    check(second.startIndex === 3 && second.endIndex === 5, 'a paragraph from the middle');
    const first = algorithm.createParagraph(0, 9, BaseDirection.LeftToRight);
    check(first.endIndex === 3, 'a paragraph ends at its first separator');
    second.dispose();
    first.dispose();
    algorithm.dispose();
  }],

  ['a line orders its runs visually and a part of it has its own', () => {
    const algorithm = new BidiAlgorithm(`${ARABIC} abc`);
    const paragraph = algorithm.createParagraph(0, 7, BaseDirection.RightToLeft);
    const line = paragraph.createLine(0, 7);
    check(line.startIndex === 0 && line.endIndex === 7, 'the extent of the line');
    check(line.visualRuns.length === 2, 'two runs');
    const runs = line.visualRuns.toArray();
    check(same(runPairs(runs), [[4, 7, 2], [0, 4, 1]]), describe(runPairs(runs)));
    check(line.visualRuns.get(0).equals(new BidiRun(4, 7, 2)), 'a run equals one made by hand');
    expectThrows(() => line.visualRuns.get(2), /./, 'RangeError');

    const part = paragraph.createLine(4, 7);
    check(same(runPairs(part.visualRuns.toArray()), [[4, 7, 2]]), 'a line of the Latin part');
    part.dispose();
    line.dispose();
    paragraph.dispose();
    algorithm.dispose();
  }],

  ['the characters to mirror are listed in logical order', () => {
    const text = `${ARABIC} (${ARABIC})`;
    const algorithm = new BidiAlgorithm(text);
    const paragraph = algorithm.createParagraph(0, 9, BaseDirection.RightToLeft);
    const line = paragraph.createLine(0, 9);
    const pairs = [...line.mirroringPairs];
    check(same(pairs, [{ charIndex: 4, actualCodePoint: 0x28, pairingCodePoint: 0x29 }, { charIndex: 8, actualCodePoint: 0x29, pairingCodePoint: 0x28 }]), describe(pairs));
    check(pairs[0]?.equals(new BidiPair(4, 0x28, 0x29)) === true, 'a pair equals one made by hand');
    // The iteration can be started again, and stopped early without leaving a locator behind.
    for (const pair of line.mirroringPairs) {
      check(pair.charIndex === 4, 'the first pair');
      break;
    }
    check([...line.mirroringPairs].length === 2, 'iterated again');

    const latin = new BidiAlgorithm('a (b)');
    const latinLine = latin.createParagraph(0, 5, BaseDirection.LeftToRight).createLine(0, 5);
    check([...latinLine.mirroringPairs].length === 0, 'left-to-right text has nothing to mirror');
    for (const object of [latinLine, line, paragraph, algorithm, latin]) {
      object.dispose();
    }
  }],

  ['the text copy lives as long as the algorithm, a paragraph or a line of it', (b) => {
    collect(b);
    const baseline = texts(b);
    const text = `${ARABIC} (${ARABIC})`;
    const algorithm = new BidiAlgorithm(text);
    const paragraph = algorithm.createParagraph(0, 9, BaseDirection.RightToLeft);
    const line = paragraph.createLine(0, 9);
    check(texts(b) === baseline + 1, `one copy is shared by the three, ${texts(b) - baseline} found`);

    algorithm.dispose();
    check(texts(b) === baseline + 1, 'the paragraph keeps the copy after the algorithm is disposed');
    paragraph.dispose();
    check(texts(b) === baseline + 1, 'the line keeps the copy after the paragraph is disposed');

    // The mirror locator reads characters from the copy, which is freed if the line lost it.
    check([...line.mirroringPairs].length === 2, 'the line still reads its text');
    check(line.visualRuns.length === 1, 'and its runs');
    line.dispose();
    check(texts(b) === baseline, 'the last one frees it');
  }],

  ['a retained handle keeps the text and the object after the first handle is disposed', (b) => {
    collect(b);
    const baseline = texts(b);
    const algorithm = new BidiAlgorithm('abc');
    const retained = b.SBAlgorithmRetain(algorithm.nativeHandle);
    check(b.handleEquals(algorithm.nativeHandle, retained), 'both handles are one object');
    algorithm.dispose();
    check(texts(b) === baseline + 1, 'the retained handle keeps the copy');

    const paragraph = b.SBAlgorithmCreateParagraph(retained, 0, 3, 0) as Handle<'SBParagraph'>;
    check(paragraph !== undefined && b.SBParagraphGetLength(paragraph) === 3, 'the retained handle still makes paragraphs');
    b.disposeHandle(retained);
    check(texts(b) === baseline + 1, 'the paragraph keeps it');
    const retainedParagraph = b.SBParagraphRetain(paragraph);
    b.disposeHandle(paragraph);
    const line = b.SBParagraphCreateLine(retainedParagraph, 0, 3) as Handle<'SBLine'>;
    b.disposeHandle(retainedParagraph);
    const retainedLine = b.SBLineRetain(line);
    b.disposeHandle(line);
    check(b.SBLineGetLength(retainedLine) === 3 && texts(b) === baseline + 1, 'the chain of retains is intact');
    b.disposeHandle(retainedLine);
    check(texts(b) === baseline, 'everything is freed');
  }],

  ['lists keep the owner readable until it is disposed, and fail after', (b) => {
    collect(b);
    const baseline = texts(b);
    // In a function of its own, so that nothing of it is reachable when the garbage is collected.
    (() => {
      const algorithm = new BidiAlgorithm('abc def');
      const paragraph = algorithm.createParagraph(0, 7, BaseDirection.LeftToRight);
      const classes = algorithm.charBidiClasses;
      const levels = paragraph.charLevels;
      check(classes.length === 7 && levels.length === 7, 'the lengths');
      check(classes.get(3) === BidiClass.WhiteSpace, 'a class is read');
      algorithm.dispose();
      check(levels.toArray().length === 7, 'the levels do not depend on the algorithm');
      expectThrows(() => classes.get(0), /already disposed/);
      expectThrows(() => algorithm.charBidiClasses, /already disposed/);
      paragraph.dispose();
      expectThrows(() => levels.get(0), /already disposed/);
      expectThrows(() => paragraph.baseLevel, /already disposed/);
    })();
    collect(b);
    check(texts(b) === baseline, `the copy is freed once the buffers of the lists are, ${texts(b) - baseline} left`);
  }],

  ['use after dispose fails everywhere, and disposing twice does nothing', () => {
    const algorithm = new BidiAlgorithm('abc');
    const paragraph = algorithm.createParagraph(0, 3, 0);
    const line = paragraph.createLine(0, 3);
    for (const object of [line, paragraph, algorithm]) {
      object.dispose();
      object.dispose();
      check(object.isDisposed, 'disposed');
    }
    expectThrows(() => algorithm.getParagraphBoundary(0, 3), /already disposed/);
    expectThrows(() => algorithm.createParagraph(0, 3, 0), /already disposed/);
    expectThrows(() => paragraph.createLine(0, 3), /already disposed/);
    expectThrows(() => paragraph.endIndex, /already disposed/);
    expectThrows(() => line.endIndex, /already disposed/);
    expectThrows(() => line.visualRuns, /already disposed/);
    expectThrows(() => [...line.mirroringPairs], /already disposed/);
  }],

  ['ranges and bases that are not valid are refused with a RangeError', (b) => {
    const algorithm = new BidiAlgorithm('abcde');
    const paragraph = algorithm.createParagraph(1, 4, 0);
    expectThrows(() => new BidiAlgorithm(''), /empty/, 'RangeError');
    for (const [from, to] of [[-1, 2], [0, 6], [2, 2], [3, 2], [0.5, 2]]) {
      expectThrows(() => algorithm.getParagraphBoundary(from as number, to as number), /range/, 'RangeError');
      expectThrows(() => algorithm.createParagraph(from as number, to as number, 0), /range/, 'RangeError');
    }
    for (const [from, to] of [[0, 3], [1, 5], [2, 2], [3, 2]]) {
      expectThrows(() => paragraph.createLine(from as number, to as number), /range/, 'RangeError');
    }
    for (const base of [125, 126, 0x80, 0xfc, 0xff, -1, 1.5, Number.NaN]) {
      expectThrows(() => algorithm.createParagraph(0, 5, base), /base/, 'RangeError');
    }
    // The bindings refuse them too, whoever calls them.
    const handle = algorithm.nativeHandle;
    expectThrows(() => b.SBAlgorithmCreateParagraph(handle, 0, 5, 125), /baseLevel/, 'RangeError');
    expectThrows(() => b.SBAlgorithmCreateParagraph(handle, 0, 5, 126), /baseLevel/, 'RangeError');
    expectThrows(() => b.SBAlgorithmCreateParagraph(handle, 0, 5, 256), /baseLevel/, 'RangeError');
    expectThrows(() => b.SBAlgorithmCreateParagraph(handle, 0, 5, 1.5), /baseLevel/, 'RangeError');
    expectThrows(() => b.SBAlgorithmCreateParagraph(handle, 1.5, 5, 0), /paragraphOffset/, 'RangeError');
    expectThrows(() => b.SBAlgorithmCreateParagraph(handle, 0, 5, '0' as unknown as number), /baseLevel/, 'Error');
    paragraph.dispose();
    algorithm.dispose();
  }],

  ['ranges that SheenBidi clamps or refuses never reach outside of the text', (b) => {
    const algorithm = new BidiAlgorithm('abc');
    const handle = algorithm.nativeHandle;
    check(b.SBAlgorithmCreateParagraph(handle, 10, 3, 0) === undefined, 'a paragraph past the end is nothing');
    check(b.SBAlgorithmCreateParagraph(handle, 0, 0, 0) === undefined, 'an empty paragraph is nothing');
    check(b.SBAlgorithmCreateParagraph(handle, -1, 3, 0) === undefined, 'TRInvalidIndex is an offset past the end');
    const bounds = b.SBAlgorithmGetParagraphBoundary(handle, 100, 5);
    check(bounds.actualLength <= 5, 'a boundary past the end stays small');
    const paragraph = b.SBAlgorithmCreateParagraph(handle, 0, 100, 0) as Handle<'SBParagraph'>;
    check(b.SBParagraphGetLength(paragraph) === 3, 'a suggested length past the end is clamped');
    for (const [offset, length] of [[0, 4], [-1, 1], [2, 5], [3, 1], [0, 0], [1, -1]]) {
      check(b.SBParagraphCreateLine(paragraph, offset as number, length as number) === undefined, `line ${offset}+${length}`);
    }
    b.disposeHandle(paragraph);
    algorithm.dispose();
  }],

  ['handles of the wrong kind, disposed handles and other values are refused', (b) => {
    const algorithm = new BidiAlgorithm('abc');
    const paragraph = algorithm.createParagraph(0, 3, 0);
    expectThrows(() => b.SBLineGetLength(algorithm.nativeHandle as unknown as Handle<'SBLine'>), /SBLine handle, not SBAlgorithm/, 'Error');
    expectThrows(() => b.SBParagraphGetLength(undefined as unknown as Handle<'SBParagraph'>), /must not be null or undefined/, 'Error');
    expectThrows(() => b.SBParagraphGetLength({} as unknown as Handle<'SBParagraph'>), /not a Tehreer handle/, 'Error');
    expectThrows(() => b.SBAlgorithmCreate(5 as unknown as string), /must be a string/, 'Error');
    const locator = b.SBMirrorLocatorCreate() as Handle<'SBMirrorLocator'>;
    expectThrows(() => b.SBMirrorLocatorLoadLine(locator, algorithm.nativeHandle as unknown as Handle<'SBLine'>), /SBLine handle/, 'Error');
    b.disposeHandle(locator);
    check(b.SBAlgorithmCreate('') === undefined, 'an empty text makes no algorithm');
    const handle = paragraph.nativeHandle;
    paragraph.dispose();
    expectThrows(() => b.SBParagraphGetLength(handle), /already disposed/, 'Error');
    algorithm.dispose();
  }],

  ['a text with unpaired surrogates is analysed without harm', () => {
    const algorithm = new BidiAlgorithm('a\uD800b\uDC00c');
    const paragraph = algorithm.createParagraph(0, 5, BaseDirection.DefaultLeftToRight);
    check(paragraph.charLevels.length === 5 && paragraph.endIndex === 5, 'every code unit has a level');
    const classifier = new ScriptClassifier('a\uD800b\uDC00c');
    check(classifier.charScripts.length === 5, 'and a script');
    paragraph.dispose();
    algorithm.dispose();
  }],

  ['a classifier resolves the script of each character and its runs', () => {
    const text = `abc ${ARABIC} 12`;
    const classifier = new ScriptClassifier(text);
    check(classifier.text === text && classifier.charScripts.length === 10, 'the text and the length');
    check(same(scriptPairs(classifier.scriptRuns), [[0, 4, Script.Latin], [4, 10, Script.Arabic]]), describe(scriptPairs(classifier.scriptRuns)));
    check(same(scriptPairs(classifier.getScriptRuns(2, 6)), [[2, 4, Script.Latin], [4, 6, Script.Arabic]]), 'a part of the text');
    check(same([...classifier.getScriptRuns(5, 5)], []), 'an empty range has no runs');
    check(classifier.charScripts.slice(3, 6).toArray().length === 3 && classifier.charScripts.toTypedArray() instanceof Uint8Array, 'slices and copies');
    expectThrows(() => classifier.getScriptRuns(3, 11), /range/, 'RangeError');
    expectThrows(() => classifier.getScriptRuns(6, 3), /range/, 'RangeError');
    check(new ScriptRun(0, 4, Script.Latin).equals(new ScriptRun(0, 4, Script.Latin)), 'runs compare');
  }],

  ['a classifier counts surrogate pairs as the one character that they are', () => {
    const classifier = new ScriptClassifier('a\u{1F600}b');
    check(classifier.charScripts.length === 4, 'four code units');
    check(classifier.charScripts.get(0) === Script.Latin && classifier.charScripts.get(3) === Script.Latin, 'the letters');
    check(classifier.charScripts.get(1) === classifier.charScripts.get(2), 'both halves of the pair have the script of the character');

    const empty = new ScriptClassifier('');
    check(empty.charScripts.length === 0 && [...empty.scriptRuns].length === 0, 'an empty text');
  }],

  ['a script locator keeps the text it was loaded with, and replaces it on the next load', (b) => {
    collect(b);
    const baseline = texts(b);
    const locator = b.SBScriptLocatorCreate() as Handle<'SBScriptLocator'>;
    check(texts(b) === baseline, 'a locator has no text before it is loaded');
    b.SBScriptLocatorLoadCodepoints(locator, 'abc');
    b.SBScriptLocatorLoadCodepoints(locator, `${ARABIC}d`);
    check(texts(b) === baseline + 1, 'the first text is let go when the second is loaded');

    const found: number[][] = [];
    while (b.SBScriptLocatorMoveNext(locator)) {
      const agent = b.SBScriptLocatorGetAgent(locator);
      found.push([agent.offset, agent.length, agent.script]);
    }
    check(same(found, [[0, 3, Script.Arabic], [3, 1, Script.Latin]]), describe(found));
    // The call that returned false reset the locator (documented by SheenBidi), so its agent is empty.
    const reset = b.SBScriptLocatorGetAgent(locator);
    check(reset.offset === 0 && reset.length === 0, `the locator is reset after the last run: ${describe(reset)}`);
    b.SBScriptLocatorReset(locator);
    check(b.SBScriptLocatorMoveNext(locator) && b.SBScriptLocatorGetAgent(locator).offset === 0, 'and can start again');

    const retained = b.SBScriptLocatorRetain(locator);
    b.disposeHandle(locator);
    check(texts(b) === baseline + 1, 'the retained handle keeps the text');
    b.disposeHandle(retained);
    check(texts(b) === baseline, 'the last handle frees it');
    expectThrows(() => b.SBScriptLocatorLoadCodepoints(locator, 'a'), /already disposed/, 'Error');
  }],

  ['a mirror locator keeps the line and its text after every other handle is disposed', (b) => {
    collect(b);
    const baseline = texts(b);
    const algorithm = new BidiAlgorithm(`${ARABIC} (${ARABIC})`);
    const paragraph = algorithm.createParagraph(0, 9, BaseDirection.RightToLeft);
    const line = paragraph.createLine(0, 9);
    const locator = b.SBMirrorLocatorCreate() as Handle<'SBMirrorLocator'>;
    check(!b.SBMirrorLocatorMoveNext(locator), 'an empty locator finds nothing');
    b.SBMirrorLocatorLoadLine(locator, line.nativeHandle);
    line.dispose();
    paragraph.dispose();
    algorithm.dispose();
    check(texts(b) === baseline + 1, 'the locator keeps the copy');

    const found: number[][] = [];
    while (b.SBMirrorLocatorMoveNext(locator)) {
      const agent = b.SBMirrorLocatorGetAgent(locator);
      found.push([agent.index, agent.codepoint, agent.mirror]);
    }
    check(same(found, [[4, 0x28, 0x29], [8, 0x29, 0x28]]), describe(found));
    b.SBMirrorLocatorReset(locator);
    check(b.SBMirrorLocatorMoveNext(locator), 'a reset starts again');

    b.SBMirrorLocatorLoadLine(locator, undefined);
    check(texts(b) === baseline && !b.SBMirrorLocatorMoveNext(locator), 'unloading frees the copy');
    b.disposeHandle(locator);
  }],

  ['a mirror locator that holds no line can be disposed, retained and collected', (b) => {
    // SheenBidi's finalizer of a mirror locator releases its line without a NULL check, so the
    // binding keeps a line in every locator; these are the paths that would have crashed.
    const unloaded = b.SBMirrorLocatorCreate() as Handle<'SBMirrorLocator'>;
    check(!b.SBMirrorLocatorMoveNext(unloaded), 'an unloaded locator finds nothing');
    b.disposeHandle(unloaded);

    const algorithm = new BidiAlgorithm(`${ARABIC} (${ARABIC})`);
    const line = algorithm.createParagraph(0, 9, BaseDirection.RightToLeft).createLine(0, 9);
    const unloadedAgain = b.SBMirrorLocatorCreate() as Handle<'SBMirrorLocator'>;
    b.SBMirrorLocatorLoadLine(unloadedAgain, line.nativeHandle);
    check(b.SBMirrorLocatorMoveNext(unloadedAgain), 'a loaded locator finds a mirror');
    b.SBMirrorLocatorLoadLine(unloadedAgain, undefined);
    check(!b.SBMirrorLocatorMoveNext(unloadedAgain), 'an unloaded one finds none');
    b.SBMirrorLocatorLoadLine(unloadedAgain, undefined);
    b.disposeHandle(unloadedAgain);
    line.dispose();
    algorithm.dispose();

    const first = b.SBMirrorLocatorCreate() as Handle<'SBMirrorLocator'>;
    const second = b.SBMirrorLocatorRetain(first);
    b.disposeHandle(first);
    check(!b.SBMirrorLocatorMoveNext(second), 'the retained handle of an unloaded locator works');
    b.disposeHandle(second);

    // Abandoned ones are released by the finalizer, which runs on any thread.
    (() => {
      for (let index = 0; index < 20; index++) {
        const locator = b.SBMirrorLocatorCreate() as Handle<'SBMirrorLocator'>;
        if (index % 2 === 0) {
          b.SBMirrorLocatorLoadLine(locator, undefined);
        }
      }
    })();
    collect(b);
    check(b.smokeTest(), 'the process is still alive after the collection');
  }],

  ['the properties of code points', () => {
    check(CodePoint.getBidiClass(0x61) === BidiClass.LeftToRight && CodePoint.getBidiClass(0x627) === BidiClass.RightToLeftArabic, 'bidi classes');
    check(CodePoint.getBidiClass(0x5d0) === BidiClass.RightToLeft && CodePoint.getBidiClass(0x20) === BidiClass.WhiteSpace, 'more bidi classes');
    check(CodePoint.getGeneralCategory(0x41) === GeneralCategory.UppercaseLetter && CodePoint.getGeneralCategory(0x20) === GeneralCategory.SpaceSeparator, 'general categories');
    check(CodePoint.getScript(0x627) === Script.Arabic && CodePoint.getScript(0x61) === Script.Latin, 'scripts');
    check(CodePoint.getMirror(0x28) === 0x29 && CodePoint.getMirror(0x29) === 0x28 && CodePoint.getMirror(0x61) === 0, 'mirrors');
    check(CodePoint.getScript(0x1f600) === Script.Common && CodePoint.getBidiClass(0x110000) === BidiClass.OtherNeutral, 'astral and out of range');
    expectThrows(() => CodePoint.getScript(-1), /codepoint/, 'RangeError');
    expectThrows(() => CodePoint.getScript(0x100000000), /codepoint/, 'RangeError');
    expectThrows(() => CodePoint.getScript(1.5), /codepoint/, 'RangeError');
  }],

  ['scripts know their tags', () => {
    check(Script.getOpenTypeTag(Script.Arabic) === SfntTag.make('arab'), 'the OpenType tag of Arabic');
    check(Script.getOpenTypeTag(Script.Devanagari) === SfntTag.make('dev2'), 'the latest tag of Devanagari');
    check(Script.getUnicodeTag(Script.Arabic) === SfntTag.make('Arab'), 'the Unicode tag of Arabic');
    check(Script.getUnicodeTag(Script.Common) >= 0 && Script.getOpenTypeTag(Script.Common) >= 0, 'tags are unsigned');
    expectThrows(() => Script.getUnicodeTag(256 as Script), /script/, 'RangeError');
  }],

  ['code points are decoded from UTF-16 one at a time, surrogate pairs and faulty units included', (b) => {
    const text = 'a\u{1F600}\uD800b';
    const buffer = units(text);
    check(buffer.length === 5, 'five code units');

    const forward: number[][] = [];
    let index = 0;
    for (let guard = 0; guard < 10; guard++) {
      const decoded = b.SBCodepointDecodeNextFromUTF16(buffer, buffer.length, index);
      forward.push([decoded.result, decoded.index]);
      if (decoded.result === INVALID) {
        break;
      }
      index = decoded.index;
    }
    check(same(forward, [[0x61, 1], [0x1f600, 3], [0xfffd, 4], [0x62, 5], [INVALID, 5]]), describe(forward));

    const backward: number[][] = [];
    index = buffer.length;
    for (let guard = 0; guard < 10; guard++) {
      const decoded = b.SBCodepointDecodePreviousFromUTF16(buffer, buffer.length, index);
      backward.push([decoded.result, decoded.index]);
      if (decoded.result === INVALID) {
        break;
      }
      index = decoded.index;
    }
    check(same(backward, [[0x62, 4], [0xfffd, 3], [0x1f600, 1], [0x61, 0], [INVALID, 0]]), describe(backward));

    // A JavaScript string goes in as it is.
    check(same(b.SBCodepointSequenceGetCodepointAt('a\u{1F600}', 1), { result: 0x1f600, index: 3 }), 'a pair at its first unit');
    check(same(b.SBCodepointSequenceGetCodepointBefore('a\u{1F600}', 3), { result: 0x1f600, index: 1 }), 'a pair before its end');
    check(b.SBCodepointSequenceGetCodepointAt('ab', 2).result === INVALID, 'past the end');
    check(b.SBCodepointSequenceGetCodepointBefore('ab', 0).result === INVALID, 'before the start');
  }],

  ['code points are decoded from UTF-8, and a buffer is never read past its length', (b) => {
    const bytes = Uint8Array.from([0xe2, 0x82, 0xac, 0x61]);
    check(same(b.SBCodepointDecodeNextFromUTF8(bytes, 4, 0), { result: 0x20ac, index: 3 }), 'the euro sign');
    check(same(b.SBCodepointDecodePreviousFromUTF8(bytes, 4, 3), { result: 0x20ac, index: 0 }), 'and before it');
    check(b.SBCodepointDecodeNextFromUTF8(bytes, 2, 0).result === 0xfffd, 'a truncated sequence is faulty');
    check(b.SBCodepointDecodeNextFromUTF8(bytes, 4, 4).result === INVALID, 'the end is invalid');
    expectThrows(() => b.SBCodepointDecodeNextFromUTF8(bytes, 4, -1), /index/, 'RangeError');
    expectThrows(() => b.SBCodepointDecodeNextFromUTF8(bytes, 4, 5), /index/, 'RangeError');
    expectThrows(() => b.SBCodepointDecodePreviousFromUTF16(units('ab'), 2, 3), /index/, 'RangeError');
    expectThrows(() => b.SBCodepointSequenceGetCodepointAt('ab', 3), /stringIndex/, 'RangeError');
    expectThrows(() => b.SBCodepointSequenceGetCodepointBefore('ab', -1), /stringIndex/, 'RangeError');
    check(b.SBCodepointDecodePreviousFromUTF8(bytes, 4, 4).result === 0x61, 'the end is a valid position to decode before');

    expectThrows(() => b.SBCodepointDecodeNextFromUTF8(bytes, 5, 0), /length/, 'RangeError');
    expectThrows(() => b.SBCodepointDecodeNextFromUTF8(bytes, -1, 0), /length/, 'RangeError');
    expectThrows(() => b.SBCodepointDecodeNextFromUTF16(units('ab'), 3, 0), /length/, 'RangeError');
    expectThrows(() => b.SBCodepointDecodePreviousFromUTF16(new ArrayBuffer(4), 3, 3), /length/, 'RangeError');
    expectThrows(() => b.SBCodepointDecodeNextFromUTF8('ab' as unknown as ArrayBuffer, 2, 0), /buffer/);
    // A view at an odd address cannot be read as UTF-16.
    const odd = new Uint8Array(new ArrayBuffer(8), 1, 4);
    expectThrows(() => b.SBCodepointDecodeNextFromUTF16(odd, 2, 0), /aligned/, 'RangeError');
  }],

  ['the runs of a line are read through the codec of SBRun', (b) => {
    const algorithm = new BidiAlgorithm(`${ARABIC} abc`);
    const line = algorithm.createParagraph(0, 7, BaseDirection.RightToLeft).createLine(0, 7);
    const view = b.SBLineGetRunsPtr(line.nativeHandle);
    check(view !== undefined, 'a line has runs');
    const runs = b.readPointerStructs(view as never, b.SBLineGetRunCount(line.nativeHandle), 0, 2);
    check(same(runs, [{ offset: 4, length: 3, level: 2 }, { offset: 0, length: 4, level: 1 }]), describe(runs));
    expectThrows(() => b.readPointerStructs(view as never, 3, 0, 3), /./, 'RangeError');
    line.dispose();
    algorithm.dispose();
  }],

  ['long texts are analysed and classified', () => {
    const text = `abc ${ARABIC} `.repeat(5000);
    const algorithm = new BidiAlgorithm(text);
    const paragraph = algorithm.createParagraph(0, text.length, BaseDirection.DefaultLeftToRight);
    check(paragraph.endIndex === text.length && paragraph.charLevels.length === text.length, 'one paragraph of the whole text');
    const line = paragraph.createLine(0, text.length);
    check(line.visualRuns.length >= 10000, `${line.visualRuns.length} runs`);
    const classifier = new ScriptClassifier(text);
    check([...classifier.scriptRuns].length === 10000, 'a run for each word');
    line.dispose();
    paragraph.dispose();
    algorithm.dispose();
  }],

  ['objects that are made and disposed in a loop leave no text behind', (b) => {
    collect(b);
    const baseline = texts(b);
    for (let index = 0; index < 300; index++) {
      const algorithm = new BidiAlgorithm(`abc ${ARABIC} ${index}`);
      const paragraph = algorithm.createParagraph(0, algorithm.charBidiClasses.length, BaseDirection.DefaultLeftToRight);
      const line = paragraph.createLine(paragraph.startIndex, paragraph.endIndex);
      [...line.mirroringPairs];
      line.dispose();
      paragraph.dispose();
      algorithm.dispose();
    }
    collect(b);
    check(texts(b) === baseline, `${texts(b) - baseline} texts are left`);
  }],

  ['objects that are never disposed are collected without harm', (b) => {
    collect(b);
    const baseline = texts(b);
    (() => {
      for (let index = 0; index < 20; index++) {
        const algorithm = new BidiAlgorithm(`${ARABIC} (${index})`);
        const length = algorithm.charBidiClasses.length;
        const line = algorithm.createParagraph(0, length, BaseDirection.RightToLeft).createLine(0, length);
        void line.visualRuns.get(0);
      }
    })();
    collect(b);
    check(texts(b) === baseline, `${texts(b) - baseline} texts are left after the collection`);
    check(b.smokeTest(), 'Core still works');
  }],

  ['SBRun is one of the structs that are converted', (b) => {
    check(b.testGetStructNames?.().includes('SBRun') === true, 'the struct names include SBRun');
  }],
];

export function runUnicodeTests(bindings: NativeBindings): { passed: number; failures: string[] } {
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

export const unicodeTestCount = tests.length;
