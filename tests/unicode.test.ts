import assert from "node:assert/strict";
import { before, beforeEach, test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";

// The classes are compiled into a scratch directory and run over a fake of the native functions
// that records what they pass and returns canned results, so what is tested is the wrapper: argument
// checks before native code runs, the mapping of results, and that every handle that a wrapper
// makes for itself is disposed on every path. What SheenBidi computes, and how long the text copy
// lives, are tested on a device (example/tests/UnicodeTests.ts).
interface Handle {
  readonly kind: string;
  readonly [key: string]: unknown;
}

interface Owned extends Disposable {
  dispose(): void;
  readonly isDisposed: boolean;
}

interface Algorithm extends Owned {
  readonly charBidiClasses: { length: number; toArray(): number[] };
  getParagraphBoundary(from: number, to: number): number;
  createParagraph(from: number, to: number, base: number): Paragraph;
}

interface Paragraph extends Owned {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly baseLevel: number;
  readonly charLevels: { length: number; toArray(): number[] };
  readonly logicalRuns: Iterable<Run>;
  createLine(from: number, to: number): Line;
}

interface Line extends Owned {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly visualRuns: { length: number; get(index: number): Run; toArray(): Run[] };
  readonly mirroringPairs: Iterable<{ charIndex: number; actualCodePoint: number; pairingCodePoint: number }>;
}

interface Run {
  startIndex: number;
  endIndex: number;
  embeddingLevel?: number;
  script?: number;
  readonly isRightToLeft?: boolean;
}

interface Classifier {
  readonly text: string;
  readonly charScripts: { length: number; get(index: number): number; toArray(): number[]; slice(from?: number, to?: number): { toArray(): number[] } };
  readonly scriptRuns: Iterable<Run>;
  getScriptRuns(from: number, to: number): Iterable<Run>;
}

interface Unicode {
  BidiAlgorithm: { new (text: string): Algorithm; MAX_LEVEL: number };
  ScriptClassifier: new (text: string) => Classifier;
  CodePoint: Record<string, (codePoint: number) => number>;
  BidiPair: new (a: number, b: number, c: number) => { equals(other: unknown): boolean; toString(): string };
  BidiRun: new (a: number, b: number, c: number) => { equals(other: unknown): boolean; toString(): string; isRightToLeft: boolean };
  ScriptRun: new (a: number, b: number, c: number) => { equals(other: unknown): boolean; toString(): string };
  BaseDirection: Record<string, number>;
  Script: Record<string, number | ((script: number) => number)>;
  BidiClass: Record<string, number>;
  GeneralCategory: Record<string, number>;
}

let lib: Unicode;
let calls: { name: string; args: unknown[] }[];
let disposed: Set<unknown>;
let made: Handle[];
// What the fake gives back, which a test changes.
let levels: number[];
let runs: { offset: number; length: number; level: number }[];
let mirrors: { index: number; mirror: number; codepoint: number }[];
let scriptRuns: { offset: number; length: number; script: number }[];
let failLoad = false;

function handle(kind: string, extra: Record<string, unknown> = {}): Handle {
  const created = { kind, ...extra };
  made.push(created);
  return created;
}

function bytes(values: number[]): { memory: ArrayBuffer } {
  return { memory: Uint8Array.from(values).buffer };
}

function fake(): Record<string, unknown> {
  const log = (name: string, result?: unknown) => (...args: unknown[]) => {
    calls.push({ name, args });
    return typeof result === "function" ? (result as (...a: unknown[]) => unknown)(...args) : result;
  };
  let mirrorPosition = 0;
  let scriptPosition = 0;
  return {
    disposeHandle: (h: unknown) => { disposed.add(h); },
    isHandleMutable: () => false,
    createPointerBuffer: (view: { memory: ArrayBuffer }) => view.memory,
    readPointerStructs: (view: { structs: unknown[] }, _count: number, from: number, to: number) => view.structs.slice(from, to),

    SBAlgorithmCreate: log("SBAlgorithmCreate", (text: string) => (text === "fail" ? undefined : handle("SBAlgorithm", { text }))),
    SBAlgorithmGetBidiTypesPtr: (h: Handle) => ({ memory: Uint8Array.from([...(h["text"] as string)].map(() => 1)).buffer }),
    SBAlgorithmGetParagraphBoundary: log("SBAlgorithmGetParagraphBoundary", (_h: Handle, offset: number, length: number) => ({
      actualLength: Math.min(length, 3), separatorLength: 1, offset,
    })),
    SBAlgorithmCreateParagraph: log("SBAlgorithmCreateParagraph", (_h: Handle, offset: number, length: number, base: number) =>
      (length === 7 ? undefined : handle("SBParagraph", { offset, length, base }))),

    SBParagraphGetOffset: (h: Handle) => h["offset"],
    SBParagraphGetLength: (h: Handle) => h["length"],
    SBParagraphGetBaseLevel: (h: Handle) => (h["base"] === 0xfe ? 0 : h["base"] === 0xfd ? 1 : h["base"]),
    SBParagraphGetLevelsPtr: () => bytes(levels),
    SBParagraphCreateLine: log("SBParagraphCreateLine", (_h: Handle, offset: number, length: number) =>
      (length === 7 ? undefined : handle("SBLine", { offset, length }))),

    SBLineGetOffset: (h: Handle) => h["offset"],
    SBLineGetLength: (h: Handle) => h["length"],
    SBLineGetRunCount: () => runs.length,
    SBLineGetRunsPtr: () => ({ structs: runs }),

    SBMirrorLocatorCreate: log("SBMirrorLocatorCreate", () => { mirrorPosition = 0; return handle("SBMirrorLocator"); }),
    SBMirrorLocatorLoadLine: log("SBMirrorLocatorLoadLine", () => { if (failLoad) { throw new Error("load failed"); } }),
    SBMirrorLocatorMoveNext: () => mirrorPosition++ < mirrors.length,
    SBMirrorLocatorGetAgent: () => mirrors[mirrorPosition - 1],

    SBScriptLocatorCreate: log("SBScriptLocatorCreate", () => { scriptPosition = 0; return handle("SBScriptLocator"); }),
    SBScriptLocatorLoadCodepoints: log("SBScriptLocatorLoadCodepoints", () => { if (failLoad) { throw new Error("load failed"); } }),
    SBScriptLocatorMoveNext: () => scriptPosition++ < scriptRuns.length,
    SBScriptLocatorGetAgent: () => scriptRuns[scriptPosition - 1],

    SBCodepointGetBidiType: (c: number) => (c === 0x61 ? 1 : 2),
    SBCodepointGetGeneralCategory: () => 1,
    SBCodepointGetMirror: (c: number) => (c === 0x28 ? 0x29 : c === 0xffffffff ? -1 : 0),
    SBCodepointGetScript: () => 21,
    SBScriptGetOpenTypeTag: () => -1,
    SBScriptGetUnicodeTag: () => 0x41726162,
  };
}

before(() => {
  const files = ["BidiAlgorithm", "BidiParagraph", "BidiLine", "BidiPair", "BidiRun", "ScriptClassifier", "ScriptRun", "CodePoint", "BaseDirection", "enums"]
    .map((name) => `src/unicode/${name}.ts`);
  const out = compileModules(files);
  return Promise.all(files.map((file) => importModule(out, file.replace("src/", "").replace(".ts", ".js")))).then((modules) => {
    lib = Object.assign({}, ...modules) as Unicode;
  });
});

beforeEach(() => {
  calls = [];
  disposed = new Set();
  made = [];
  levels = [0, 0, 1, 1, 0];
  runs = [{ offset: 2, length: 2, level: 1 }, { offset: 0, length: 2, level: 0 }];
  mirrors = [];
  scriptRuns = [];
  failLoad = false;
  (globalThis as Record<string, unknown>)["__tehreer"] = fake();
});

const names = () => calls.map((call) => call.name);
const live = () => made.filter((h) => !disposed.has(h));

test("an algorithm needs a text and Core's answer", () => {
  assert.throws(() => new lib.BidiAlgorithm(""), RangeError);
  assert.deepEqual(names(), []);
  assert.throws(() => new lib.BidiAlgorithm("fail"), /Could not create a bidi algorithm/);
  assert.deepEqual(names(), ["SBAlgorithmCreate"]);
});

test("ranges are checked before SheenBidi, which would clamp them", () => {
  using algorithm = new lib.BidiAlgorithm("abcde");
  for (const [from, to] of [[-1, 2], [0, 6], [2, 2], [3, 2], [0.5, 2], [0, Number.NaN]] as const) {
    assert.throws(() => algorithm.getParagraphBoundary(from, to), RangeError, `${from}..${to}`);
    assert.throws(() => algorithm.createParagraph(from, to, 0), RangeError, `${from}..${to}`);
  }
  assert.deepEqual(names(), ["SBAlgorithmCreate"]);

  // index + length go to SheenBidi, and the answer is a length that is added to the index.
  assert.equal(algorithm.getParagraphBoundary(1, 5), 4);
  assert.deepEqual(calls.at(-1)?.args.slice(1), [1, 4]);
});

test("a base is a direction or a level from 0 to 125", () => {
  using algorithm = new lib.BidiAlgorithm("abcde");
  const { BaseDirection } = lib;
  for (const base of [0, 1, 2, 125, BaseDirection["LeftToRight"], BaseDirection["DefaultLeftToRight"], BaseDirection["DefaultRightToLeft"]] as number[]) {
    algorithm.createParagraph(0, 5, base).dispose();
  }
  const before = names().length;
  for (const base of [126, 0x80, 0xfc, 0xff, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => algorithm.createParagraph(0, 5, base), RangeError, String(base));
  }
  assert.equal(names().length, before);
  assert.equal(lib.BidiAlgorithm.MAX_LEVEL, 125);
  assert.deepEqual([BaseDirection["LeftToRight"], BaseDirection["RightToLeft"], BaseDirection["DefaultLeftToRight"], BaseDirection["DefaultRightToLeft"]], [0, 1, 0xfe, 0xfd]);
});

test("a paragraph that SheenBidi does not make is an error, not undefined", () => {
  using algorithm = new lib.BidiAlgorithm("abcdefgh");
  assert.throws(() => algorithm.createParagraph(0, 7, 0), /Could not create a bidi paragraph/);
});

test("a paragraph reads its properties and levels, and groups them into runs", () => {
  using algorithm = new lib.BidiAlgorithm("abcde");
  using paragraph = algorithm.createParagraph(0, 5, lib.BaseDirection["DefaultRightToLeft"] as number);
  assert.equal(paragraph.startIndex, 0);
  assert.equal(paragraph.endIndex, 5);
  assert.equal(paragraph.baseLevel, 1);
  assert.deepEqual(paragraph.charLevels.toArray(), [0, 0, 1, 1, 0]);
  const logical = [...paragraph.logicalRuns];
  assert.deepEqual(logical.map((run) => [run.startIndex, run.endIndex, run.embeddingLevel]), [[0, 2, 0], [2, 4, 1], [4, 5, 0]]);
  assert.deepEqual(logical.map((run) => run.isRightToLeft), [false, true, false]);
  assert.equal(algorithm.charBidiClasses.length, 5);
});

test("a line must be inside of its paragraph", () => {
  using algorithm = new lib.BidiAlgorithm("ab\ncd");
  using paragraph = algorithm.createParagraph(3, 5, 0);
  for (const [from, to] of [[2, 5], [3, 6], [4, 4], [4, 3], [3.5, 5]] as const) {
    assert.throws(() => paragraph.createLine(from, to), RangeError, `${from}..${to}`);
  }
  assert.ok(!names().includes("SBParagraphCreateLine"));

  using line = paragraph.createLine(3, 5);
  assert.deepEqual(calls.at(-1)?.args.slice(1), [3, 2]);
  assert.equal(line.startIndex, 3);
  assert.equal(line.endIndex, 5);
});

test("the runs of a line are made when they are asked for, in the order SheenBidi gives", () => {
  using algorithm = new lib.BidiAlgorithm("abcd");
  using paragraph = algorithm.createParagraph(0, 4, 0);
  using line = paragraph.createLine(0, 4);
  const list = line.visualRuns;
  assert.equal(list.length, 2);
  assert.deepEqual(list.toArray().map((run) => [run.startIndex, run.endIndex, run.embeddingLevel]), [[2, 4, 1], [0, 2, 0]]);
  assert.throws(() => list.get(2), RangeError);
  assert.throws(() => list.get(-1), RangeError);
});

test("a line that SheenBidi does not make is an error", () => {
  using algorithm = new lib.BidiAlgorithm("abcdefgh");
  using paragraph = algorithm.createParagraph(0, 8, 0);
  assert.throws(() => paragraph.createLine(0, 7), /Could not create a bidi line/);
});

test("mirroring pairs come from a locator that is always disposed", () => {
  mirrors = [{ index: 4, mirror: 0x29, codepoint: 0x28 }, { index: 8, mirror: 0x28, codepoint: 0x29 }];
  using algorithm = new lib.BidiAlgorithm("abcdefghi");
  using paragraph = algorithm.createParagraph(0, 9, 1);
  using line = paragraph.createLine(0, 9);

  const pairs = [...line.mirroringPairs];
  assert.deepEqual(pairs.map((pair) => [pair.charIndex, pair.actualCodePoint, pair.pairingCodePoint]), [[4, 0x28, 0x29], [8, 0x29, 0x28]]);
  assert.deepEqual(live().map((h) => h.kind).sort(), ["SBAlgorithm", "SBLine", "SBParagraph"]);

  // Stopping early, and a failure to load, give the locator back too.
  for (const pair of line.mirroringPairs) {
    assert.equal(pair.charIndex, 4);
    break;
  }
  failLoad = true;
  assert.throws(() => [...line.mirroringPairs], /load failed/);
  assert.deepEqual(live().map((h) => h.kind).sort(), ["SBAlgorithm", "SBLine", "SBParagraph"]);
  assert.equal(made.filter((h) => h.kind === "SBMirrorLocator").length, 3);
});

test("the algorithm, the paragraph and the line are independent once made", () => {
  const algorithm = new lib.BidiAlgorithm("abcde");
  const paragraph = algorithm.createParagraph(0, 5, 0);
  const line = paragraph.createLine(0, 5);
  algorithm.dispose();
  algorithm.dispose();
  paragraph.dispose();

  assert.equal(disposed.size, 2, "each handle is given back once");
  assert.ok(algorithm.isDisposed && paragraph.isDisposed && !line.isDisposed);
  assert.equal(line.endIndex, 5);
  assert.equal(line.visualRuns.length, 2);
  assert.throws(() => algorithm.charBidiClasses, /already disposed/);
  assert.throws(() => algorithm.createParagraph(0, 5, 0), /already disposed/);
  assert.throws(() => paragraph.charLevels, /already disposed/);
  assert.throws(() => paragraph.createLine(0, 5), /already disposed/);
  line.dispose();
  assert.throws(() => line.startIndex, /already disposed/);
  assert.throws(() => [...line.mirroringPairs], /already disposed/);
  assert.deepEqual(live(), []);
});

test("lists of a disposed owner fail when they are read", () => {
  const algorithm = new lib.BidiAlgorithm("abc");
  const classes = algorithm.charBidiClasses;
  assert.equal(classes.length, 3);
  algorithm.dispose();
  assert.throws(() => classes.toArray(), /already disposed/);
});

test("a paragraph and a line cannot be made by hand", () => {
  const { BidiAlgorithm } = lib;
  using algorithm = new BidiAlgorithm("abc");
  using paragraph = algorithm.createParagraph(0, 3, 0);
  const Paragraph = paragraph.constructor as new (token: unknown, handle: unknown) => unknown;
  assert.throws(() => new Paragraph({}, {}), /made by a bidi algorithm/);
});

test("a classifier resolves scripts from the runs of the locator, and gives the locator back", () => {
  scriptRuns = [{ offset: 0, length: 4, script: 21 }, { offset: 4, length: 2, script: 4 }, { offset: 6, length: 1, script: 21 }];
  const classifier = new lib.ScriptClassifier("abc ab1");
  assert.equal(classifier.text, "abc ab1");
  assert.deepEqual(classifier.charScripts.toArray(), [21, 21, 21, 21, 4, 4, 21]);
  assert.deepEqual(classifier.charScripts.slice(3, 6).toArray(), [21, 4, 4]);
  assert.deepEqual([...classifier.scriptRuns].map((run) => [run.startIndex, run.endIndex, run.script]), [[0, 4, 21], [4, 6, 4], [6, 7, 21]]);
  assert.deepEqual([...classifier.getScriptRuns(2, 5)].map((run) => [run.startIndex, run.endIndex, run.script]), [[2, 4, 21], [4, 5, 4]]);
  assert.deepEqual([...classifier.getScriptRuns(5, 5)], []);
  for (const [from, to] of [[3, 8], [-1, 2], [6, 3], [0.5, 2]] as const) {
    assert.throws(() => classifier.getScriptRuns(from, to), RangeError, `${from}..${to}`);
  }
  assert.throws(() => classifier.charScripts.get(7), RangeError);
  assert.deepEqual(live(), []);
});

test("a classifier of an empty text has no runs, and one that fails leaks nothing", () => {
  const empty = new lib.ScriptClassifier("");
  assert.equal(empty.charScripts.length, 0);
  assert.deepEqual([...empty.scriptRuns], []);

  failLoad = true;
  assert.throws(() => new lib.ScriptClassifier("abc"), /load failed/);
  assert.deepEqual(live(), []);
});

test("code points are passed to SheenBidi, and unsigned results stay unsigned", () => {
  const { CodePoint, Script } = lib;
  assert.equal(CodePoint["getBidiClass"]?.(0x61), 1);
  assert.equal(CodePoint["getGeneralCategory"]?.(0x41), 1);
  assert.equal(CodePoint["getScript"]?.(0x61), 21);
  assert.equal(CodePoint["getMirror"]?.(0x28), 0x29);
  assert.equal(CodePoint["getMirror"]?.(0xffffffff), 0xffffffff);
  assert.equal((Script["getOpenTypeTag"] as (script: number) => number)(Script["Arabic"] as number), 0xffffffff);
  assert.equal((Script["getUnicodeTag"] as (script: number) => number)(Script["Arabic"] as number), 0x41726162);
});

test("value classes compare and print", () => {
  const { BidiPair, BidiRun, ScriptRun } = lib;
  assert.ok(new BidiRun(0, 3, 1).equals(new BidiRun(0, 3, 1)));
  assert.ok(!new BidiRun(0, 3, 1).equals(new BidiRun(0, 3, 2)));
  assert.ok(new BidiRun(0, 3, 1).isRightToLeft && !new BidiRun(0, 3, 2).isRightToLeft);
  assert.equal(new BidiRun(0, 3, 1).toString(), "BidiRun{startIndex=0, endIndex=3, embeddingLevel=1}");
  assert.ok(new BidiPair(1, 0x28, 0x29).equals(new BidiPair(1, 0x28, 0x29)));
  assert.equal(new BidiPair(1, 0x28, 0x29).toString(), "BidiPair{charIndex=1, actualCodePoint=40, pairingCodePoint=41}");
  assert.ok(new ScriptRun(0, 2, 4).equals(new ScriptRun(0, 2, 4)));
  assert.ok(!new ScriptRun(0, 2, 4).equals(new ScriptRun(0, 2, 5)));
  assert.equal(new ScriptRun(0, 2, 4).toString(), "ScriptRun{startIndex=0, endIndex=2, script=4}");
});
