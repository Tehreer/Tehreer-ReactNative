import type { NativeBindings } from '../../src/internal/NativeBindings';
import { FontFile } from '../../src/graphics/FontFile';
import { Renderer } from '../../src/graphics/Renderer';
import type { Typeface } from '../../src/graphics/Typeface';
import { List } from '../../src/collections/List';
import { ComposedFrame } from '../../src/layout/ComposedFrame';
import { ComposedLine } from '../../src/layout/ComposedLine';
import { BreakMode, ReplacementKind, TextAlignment, TruncationPlace, VerticalAlignment } from '../../src/layout/enums';
import { FrameResolver } from '../../src/layout/FrameResolver';
import { GlyphRun } from '../../src/layout/GlyphRun';
import { LineLocator } from '../../src/layout/LineLocator';
import { Replacement } from '../../src/layout/Replacement';
import { TMutableText } from '../../src/layout/TMutableText';
import { Typesetter } from '../../src/layout/Typesetter';
import { WritingDirection } from '../../src/sfnt/enums';
import { fontBytes as robotoBytes } from './fontData';
import { layoutExpected } from './layoutExpected';
import { frameScenarios, measure, measureTypesetter } from './layoutScenarios';
import type { Faces } from './layoutScenarios';
import { nastaliqFontBytes } from './nastaliqFontData';

// The suite of issue #21: Typesetter, FrameResolver, ComposedFrame, ComposedLine, GlyphRun,
// LineLocator and Replacement against the real bindings, on the fixtures of Core. The geometry of the
// scenario matrix (layoutScenarios.ts) is compared with `layoutExpected.ts`, which is what Tehreer-Web
// gives for the same inputs; the rest checks ownership, disposal, callbacks and invalid input.

export interface TestResult {
  passed: number;
  failures: string[];
}

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

/** Equal, with a small tolerance for floats: Core is built by another compiler for the reference. */
function compare(actual: unknown, expected: unknown, path: string, differences: string[]): void {
  if (differences.length >= 5) {
    return;
  }
  if (typeof expected === 'number' && typeof actual === 'number') {
    if (!(Math.abs(actual - expected) <= 0.002 + 1e-6 * Math.abs(expected))) {
      differences.push(`${path}: ${actual} is not ${expected}`);
    }
  } else if (Array.isArray(expected) && Array.isArray(actual)) {
    if (actual.length !== expected.length) {
      differences.push(`${path}: ${actual.length} elements, expected ${expected.length}`);
      return;
    }
    expected.forEach((item, index) => compare(actual[index], item, `${path}[${index}]`, differences));
  } else if (typeof expected === 'object' && expected !== null && typeof actual === 'object' && actual !== null) {
    for (const key of Object.keys(expected)) {
      compare((actual as Record<string, unknown>)[key], (expected as Record<string, unknown>)[key], `${path}.${key}`, differences);
    }
  } else if (actual !== expected) {
    differences.push(`${path}: ${String(actual)} is not ${String(expected)}`);
  }
}

function load(): { faces: Faces; roboto: FontFile; nastaliq: FontFile } {
  const roboto = new FontFile(robotoBytes);
  const nastaliq = new FontFile(nastaliqFontBytes);
  return { roboto, nastaliq, faces: { roboto: roboto.typefaces.get(0), nastaliq: nastaliq.typefaces.get(0) } };
}

const library = {
  BreakMode, FrameResolver, LineLocator, Renderer, Replacement, ReplacementKind, TextAlignment, TMutableText,
  TruncationPlace, Typesetter, VerticalAlignment,
};

const TEXT = 'abc abc abc abc abc';
const room = { ascent: 12, descent: 4, extent: 30 };
// The glyph IDs of the second line of the first scenario, as Tehreer-Web has them (layoutExpected.ts).
const IDS_OF_LINE_1 = '1,2,3,0';

function makeTypesetter(face: Typeface, text = TEXT): Typesetter {
  return new Typesetter(text, { typeface: face, typeSize: 20 });
}

function makeFrame(face: Typeface, width = 70): { resolver: FrameResolver; typesetter: Typesetter; frame: ComposedFrame } {
  const typesetter = makeTypesetter(face);
  const resolver = new FrameResolver();
  resolver.typesetter = typesetter;
  resolver.frameWidth = width;
  resolver.frameHeight = 1000;
  return { resolver, typesetter, frame: resolver.createFrame(0, TEXT.length) };
}

type Test = [name: string, body: (b: NativeBindings) => void];

const matrix: Test[] = frameScenarios.map((scenario): Test => [
  `${scenario.name}: the frame geometry equals Tehreer-Web's`,
  () => {
    const { faces } = load();
    const differences: string[] = [];
    compare(measure(library, faces, scenario), layoutExpected[scenario.name], scenario.name, differences);
    check(differences.length === 0, differences.join('; '));
  },
]);

const tests: Test[] = [
  ...matrix,

  ['the typesetter alone (breaks, tokens, truncated and justified lines) equals Tehreer-Web', () => {
    const { faces } = load();
    const differences: string[] = [];
    compare(measureTypesetter(library, faces), layoutExpected['typesetter'], 'typesetter', differences);
    check(differences.length === 0, differences.join('; '));
  }],

  ['a resolver has the defaults of Core and keeps what is set', () => {
    const resolver = new FrameResolver();
    check(resolver.typesetter === undefined && resolver.maxLines === undefined, 'no typesetter and no limit');
    check(resolver.frameWidth > 1e30 && resolver.frameHeight > 1e30, 'the frame is unbounded');
    check(!resolver.fitsHorizontally && !resolver.fitsVertically && !resolver.isTruncationEnabled && !resolver.isJustificationEnabled, 'flags are off');
    check(resolver.textAlignment === TextAlignment.Leading && resolver.verticalAlignment === VerticalAlignment.Top, 'alignments');
    check(resolver.truncationMode === BreakMode.Line && resolver.truncationPlace === TruncationPlace.End, 'truncation');
    check(resolver.justificationLevel === 1 && resolver.lineHeightMultiplier === 1 && resolver.extraLineSpacing === 0, 'numbers');

    resolver.frameWidth = 123.5;
    resolver.frameHeight = 456.25;
    resolver.frameWidth = 10;
    check(resolver.frameWidth === 10 && resolver.frameHeight === 456.25, 'width and height keep each other');
    resolver.fitsHorizontally = true;
    resolver.fitsVertically = true;
    resolver.textAlignment = TextAlignment.Trailing;
    resolver.verticalAlignment = VerticalAlignment.Bottom;
    resolver.truncationMode = BreakMode.Character;
    resolver.truncationPlace = TruncationPlace.Middle;
    resolver.isTruncationEnabled = true;
    resolver.isJustificationEnabled = true;
    resolver.justificationLevel = 0.5;
    resolver.maxLines = 3;
    resolver.extraLineSpacing = 2;
    resolver.lineHeightMultiplier = 1.5;
    check(resolver.fitsHorizontally && resolver.fitsVertically && resolver.isTruncationEnabled && resolver.isJustificationEnabled, 'flags');
    check(resolver.textAlignment === TextAlignment.Trailing && resolver.verticalAlignment === VerticalAlignment.Bottom, 'alignments set');
    check(resolver.truncationMode === BreakMode.Character && resolver.truncationPlace === TruncationPlace.Middle, 'truncation set');
    check(resolver.justificationLevel === 0.5 && resolver.maxLines === 3 && resolver.extraLineSpacing === 2 && resolver.lineHeightMultiplier === 1.5, 'numbers set');
    resolver.maxLines = undefined;
    check(resolver.maxLines === undefined, 'no limit again');
    resolver.dispose();
  }],

  ['empty text: a typesetter exists, a line and a frame of nothing are a RangeError', () => {
    const { faces } = load();
    const typesetter = makeTypesetter(faces.roboto, '');
    check(typesetter.codeUnitCount === 0, 'no code units');
    expectThrows(() => typesetter.createSimpleLine(0, 0), 'RangeError');
    expectThrows(() => typesetter.suggestForwardBreak(0, 0, 10, BreakMode.Line), 'RangeError');
    const resolver = new FrameResolver();
    resolver.typesetter = typesetter;
    expectThrows(() => resolver.createFrame(0, 0), 'RangeError');
    resolver.dispose();
    typesetter.dispose();
  }],

  ['invalid input follows the mapping rules and reaches no Core call that would misread it', () => {
    const { faces } = load();
    const typesetter = makeTypesetter(faces.roboto);
    for (const [from, to] of [[-1, 3], [3, 2], [1.5, 3], [0, NaN], [4, 4]] as const) {
      expectThrows(() => typesetter.createSimpleLine(from, to), 'RangeError');
      expectThrows(() => typesetter.suggestBackwardBreak(from, to, 10, BreakMode.Line), 'RangeError');
    }
    expectThrows(() => typesetter.createSimpleLine(0, TEXT.length + 1), 'RangeError');
    expectThrows(() => typesetter.suggestForwardBreak(0, TEXT.length + 1, 10, BreakMode.Line), 'RangeError');
    expectThrows(() => typesetter.createSimpleLine(0, 3, NaN), 'RangeError', /layoutWidth/);
    expectThrows(() => typesetter.createTruncationToken(0, 3, 7 as TruncationPlace), 'RangeError');
    expectThrows(() => new Typesetter('abc'), 'Error', /typeface/);
    expectThrows(() => new Typesetter(5 as unknown as string), 'TypeError');

    const { resolver, frame } = makeFrame(faces.roboto);
    expectThrows(() => { resolver.maxLines = -1; }, 'RangeError');
    expectThrows(() => { resolver.textAlignment = 9 as TextAlignment; }, 'RangeError');
    expectThrows(() => { resolver.frameWidth = NaN; }, 'RangeError');
    expectThrows(() => resolver.createFrame(0, TEXT.length + 1), 'RangeError');
    check(frame.getLineIndexForCodeUnit(TEXT.length + 1) === -1, '-1 for a code unit with no line');
    expectThrows(() => frame.getLineIndexForCodeUnit(-1), 'RangeError');
    expectThrows(() => frame.getSelectionRects(0, TEXT.length + 1), 'RangeError');
    expectThrows(() => frame.lines.get(frame.lines.length), 'RangeError');

    const line = frame.lines.get(0);
    expectThrows(() => line.getCodeUnitDistance(TEXT.length), 'RangeError');
    expectThrows(() => line.getVisualEdges(0, TEXT.length), 'RangeError');
    expectThrows(() => line.computeInkBox({} as Renderer), 'TypeError');
    const run = line.runs.get(0);
    check(run.getClusterStart(TEXT.length) === -1, '-1 for a code unit that is not in the run');
    expectThrows(() => run.getCodeUnitDistance(TEXT.length), 'RangeError');

    const renderer = new Renderer();
    renderer.typeface = faces.roboto;
    renderer.typeSize = 20;
    const locator = new LineLocator(frame, renderer);
    expectThrows(() => locator.getLineBox(locator.lineCount), 'RangeError');
    expectThrows(() => locator.findLines({ x: 0, y: 0, width: -1, height: 5 }), 'RangeError');
    check(locator.getFirstLineIndexBelow(1e9) === -1, '-1 when no box reaches below');
    for (const object of [locator, renderer, run, line, frame, resolver, typesetter]) {
      object.dispose();
    }
  }],

  ['glyph run data are lazy lists of Core memory with the right element types', () => {
    const { faces } = load();
    const typesetter = makeTypesetter(faces.roboto);
    const line = typesetter.createSimpleLine(0, 3);
    const run = line.runs.get(0);
    check(run.glyphCount === 3 && run.writingDirection === WritingDirection.LeftToRight && !run.isBackward, 'run facts');
    const { glyphIds, glyphOffsets, glyphAdvances, clusterMap } = run;
    check(glyphIds instanceof List && glyphOffsets instanceof List && glyphAdvances instanceof List && clusterMap instanceof List, 'lists');
    check(glyphIds.length === 3 && glyphOffsets.length === 3 && glyphAdvances.length === 3 && clusterMap.length === 3, 'lengths');
    check(glyphIds.toArray().join() === '1,2,3', `the glyphs of a, b and c: ${glyphIds.toArray().join()}`);
    check(glyphAdvances.get(0) > 0 && glyphOffsets.get(0).x === 0, 'advances and offsets');
    check(clusterMap.toArray().join() === '0,1,2', 'one glyph for each code unit');
    check(glyphIds.slice(1).toArray().join() === '2,3', 'a slice');
    const advance = glyphAdvances.reduce((total, value) => total + value, 0);
    check(Math.abs(advance - run.width) < 0.01, 'the width is the sum of the advances');
    expectThrows(() => glyphIds.get(3), 'RangeError');
    const family = run.typeface;
    check(family !== undefined && family.familyName === 'Roboto', 'the typeface of the run');
    family?.dispose();
    check(run.replacement === undefined && run.foregroundColor === undefined && run.userData === 0, 'no replacement, color or user data');

    run.dispose();
    expectThrows(() => glyphIds.get(0), 'Error', /already disposed/);
    expectThrows(() => glyphAdvances.toArray(), 'Error', /already disposed/);
    expectThrows(() => run.glyphIds, 'Error', /already disposed/);
    line.dispose();
    typesetter.dispose();
  }],

  ['objects are independent of their parents: typeface, typesetter, resolver, frame, line, run in that order', () => {
    const { roboto, faces } = load();
    const typesetter = makeTypesetter(faces.roboto);
    const resolver = new FrameResolver();
    resolver.typesetter = typesetter;
    resolver.frameWidth = 70;
    const frame = resolver.createFrame(0, TEXT.length);
    const line = frame.lines.get(1);
    const run = line.runs.get(0);
    const ids = run.glyphIds;
    const expectedWidth = line.width;

    faces.roboto.dispose();
    roboto.dispose();
    typesetter.dispose();
    check(resolver.typesetter !== undefined, 'the resolver keeps its own reference to the typesetter');
    resolver.typesetter?.dispose();
    resolver.dispose();
    frame.dispose();
    check(line.width === expectedWidth && line.startIndex === 4, 'a line outlives its frame');
    check(ids.toArray().join() === IDS_OF_LINE_1, `a run outlives the frame, the typesetter and the typeface: ${ids.toArray().join()}`);
    check(run.typeface?.familyName === 'Roboto', 'and still has its typeface');
    line.dispose();
    check(run.glyphAdvances.length === 4, 'a run outlives its line');
    run.dispose();
  }],

  ['use after dispose throws in every class and dispose can be repeated', () => {
    const { faces } = load();
    const { resolver, typesetter, frame } = makeFrame(faces.roboto);
    const line = frame.lines.get(0);
    const run = line.runs.get(0);
    const renderer = new Renderer();
    renderer.typeface = faces.roboto;
    const locator = new LineLocator(frame, renderer);
    const replacement = new Replacement({ computeRoom: () => room });
    const uses: (() => unknown)[][] = [
      [() => typesetter.codeUnitCount, () => typesetter.createSimpleLine(0, 1), () => typesetter.suggestForwardBreak(0, 1, 5, 0)],
      [() => resolver.frameWidth, () => { resolver.frameWidth = 1; }, () => resolver.createFrame(0, 1), () => resolver.typesetter],
      [() => frame.width, () => frame.lines, () => frame.getSelectionRects(0, 1), () => frame.getLineIndexForCodeUnit(0)],
      [() => line.width, () => line.runs, () => line.getCodeUnitDistance(0), () => line.computeInkBox(renderer)],
      [() => run.width, () => run.glyphIds, () => run.typeface, () => run.getCodeUnitDistance(0)],
      [() => locator.lineCount, () => locator.getLineBox(0), () => locator.findLines({ x: 0, y: 0, width: 1, height: 1 })],
      [() => replacement.kind, () => replacement.computeRoom(1)],
    ];
    [typesetter, resolver, frame, line, run, locator, replacement].forEach((object, index) => {
      object.dispose();
      object.dispose();
      check(object.isDisposed, 'disposed');
      for (const use of uses[index] as (() => unknown)[]) {
        expectThrows(use, 'Error', /already disposed/);
      }
    });
    renderer.dispose();
  }],

  ['a locator keeps its frame and renderer until it is disposed', () => {
    const { faces } = load();
    const { resolver, typesetter, frame } = makeFrame(faces.roboto);
    const renderer = new Renderer();
    renderer.typeface = faces.roboto;
    renderer.typeSize = 20;
    const locator = new LineLocator(frame, renderer);
    const boxes = Array.from({ length: locator.lineCount }, (_, index) => locator.getLineBox(index));
    check(boxes.length === frame.lines.length && boxes.every((box, index) => index === 0 || box.y >= (boxes[index - 1] as typeof box).y), 'a box for each line, top down');
    const all = locator.findLines({ x: -10, y: -10, width: 1000, height: 1000 });
    check(all.join() === [0, 1, 2, 3, 4].join(), `all lines: ${all.join()}`);
    check(locator.findLines({ x: 0, y: (boxes[1] as { y: number }).y + 5, width: 1, height: 1 }).join() === '1', 'one line');

    frame.dispose();
    renderer.dispose();
    resolver.dispose();
    typesetter.dispose();
    check(locator.findLines({ x: -10, y: -10, width: 1000, height: 1000 }).length === 5, 'the locator works without the objects it was made with');
    locator.dispose();
    expectThrows(() => locator.lineCount, 'Error', /already disposed/);
  }],

  ['right to left text has a right to left paragraph, in lines of mixed runs in visual order', () => {
    const { faces } = load();
    const urdu = 'تحریر ایک متنی انجن ہے';
    const typesetter = new Typesetter(urdu, { typeface: faces.nastaliq, typeSize: 30 });
    const line = typesetter.createSimpleLine(0, urdu.length);
    check(line.paragraphLevel % 2 === 1, 'right to left paragraph');
    const run = line.runs.get(0);
    check(run.writingDirection === WritingDirection.RightToLeft && run.bidiLevel % 2 === 1 && run.isBackward, 'a backward run');
    check(Math.abs(line.getCodeUnitDistance(line.endIndex) - line.width) < 0.5, 'the end is at the width');
    check(line.getCodeUnitDistance(0) > 0, 'the start of a right to left line is at its right');
    check(run.clusterMap.length === urdu.length, 'a cluster map entry for each code unit');
    run.dispose();
    line.dispose();
    typesetter.dispose();
  }],

  ['a replacement is stored in a text attribute and read back as a wrapper over the same state', () => {
    const calls: number[] = [];
    const replacement = new Replacement({ computeRoom: (width) => { calls.push(width); return room; } }, ReplacementKind.Block);
    const text = new TMutableText('ab￼a');
    text.setAttributes(2, 3, { replacement });
    replacement.dispose();

    const run = text.getAttributeRun(2);
    const read = run?.attributes.replacement;
    check(read !== undefined && read.kind === ReplacementKind.Block, 'the replacement is read back');
    check(read?.computeRoom(77).extent === 30 && calls.join() === '77', 'asking the read wrapper asks the delegate');
    read?.dispose();
    check(text.getAttributeRun(0)?.attributes.replacement === undefined, 'the other code units have none');
    text.removeAttributes(2, 3, 'replacement');
    check(text.getAttributeRun(2)?.attributes.replacement === undefined, 'removed');
    text.dispose();
  }],

  ['replacement state lives while Core holds the replacement and is released when Core finalizes it', (b) => {
    const { faces } = load();
    const count = (): number => (b.testDrainHandlers?.(), (b.testGetHandlerCount as () => number).call(b));
    check(typeof b.testGetHandlerCount === 'function' && typeof b.testDrainHandlers === 'function', 'the handler hooks need a debug build');
    const before = count();
    const seen: number[] = [];
    let replacement: Replacement | undefined = new Replacement({ computeRoom: (width) => { seen.push(width); return { ...room, extent: width }; } }, ReplacementKind.Block);
    check(count() === before + 1, 'the handler is in the table');

    let text: TMutableText | undefined = new TMutableText('ab￼a');
    text.setAttributes(0, 2, { typeface: faces.roboto, typeSize: 20 });
    text.setAttributes(3, 4, { typeface: faces.roboto, typeSize: 20 });
    text.setAttributes(2, 3, { replacement });
    replacement.dispose();
    replacement = undefined;
    check(count() === before + 1, 'the text holds the replacement, so its state stays after the wrapper is disposed');

    const typesetter = new Typesetter(text);
    text.dispose();
    text = undefined;
    check(count() === before + 1, 'the typesetter holds it');
    check(seen.length > 0 && seen.every((width) => width === 0), `Core asked for the room with a layout width of 0 while it shaped: ${seen.join()}`);

    const resolver = new FrameResolver();
    resolver.typesetter = typesetter;
    resolver.frameWidth = 150;
    const frame = resolver.createFrame(0, 4);
    check(seen.includes(150), `and with the width of the frame while it laid out: ${seen.join()}`);
    const blockLine = frame.lines.get(1);
    const blockRun = blockLine.runs.get(0);
    const held = blockRun.replacement;
    check(blockLine.isBlock && held?.kind === ReplacementKind.Block && blockLine.width === 150, 'the line is the block');
    held?.dispose();

    typesetter.dispose();
    resolver.dispose();
    check(count() === before + 1, 'the frame still holds it');
    for (const object of [blockRun, blockLine, frame]) {
      object.dispose();
    }
    check(count() === before, 'the state is released when the last reference is');
  }],

  ['an error thrown from computeRoom is thrown by the call that made Core ask, and nothing leaks', (b) => {
    const { faces } = load();
    const count = (): number => (b.testDrainHandlers?.(), (b.testGetHandlerCount as () => number).call(b));
    const before = count();
    const boom = new Error('boom');
    const text = new TMutableText('ab￼a');
    text.setAttributes(0, 4, { typeface: faces.roboto, typeSize: 20 });

    const failing = new Replacement({ computeRoom: () => { throw boom; } });
    text.setAttributes(2, 3, { replacement: failing });
    let thrown: unknown;
    try {
      new Typesetter(text);
    } catch (e) {
      thrown = e;
    }
    check(thrown === boom, 'the typesetter creation threw the very value');
    check(failing.isDisposed === false, 'the wrapper is not disposed by the failure');
    let direct: unknown;
    try {
      failing.computeRoom(5);
    } catch (e) {
      direct = e;
    }
    check(direct === boom, 'computeRoom of the wrapper throws it too');
    failing.dispose();
    text.dispose();
    check(count() === before, 'the failed typesetter released its replacement');

    // A handler that fails only in the layout, where the width is not 0.
    const late = new Replacement({ computeRoom: (width) => { if (width > 0) { throw boom; } return room; } }, ReplacementKind.Block);
    const second = new TMutableText('ab￼a');
    second.setAttributes(0, 4, { typeface: faces.roboto, typeSize: 20 });
    second.setAttributes(2, 3, { replacement: late });
    const typesetter = new Typesetter(second);
    expectThrows(() => typesetter.createSimpleLine(0, 4, 50), 'Error', /boom/);
    const resolver = new FrameResolver();
    resolver.typesetter = typesetter;
    resolver.frameWidth = 100;
    let frameError: unknown;
    try {
      resolver.createFrame(0, 4);
    } catch (e) {
      frameError = e;
    }
    check(frameError === boom, 'the frame creation threw it');
    const intact = typesetter.createSimpleLine(0, 4, 0);
    check(intact.endIndex === 4, 'with a width of 0 it works, and the typesetter is intact');
    intact.dispose();

    // A room that is not a room is an error of the call as well.
    const bad = new Replacement({ computeRoom: () => ({ ascent: 'x' } as unknown as typeof room) });
    expectThrows(() => bad.computeRoom(1), 'TypeError');
    for (const object of [bad, late, resolver, typesetter, second]) {
      object.dispose();
    }
    check(count() === before, 'everything is released');
  }],

  ['truncation tokens and truncated lines have the range that Core documents', () => {
    const { faces } = load();
    const typesetter = makeTypesetter(faces.roboto);
    const token = typesetter.createTruncationToken(0, TEXT.length, TruncationPlace.End);
    check(token.width > 0 && token.startIndex === 0, 'the default token is an ellipsis, or dots');
    const whole = typesetter.createSimpleLine(0, TEXT.length);
    const truncated = typesetter.createTruncatedLine(0, TEXT.length, whole.width / 2, BreakMode.Line, TruncationPlace.End, token);
    check(truncated.isTruncated && truncated.startIndex === 0 && truncated.endIndex === TEXT.length, 'the whole range, truncated');
    const roomy = typesetter.createTruncatedLine(0, TEXT.length, whole.width * 2, BreakMode.Line, TruncationPlace.End, token);
    check(!roomy.isTruncated && Math.abs(roomy.width - whole.width) < 0.01, 'a line that fits is a simple line');
    expectThrows(() => typesetter.createTruncatedLine(0, TEXT.length, 10, BreakMode.Line, TruncationPlace.End, {} as ComposedLine), 'TypeError');
    for (const object of [token, whole, truncated, roomy, typesetter]) {
      object.dispose();
    }
  }],

  ['lines and runs that are never disposed are collected without harm', (b) => {
    const { faces } = load();
    for (let index = 0; index < 20; index++) {
      const { frame } = makeFrame(faces.roboto);
      const line = frame.lines.get(0);
      line.runs.get(0).glyphIds.toArray();
      new Replacement({ computeRoom: () => room });
    }
    check(typeof b.testCollectGarbage === 'function', 'testCollectGarbage is missing: this needs a debug build');
    b.testCollectGarbage?.();
    b.testDrainHandlers?.();
    check(b.smokeTest(), 'Core still works');
  }],

  ['the classes that only a layout makes cannot be made by the application', () => {
    expectThrows(() => new (ComposedFrame as unknown as new () => unknown)(), 'Error');
    expectThrows(() => new (ComposedLine as unknown as new () => unknown)(), 'Error');
    expectThrows(() => new (GlyphRun as unknown as new () => unknown)(), 'Error');
  }],
];

export function runLayoutTests(bindings: NativeBindings): TestResult {
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

export const layoutTestCount = tests.length;
