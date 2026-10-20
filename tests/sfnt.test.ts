import assert from "node:assert/strict";
import { before, test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";

// The classes are compiled into a scratch directory and run over a fake of the native functions
// that records what the wrappers pass. What Core does with real fonts is tested on a device
// (example/tests/ShapingTests.ts).
type Feature = { tag: number; value: number };
interface Fake {
  [name: string]: unknown;
}

interface Sfnt {
  SfntTag: { make(text: string): number; toString(tag: number): string };
  ShapingEngine: {
    new (): EngineLike;
    getLanguageTag(name: string): number;
    getScriptDefaultDirection(tag: number): number;
  };
  FontFeatures: new (features: Feature[]) => { readonly count: number; items: { length: number }; dispose(): void; isDisposed: boolean };
  ShapingResult: new (...args: unknown[]) => unknown;
}

interface EngineLike {
  typeface: { nativeHandle: object } | undefined;
  typeSize: number;
  scriptTag: number;
  languageTag: number;
  writingDirection: number;
  shapingOrder: number;
  openTypeFeatures: readonly Feature[];
  readonly isDisposed: boolean;
  dispose(): void;
  shapeText(text: string, from?: number, to?: number): ResultLike;
}

interface ResultLike {
  readonly codeUnitCount: number;
  readonly glyphCount: number;
  readonly isBackward: boolean;
  readonly isRTL: boolean;
  readonly glyphIds: { length: number };
  readonly glyphOffsets: { length: number };
  readonly glyphAdvances: { length: number };
  readonly clusterMap: { length: number };
  getCaretEdges(stops?: ArrayLike<boolean | number>): Float32Array;
  dispose(): void;
}

let lib: Sfnt;
const calls: { name: string; args: unknown[] }[] = [];
let setFeaturesResult = true;
let createResult: object | undefined;
let shapeResult: object | undefined;
let codeUnits = 3;
const disposed = new Set<object>();

function fake(): Fake {
  const log = (name: string, result?: unknown) => (...args: unknown[]) => {
    calls.push({ name, args });
    return typeof result === "function" ? (result as (...a: unknown[]) => unknown)(...args) : result;
  };
  const state = { typeSize: 16, script: 0x44464c54, language: 0x64666c74, direction: 0, order: 0 };
  return {
    disposeHandle: (handle: object) => { disposed.add(handle); },
    handleEquals: (a: object, b: object) => a === b,
    TRShapingEngineCreate: () => createResult,
    TRShapingEngineGetScriptDefaultDirection: (tag: number) => (tag === 0x61726162 ? 1 : 0),
    TRShapingEngineGetLanguageTagForName: (name: string) => (name === "ur-PK" ? 0x55524420 : 0x64666c74),
    TRShapingEngineSetTypeface: log("SetTypeface"),
    TRShapingEngineSetTypeSize: (_h: object, v: number) => { state.typeSize = v; },
    TRShapingEngineGetTypeSize: () => state.typeSize,
    TRShapingEngineSetScriptTag: (_h: object, v: number) => { state.script = v; },
    TRShapingEngineGetScriptTag: () => state.script,
    TRShapingEngineSetLanguageTag: (_h: object, v: number) => { state.language = v; },
    TRShapingEngineGetLanguageTag: () => state.language,
    TRShapingEngineSetWritingDirection: (_h: object, v: number) => { state.direction = v; },
    TRShapingEngineGetWritingDirection: () => state.direction,
    TRShapingEngineSetShapingOrder: (_h: object, v: number) => { state.order = v; },
    TRShapingEngineGetShapingOrder: () => state.order,
    TRShapingEngineSetOpenTypeFeatures: log("SetFeatures", () => setFeaturesResult),
    TRShapingEngineCreateShapingResult: log("CreateShapingResult", () => shapeResult),
    TRShapingResultGetCodeUnitCount: () => codeUnits,
    TRShapingResultGetGlyphCount: () => 2,
    TRShapingResultIsBackward: () => true,
    TRShapingResultIsRTL: () => false,
    TRShapingResultGetGlyphIDsPtr: () => ({}),
    TRShapingResultGetGlyphOffsetsPtr: () => ({}),
    TRShapingResultGetGlyphAdvancesPtr: () => ({}),
    TRShapingResultGetClusterMapPtr: () => ({}),
    TRShapingResultGetCaretEdges: log("CaretEdges", (_h: object, stops: Uint8Array | undefined, edges: Float32Array) => {
      edges.forEach((_v, i) => { edges[i] = i * 10; });
      return stops;
    }),
    TRFontFeaturesCreate: log("FeaturesCreate", () => createResult),
    TRFontFeaturesGetCount: () => 2,
    TRFontFeaturesGetItemsPtr: () => ({}),
  };
}

before(async () => {
  const out = compileModules(["src/sfnt/SfntTag.ts", "src/sfnt/ShapingEngine.ts", "src/sfnt/FontFeatures.ts", "src/sfnt/ShapingResult.ts"]);
  (globalThis as Record<string, unknown>)["__tehreer"] = fake();
  const [tag, engine, features, result] = await Promise.all(["SfntTag", "ShapingEngine", "FontFeatures", "ShapingResult"].map((name) => importModule(out, `sfnt/${name}.js`)));
  lib = { ...tag, ...engine, ...features, ...result } as unknown as Sfnt;
});

test("tags are made from and turned into strings", () => {
  const { SfntTag } = lib;
  assert.equal(SfntTag.make("URD"), SfntTag.make("URD "));
  assert.equal(SfntTag.make("head"), 0x68656164);
  assert.equal(SfntTag.make("\x7e\x7e\x7e\x7e"), 0x7e7e7e7e);
  assert.equal(SfntTag.toString(0x55524420), "URD ");
  assert.equal(SfntTag.toString(SfntTag.make("a")), "a   ");
  for (const bad of ["", "toolong", "é", "a\nb", "\x7f"]) {
    assert.throws(() => SfntTag.make(bad), RangeError, JSON.stringify(bad));
  }
});

test("language tags and script directions come from Core", () => {
  assert.equal(lib.ShapingEngine.getLanguageTag("ur-PK"), 0x55524420);
  assert.equal(lib.SfntTag.toString(lib.ShapingEngine.getLanguageTag("zz-unknown")), "dflt");
  assert.equal(lib.ShapingEngine.getScriptDefaultDirection(lib.SfntTag.make("arab")), 1);
  assert.equal(lib.ShapingEngine.getScriptDefaultDirection(lib.SfntTag.make("latn")), 0);
});

test("an engine reads its settings from Core and keeps typeface and features", () => {
  createResult = { engine: true };
  const engine = new lib.ShapingEngine();
  assert.equal(engine.typeSize, 16);
  assert.equal(lib.SfntTag.toString(engine.scriptTag), "DFLT");
  assert.equal(lib.SfntTag.toString(engine.languageTag), "dflt");
  assert.equal(engine.typeface, undefined);
  assert.deepEqual(engine.openTypeFeatures, []);

  engine.typeSize = 12.5;
  engine.scriptTag = lib.SfntTag.make("arab");
  engine.languageTag = lib.SfntTag.make("URD");
  engine.writingDirection = 1;
  engine.shapingOrder = 1;
  assert.deepEqual([engine.typeSize, lib.SfntTag.toString(engine.scriptTag), lib.SfntTag.toString(engine.languageTag), engine.writingDirection, engine.shapingOrder], [12.5, "arab", "URD ", 1, 1]);

  const typeface = { nativeHandle: { typeface: true } };
  engine.typeface = typeface;
  assert.equal(engine.typeface, typeface);
  engine.typeface = undefined;
  assert.equal(engine.typeface, undefined);
  assert.equal(calls.at(-1)?.args[1], undefined);

  const input = [{ tag: lib.SfntTag.make("liga"), value: 1 }];
  engine.openTypeFeatures = input;
  input[0] = { tag: 0, value: 0 };
  assert.deepEqual(engine.openTypeFeatures, [{ tag: 0x6c696761, value: 1 }]);

  // A failed set keeps the previous features, as Core does.
  setFeaturesResult = false;
  assert.throws(() => { engine.openTypeFeatures = []; }, /OpenType features/);
  assert.equal(engine.openTypeFeatures.length, 1);
  setFeaturesResult = true;
});

test("an engine that Core cannot create is an error, and a disposed engine refuses everything", () => {
  createResult = undefined;
  assert.throws(() => new lib.ShapingEngine(), /Could not create a shaping engine/);

  createResult = { engine: true };
  const engine = new lib.ShapingEngine();
  engine.dispose();
  engine.dispose();
  assert.ok(engine.isDisposed);
  assert.equal(disposed.size > 0, true);
  assert.throws(() => engine.typeSize, /already disposed/);
  assert.throws(() => { engine.typeface = undefined; }, /already disposed/);
  assert.throws(() => engine.shapeText("abc"), /already disposed/);
});

test("shapeText checks its range and converts the text to UTF-16", () => {
  createResult = { engine: true };
  shapeResult = { result: true };
  const engine = new lib.ShapingEngine();

  const result = engine.shapeText("a\u{1F600}b", 0, 4);
  assert.equal(result.codeUnitCount, 3);
  const call = calls.at(-1);
  assert.deepEqual([...(call?.args[1] as Uint16Array)], [0x61, 0xd83d, 0xde00, 0x62]);
  assert.equal(call?.args[2], 4);
  assert.equal(call?.args[3], 1);

  engine.shapeText("abcabc", 1, 3);
  assert.deepEqual([...(calls.at(-1)?.args[1] as Uint16Array)], [0x62, 0x63]);
  engine.shapeText("");
  assert.equal(calls.at(-1)?.args[2], 0);

  for (const [from, to] of [[-1, 2], [3, 2], [0, 9], [0.5, 1], [0, Number.NaN]] as const) {
    assert.throws(() => engine.shapeText("abc", from, to), RangeError, `${from}..${to}`);
  }

  shapeResult = undefined;
  assert.throws(() => engine.shapeText("abc"), /Could not shape/);
});

test("a shaping result reads its properties, makes lists of the right length and checks the caret stops", () => {
  createResult = { engine: true };
  shapeResult = { result: true };
  codeUnits = 3;
  const result = new lib.ShapingEngine().shapeText("abc");
  assert.deepEqual([result.glyphCount, result.isBackward, result.isRTL], [2, true, false]);
  assert.equal(result.glyphIds.length, 2);
  assert.equal(result.glyphOffsets.length, 2);
  assert.equal(result.glyphAdvances.length, 2);
  assert.equal(result.clusterMap.length, 3);

  assert.deepEqual([...result.getCaretEdges()], [0, 10, 20, 30]);
  assert.equal(calls.at(-1)?.args[1], undefined);
  result.getCaretEdges([true, 0, 5]);
  assert.deepEqual([...(calls.at(-1)?.args[1] as Uint8Array)], [1, 0, 1]);
  assert.throws(() => result.getCaretEdges([true]), RangeError);

  result.dispose();
  assert.throws(() => result.glyphCount, /already disposed/);
  assert.throws(() => result.getCaretEdges(), /already disposed/);
});

test("font features are created from a list and release their reference", () => {
  createResult = { features: true };
  const features = new lib.FontFeatures([{ tag: 0x6c696761, value: 1 }, { tag: 0x6b65726e, value: 0 }]);
  assert.equal(features.count, 2);
  assert.equal(features.items.length, 2);
  assert.deepEqual(calls.at(-1)?.args[0], [{ tag: 0x6c696761, value: 1 }, { tag: 0x6b65726e, value: 0 }]);
  features.dispose();
  assert.ok(features.isDisposed);
  assert.throws(() => features.count, /already disposed/);
  assert.throws(() => features.items, /already disposed/);

  createResult = undefined;
  assert.throws(() => new lib.FontFeatures([]), /Could not create font features/);
});
