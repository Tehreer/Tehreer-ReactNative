import type { NativeBindings } from '../../src/internal/NativeBindings';
import type { Handle } from '../../src/internal/NativeFunctions';
import { adopt } from '../../src/internal/Adopt';
import { NativeObject } from '../../src/internal/NativeObject';
import { coreStructs } from '../../src/collections/CoreList';
import { FontFeatures } from '../../src/sfnt/FontFeatures';
import { SfntTag } from '../../src/sfnt/SfntTag';
import { ShapingEngine } from '../../src/sfnt/ShapingEngine';
import { ShapingOrder, WritingDirection } from '../../src/sfnt/enums';
import { fontBytes } from './fontData';

// The suite of issue #14: the shaping engine, its result and font features against the real
// bindings and the Roboto subset ("abc") of Core's fixtures. The Typeface class belongs to another
// package, so the engine gets a minimal object with a handle, made from the lowest-level bindings.

class TestTypeface extends NativeObject<'TRTypeface'> {
  constructor(token: typeof adopt, handle: Handle<'TRTypeface'>) {
    if (token !== adopt) {
      throw new Error('A test typeface is created internally.');
    }
    super(handle);
  }
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

function same(a: ArrayLike<unknown>, b: ArrayLike<unknown>): boolean {
  return a.length === b.length && Array.from(a).every((value, index) => JSON.stringify(value) === JSON.stringify(b[index]));
}

function makeTypeface(b: NativeBindings): TestTypeface {
  const file = b.TRFontFileCreateFromMemory(fontBytes, fontBytes.byteLength);
  check(file !== undefined, 'the font cannot be loaded');
  const typeface = b.TRFontFileGetTypeface(file as Handle<'TRFontFile'>, 0);
  // The typeface keeps the file alive in Core, so the wrapper of the file is not needed.
  b.disposeHandle(file as Handle<'TRFontFile'>);
  check(typeface !== undefined, 'the font has no typeface');
  return new TestTypeface(adopt, typeface as Handle<'TRTypeface'>);
}

function makeEngine(b: NativeBindings, typeSize = 40): { engine: ShapingEngine; typeface: TestTypeface } {
  const typeface = makeTypeface(b);
  const engine = new ShapingEngine();
  engine.typeface = typeface;
  engine.typeSize = typeSize;
  engine.scriptTag = SfntTag.make('latn');
  return { engine, typeface };
}

const tag = SfntTag.make;

type Test = [name: string, body: (b: NativeBindings) => void];

const tests: Test[] = [
  ['a new engine has the defaults of Core', () => {
    const engine = new ShapingEngine();
    check(engine.typeface === undefined && engine.typeSize === 16, 'typeface and size');
    check(SfntTag.toString(engine.scriptTag) === 'DFLT' && SfntTag.toString(engine.languageTag) === 'dflt', 'script and language');
    check(engine.writingDirection === WritingDirection.LeftToRight && engine.shapingOrder === ShapingOrder.Forward, 'direction and order');
    check(engine.openTypeFeatures.length === 0, 'features');
    engine.dispose();
  }],

  ['language tags and script directions are converted by Core', () => {
    check(SfntTag.toString(ShapingEngine.getLanguageTag('ur-PK')) === 'URD ', 'ur-PK');
    check(SfntTag.toString(ShapingEngine.getLanguageTag('ur')) === 'URD ', 'ur');
    check(SfntTag.toString(ShapingEngine.getLanguageTag('xx-nothing')) === 'dflt', 'an unknown language is the default one');
    check(ShapingEngine.getLanguageTag('ur-PK') > 0x7fffffff, 'the tag is unsigned');
    check(ShapingEngine.getScriptDefaultDirection(tag('arab')) === WritingDirection.RightToLeft, 'arab');
    check(ShapingEngine.getScriptDefaultDirection(tag('latn')) === WritingDirection.LeftToRight, 'latn');
    check(ShapingEngine.getScriptDefaultDirection(tag('zzzz')) === WritingDirection.LeftToRight, 'an unknown script');
    expectThrows(() => ShapingEngine.getScriptDefaultDirection(-1), /out of range/, 'RangeError');
    expectThrows(() => ShapingEngine.getLanguageTag(1 as unknown as string), /must be a string/);
  }],

  ['the getters of an engine return what was set', (b) => {
    const typeface = makeTypeface(b);
    const engine = new ShapingEngine();
    engine.typeface = typeface;
    engine.typeSize = 12.5;
    engine.scriptTag = tag('arab');
    engine.languageTag = ShapingEngine.getLanguageTag('ur');
    engine.writingDirection = WritingDirection.RightToLeft;
    engine.shapingOrder = ShapingOrder.Backward;
    check(engine.typeface === typeface, 'the typeface is the object that was set');
    check(engine.typeSize === 12.5 && SfntTag.toString(engine.scriptTag) === 'arab', 'size and script');
    check(SfntTag.toString(engine.languageTag) === 'URD ', 'language');
    check(engine.writingDirection === WritingDirection.RightToLeft && engine.shapingOrder === ShapingOrder.Backward, 'direction and order');
    engine.typeface = undefined;
    check(engine.typeface === undefined, 'the typeface is cleared');
    engine.dispose();
    typeface.dispose();
  }],

  ['invalid tags and a typeface of the wrong kind are refused', (b) => {
    const engine = new ShapingEngine();
    expectThrows(() => { engine.scriptTag = -1; }, /out of range/, 'RangeError');
    expectThrows(() => { engine.languageTag = 2 ** 32; }, /out of range/, 'RangeError');
    expectThrows(() => { engine.scriptTag = 1.5; }, /integer/, 'RangeError');
    check(SfntTag.toString(engine.scriptTag) === 'DFLT', 'a refused tag changes nothing');
    const features = new FontFeatures([]);
    expectThrows(() => { engine.typeface = features as unknown as TestTypeface; }, /TRTypeface/);
    check(engine.typeface === undefined, 'a refused typeface is not kept');
    features.dispose();
    const typeface = makeTypeface(b);
    typeface.dispose();
    expectThrows(() => { engine.typeface = typeface; }, /already disposed/);
    engine.dispose();
  }],

  ['text is shaped into glyphs, with the cluster map read as indices', (b) => {
    const { engine, typeface } = makeEngine(b);
    const result = engine.shapeText('abc');
    check(result.codeUnitCount === 3 && result.glyphCount === 3, `counts ${result.codeUnitCount}/${result.glyphCount}`);
    check(!result.isBackward && !result.isRTL, 'forward, left to right');
    check(result.glyphIds.length === 3 && result.glyphIds.every((id) => id !== 0), `glyph ids: ${result.glyphIds.toArray()}`);
    check(result.glyphIds.toTypedArray() instanceof Uint16Array, 'glyph ids are 16-bit');
    check(result.glyphAdvances.length === 3 && result.glyphAdvances.every((advance) => advance > 0), 'advances');
    check(result.glyphOffsets.length === 3 && Number.isFinite(result.glyphOffsets.get(0).x), 'offsets');
    check(same(result.clusterMap.toArray(), [0, 1, 2]), `cluster map: ${result.clusterMap.toArray()}`);
    check(result.clusterMap.toTypedArray() instanceof Uint32Array, 'the cluster map is 32-bit whatever the width of TRUInteger is');
    result.dispose();
    engine.dispose();
    typeface.dispose();
  }],

  ['a range of the text is shaped and an invalid range is refused', (b) => {
    const { engine, typeface } = makeEngine(b);
    const result = engine.shapeText('abcabc', 1, 3);
    check(result.codeUnitCount === 2 && result.glyphCount === 2, 'two code units');
    check(engine.shapeText('').glyphCount === 0, 'empty text has no glyphs');
    // A surrogate pair is two code units of one cluster, drawn with the glyph for a missing character.
    const pair = engine.shapeText('a\u{1F600}');
    check(pair.codeUnitCount === 3 && pair.clusterMap.length === 3, 'surrogate pair');
    check(pair.clusterMap.get(1) === pair.clusterMap.get(2), 'both halves are in one cluster');
    for (const [from, to] of [[-1, 2], [2, 1], [0, 7], [0.5, 1]] as const) {
      expectThrows(() => engine.shapeText('abc', from, to), /not within the text/, 'RangeError');
    }
    engine.dispose();
    typeface.dispose();
  }],

  ['shaping without a typeface fails with an error', () => {
    const engine = new ShapingEngine();
    expectThrows(() => engine.shapeText('abc'), /Could not shape/);
    engine.dispose();
  }],

  ['caret edges grow along the run and respect the caret stops', (b) => {
    const { engine, typeface } = makeEngine(b);
    const result = engine.shapeText('abc');
    const edges = result.getCaretEdges();
    check(edges.length === 4 && edges[0] === 0, 'four edges from zero');
    check((edges[1] as number) > 0 && (edges[2] as number) > (edges[1] as number) && (edges[3] as number) > (edges[2] as number), `edges: ${edges}`);
    const total = result.glyphAdvances.reduce((sum, advance) => sum + advance, 0);
    check(Math.abs((edges[3] as number) - total) < 0.01, 'the last edge is the width of the run');
    const stops = result.getCaretEdges([true, false, true]);
    check(stops.length === 4 && stops[1] === stops[0], 'no stop before the second code unit puts its edge on the previous one');
    expectThrows(() => result.getCaretEdges([true]), /flag for each code unit/, 'RangeError');
    result.dispose();
    expectThrows(() => result.getCaretEdges(), /already disposed/);
    engine.dispose();
    typeface.dispose();
  }],

  ['right to left settings change what the result says', (b) => {
    const { engine, typeface } = makeEngine(b);
    engine.writingDirection = WritingDirection.RightToLeft;
    const rtl = engine.shapeText('abc');
    check(rtl.isRTL && !rtl.isBackward, 'right to left');
    engine.shapingOrder = ShapingOrder.Backward;
    const backward = engine.shapeText('abc');
    check(backward.isBackward, 'backward');
    check(same(backward.clusterMap.toArray(), [2, 1, 0]), `backward cluster map: ${backward.clusterMap.toArray()}`);
    engine.dispose();
    typeface.dispose();
  }],

  ['the engine and the result keep their own references', (b) => {
    const { engine, typeface } = makeEngine(b);
    // Core retains the typeface, so shaping works after its wrapper is disposed.
    typeface.dispose();
    const result = engine.shapeText('abc');
    check(result.glyphCount === 3, 'shaped with a disposed typeface wrapper');
    const ids = result.glyphIds;
    const clusters = result.clusterMap;
    const advances = result.glyphAdvances;

    // The result does not depend on its engine.
    engine.dispose();
    check(engine.isDisposed, 'engine disposed');
    check(ids.length === 3 && same(clusters.toArray(), [0, 1, 2]) && advances.get(0) > 0, 'the lists still read');

    result.dispose();
    result.dispose();
    check(result.isDisposed, 'result disposed');
    for (const list of [ids, clusters, advances]) {
      expectThrows(() => list.get(0), /already disposed/);
    }
    expectThrows(() => result.glyphCount, /already disposed/);
    expectThrows(() => result.glyphIds, /already disposed/);
    expectThrows(() => engine.shapeText('abc'), /already disposed/);
    expectThrows(() => engine.typeSize, /already disposed/);
    expectThrows(() => { engine.typeface = undefined; }, /already disposed/);
  }],

  ['features set on an engine are applied, copied and read by a list that follows the engine', (b) => {
    const { engine, typeface } = makeEngine(b);
    const first = [{ tag: tag('liga'), value: 1 }, { tag: tag('kern'), value: 0 }, { tag: tag('salt'), value: 2 }];
    engine.openTypeFeatures = first;
    first[0] = { tag: tag('zzzz'), value: 9 };
    check(same(engine.openTypeFeatures, [{ tag: tag('liga'), value: 1 }, { tag: tag('kern'), value: 0 }, { tag: tag('salt'), value: 2 }]), 'the features are copied');
    check(engine.shapeText('abc').glyphCount === 3, 'shapes with features');

    // The engine is a mutable owner: Core frees the array behind its pointer when the features are set again.
    const handle = engine.nativeHandle;
    const refresh = () => ({ pointer: b.TRShapingEngineGetOpenTypeFeaturesPtr(handle), length: b.TRShapingEngineGetOpenTypeFeatureCount(handle) });
    const initial = refresh();
    const list = coreStructs<{ tag: number; value: number }>(engine, initial.pointer, initial.length, refresh);
    check(same(list.toArray(), engine.openTypeFeatures), 'Core holds the features that were set');
    engine.openTypeFeatures = [{ tag: tag('case'), value: 1 }, { tag: tag('locl'), value: 1 }, { tag: tag('mkmk'), value: 1 }];
    check(list.get(0).tag === tag('case') && list.get(2).tag === tag('mkmk'), 'the list shows the new features');
    engine.openTypeFeatures = [{ tag: tag('case'), value: 1 }];
    expectThrows(() => list.get(2), /fewer than the list was made for/, 'RangeError');
    engine.openTypeFeatures = [];
    check(engine.openTypeFeatures.length === 0 && b.TRShapingEngineGetOpenTypeFeatureCount(handle) === 0, 'cleared');

    expectThrows(() => { engine.openTypeFeatures = [{ tag: -1, value: 1 }]; }, /./, 'RangeError');
    engine.openTypeFeatures = [{ tag: tag('liga'), value: 1 }];
    expectThrows(() => { engine.openTypeFeatures = [{ tag: tag('kern'), value: 2 ** 32 }]; }, /./, 'RangeError');
    check(same(engine.openTypeFeatures, [{ tag: tag('liga'), value: 1 }]), 'a refused set keeps the previous features');

    engine.dispose();
    expectThrows(() => list.get(0), /already disposed/);
    typeface.dispose();
  }],

  ['font features are created, read as a list, retained and disposed', (b) => {
    const input = [{ tag: tag('liga'), value: 1 }, { tag: tag('kern'), value: 0 }, { tag: tag('salt'), value: 3 }];
    const features = new FontFeatures(input);
    input[0] = { tag: 0, value: 0 };
    check(features.count === 3, 'count');
    const items = features.items;
    check(items.length === 3 && same(items.toArray(), [{ tag: tag('liga'), value: 1 }, { tag: tag('kern'), value: 0 }, { tag: tag('salt'), value: 3 }]), `items: ${JSON.stringify(items.toArray())}`);
    check(items.slice(1).get(0).tag === tag('kern'), 'a slice');

    // A second reference to the same object of Core keeps it alive when the first is disposed.
    const second = FontFeatures.retaining(features.nativeHandle, (handle) => b.TRFontFeaturesRetain(handle));
    check(second.equals(features) && second.count === 3, 'a retained wrapper is the same object');
    features.dispose();
    features.dispose();
    check(features.isDisposed && !second.isDisposed, 'disposing one reference leaves the other');
    check(second.items.get(2).value === 3, 'the second reference still reads');
    expectThrows(() => features.count, /already disposed/);
    expectThrows(() => features.items, /already disposed/);
    expectThrows(() => items.get(0), /already disposed/);
    second.dispose();

    const empty = new FontFeatures([]);
    check(empty.count === 0 && empty.items.length === 0 && empty.items.isEmpty, 'an empty set');
    empty.dispose();
  }],

  ['invalid font features are refused', () => {
    expectThrows(() => new FontFeatures([{ tag: -1, value: 1 }]), /./, 'RangeError');
    expectThrows(() => new FontFeatures([{ tag: tag('liga'), value: 1.5 }]), /./, 'RangeError');
    expectThrows(() => new FontFeatures([{ tag: tag('liga') } as unknown as { tag: number; value: number }]), /./);
    expectThrows(() => new FontFeatures(undefined as unknown as []), /./);
  }],

  ['objects that are never disposed are collected without harm', (b) => {
    // Their finalizers release the references of Core on whatever thread the engine picks.
    for (let index = 0; index < 20; index++) {
      const { engine } = makeEngine(b);
      engine.shapeText('abc');
      new FontFeatures([{ tag: tag('liga'), value: 1 }]);
    }
    b.testCollectGarbage?.();
    check(b.smokeTest(), 'Core still works');
  }],
];

export function runShapingTests(bindings: NativeBindings): { passed: number; failures: string[] } {
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

export const shapingTestCount = tests.length;
