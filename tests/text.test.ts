import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";

// TText and TMutableText run over a fake of Core's text: code units with an attribute map for each
// of them, and reference counts for what the attributes hold. What is checked is what the TypeScript
// layer decides: ranges, argument checks, the mapping of every attribute to its Core type, ownership
// of typefaces and font features, and use after dispose. What Core does with a real text (copies,
// runs, edits) is tested on a device (example/tests/TextTests.ts).

interface Core {
  kind: string;
  refs: number;
  // text
  units?: number[];
  attrs?: Map<number, unknown>[];
  // list
  entries?: { type: number; value: unknown }[];
  // font features
  items?: unknown[];
}

interface FakeHandle {
  kind: string;
  core: Core;
  disposed: boolean;
}

interface Wrapper {
  readonly isDisposed: boolean;
  dispose(): void;
  equals(other: Wrapper): boolean;
  readonly nativeHandle: FakeHandle;
}

interface Attributes {
  [name: string]: unknown;
}

interface Run {
  attributes: Attributes & { typeface?: Wrapper; fontFeatures?: Wrapper & { items: { toArray(): unknown[] } } };
  length: number;
}

interface TextLike extends Wrapper {
  readonly length: number;
  readonly string: string;
  getString(from: number, to: number): string;
  getAttributeRun(index: number): Run | undefined;
  copy(): TextLike;
  mutableCopy(): MutableLike;
  toString(): string;
}

interface MutableLike extends TextLike {
  beginEditing(): void;
  endEditing(): void;
  edit(body: (text: MutableLike) => void): void;
  append(text: string): void;
  insert(index: number, text: string): void;
  delete(from: number, to: number): void;
  replace(from: number, to: number, text: string): void;
  setString(text: string): void;
  setAttributes(from: number, to: number, attributes: Attributes): void;
  removeAttributes(from: number, to: number, ...names: string[]): void;
}

let out: string;
let TText: { new (text: string): TextLike };
let TMutableText: { new (text?: string): MutableLike };
let Typeface: { adopting(handle: FakeHandle): Wrapper };
let FontFeatures: { new (features: { tag: number; value: number }[]): Wrapper };

let calls: string[];
let cores: Core[];
let failNext: Set<string>;

function core(kind: string, extra: Partial<Core> = {}): Core {
  const made = { kind, refs: 1, ...extra };
  cores.push(made);
  return made;
}

function handleOf(target: Core): FakeHandle {
  return { kind: target.kind, core: target, disposed: false };
}

function live(handle: FakeHandle): FakeHandle {
  if (handle.disposed) {
    throw new Error("handle is already disposed");
  }
  return handle;
}

function retain(value: unknown): void {
  (value as Core).refs++;
}

function release(target: Core): void {
  target.refs--;
  if (target.refs > 0) {
    return;
  }
  for (const map of target.attrs ?? []) {
    for (const value of map.values()) {
      if (typeof value === "object") release(value as Core);
    }
  }
  for (const entry of target.entries ?? []) {
    if (typeof entry.value === "object") release(entry.value as Core);
  }
}

function textOf(handle: FakeHandle): Core & { units: number[]; attrs: Map<number, unknown>[] } {
  return live(handle).core as Core & { units: number[]; attrs: Map<number, unknown>[] };
}

function makeText(units: number[], mutable: boolean): FakeHandle {
  return handleOf(core(mutable ? "mutable" : "text", { units, attrs: units.map(() => new Map()) }));
}

function cloneAttrs(map: Map<number, unknown>): Map<number, unknown> {
  const copy = new Map(map);
  for (const value of copy.values()) {
    if (typeof value === "object") retain(value);
  }
  return copy;
}

function unitsOf(buffer: Uint16Array | undefined, count: number): number[] {
  return buffer === undefined ? [] : Array.from(buffer.subarray(0, count));
}

function sameAttrs(a: Map<number, unknown>, b: Map<number, unknown>): boolean {
  return a.size === b.size && [...a].every(([type, value]) => b.get(type) === value);
}

function must<T>(value: T | undefined): T {
  assert.ok(value !== undefined);
  return value;
}

const TYPE_MIN = 1;
const TYPE_MAX = 26;

function fake(): Record<string, unknown> {
  return {
    disposeHandle(handle: FakeHandle) {
      if (!handle.disposed) {
        handle.disposed = true;
        release(handle.core);
      }
    },
    isHandleMutable: (handle: FakeHandle) => live(handle).kind === "mutable",
    handleEquals: (a: FakeHandle, b: FakeHandle) => live(a).core === live(b).core,
    TRTextCreate(units: Uint16Array | undefined, length: number, encoding: number) {
      calls.push(`create ${length} ${units === undefined ? "none" : "buffer"} ${encoding}`);
      if (units === undefined && length !== 0) return undefined;
      return makeText(unitsOf(units, length), false);
    },
    TRTextCreateMutable(encoding: number) {
      calls.push(`createMutable ${encoding}`);
      return makeText([], true);
    },
    TRTextCreateCopy(handle: FakeHandle) {
      const source = textOf(handle);
      return handleOf(core("text", { units: [...source.units], attrs: source.attrs.map(cloneAttrs) }));
    },
    TRTextCreateMutableCopy(handle: FakeHandle) {
      const source = textOf(handle);
      return handleOf(core("mutable", { units: [...source.units], attrs: source.attrs.map(cloneAttrs) }));
    },
    TRTextGetLength: (handle: FakeHandle) => textOf(handle).units.length,
    TRTextGetCodeUnits(handle: FakeHandle, index: number, length: number, buffer: Uint16Array) {
      calls.push(`getCodeUnits ${index} ${length}`);
      const text = textOf(handle);
      if (index + length > text.units.length) return false;
      buffer.set(text.units.slice(index, index + length));
      return true;
    },
    TRTextCopyAttributes(handle: FakeHandle, index: number) {
      const text = textOf(handle);
      if (index >= text.units.length) return { result: undefined, outLength: 0 };
      const first = must(text.attrs[index]);
      let end = index + 1;
      while (end < text.units.length && sameAttrs(must(text.attrs[end]), first)) end++;
      const entries = [...first].map(([type, value]) => ({ type, value }));
      for (const entry of entries) {
        if (typeof entry.value === "object") retain(entry.value);
      }
      return { result: handleOf(core("list", { entries })), outLength: end - index };
    },
    TRAttributeListGetCount: (handle: FakeHandle) => must(live(handle).core.entries).length,
    TRAttributeListGetItem: (handle: FakeHandle, index: number) => ({ entry: must(live(handle).core.entries)[index] }),
    readPointerStructs(view: { entry?: { type: number; value: unknown }; items?: unknown[] }, count: number, from: number, to: number) {
      if (view.items !== undefined) return view.items.slice(from, to);
      const { type, value } = must(view.entry);
      // A handle that is read is a reference of its own.
      if (typeof value === "object") {
        retain(value);
        return [{ type, value: handleOf(value as Core) }];
      }
      return [{ type, value }];
    },
    TRTextBeginEditing: (handle: FakeHandle) => { calls.push("begin"); live(handle); },
    TRTextEndEditing: (handle: FakeHandle) => { calls.push("end"); live(handle); },
    TRTextAppendCodeUnits(handle: FakeHandle, units: Uint16Array, count: number) {
      calls.push(`append ${count}`);
      if (failNext.delete("append")) return false;
      const text = textOf(handle);
      text.units.push(...unitsOf(units, count));
      for (let i = 0; i < count; i++) text.attrs.push(new Map());
      return true;
    },
    TRTextInsertCodeUnits(handle: FakeHandle, index: number, units: Uint16Array, count: number) {
      calls.push(`insert ${index} ${count}`);
      const text = textOf(handle);
      text.units.splice(index, 0, ...unitsOf(units, count));
      text.attrs.splice(index, 0, ...Array.from({ length: count }, () => new Map()));
      return true;
    },
    TRTextDeleteCodeUnits(handle: FakeHandle, index: number, length: number) {
      calls.push(`delete ${index} ${length}`);
      const text = textOf(handle);
      text.units.splice(index, length);
      text.attrs.splice(index, length);
      return true;
    },
    TRTextSetCodeUnits(handle: FakeHandle, units: Uint16Array | undefined, count: number) {
      calls.push(`setCodeUnits ${count} ${units === undefined ? "none" : "buffer"}`);
      const text = textOf(handle);
      text.units = unitsOf(units, count);
      text.attrs = text.units.map(() => new Map());
      return true;
    },
    TRTextReplaceCodeUnits(handle: FakeHandle, index: number, length: number, units: Uint16Array | undefined, count: number) {
      calls.push(`replace ${index} ${length} ${count} ${units === undefined ? "none" : "buffer"}`);
      const text = textOf(handle);
      const inherited = text.attrs[index] ?? new Map();
      text.units.splice(index, length, ...unitsOf(units, count));
      text.attrs.splice(index, length, ...Array.from({ length: count }, () => cloneAttrs(inherited)));
      return true;
    },
    TRTextSetAttribute(handle: FakeHandle, index: number, length: number, attribute: { type: number; value: unknown }) {
      calls.push(`setAttribute ${index} ${length} ${attribute.type}`);
      const text = textOf(handle);
      if (index + length > text.units.length || attribute.type < TYPE_MIN || attribute.type > TYPE_MAX) return false;
      if (failNext.delete("setAttribute")) return false;
      for (let i = index; i < index + length; i++) {
        const map = must(text.attrs[i]);
        const old = map.get(attribute.type);
        if (typeof old === "object") release(old as Core);
        if (typeof attribute.value === "object") {
          const target = (attribute.value as FakeHandle).core;
          live(attribute.value as FakeHandle);
          retain(target);
          map.set(attribute.type, target);
        } else {
          map.set(attribute.type, attribute.value);
        }
      }
      return true;
    },
    TRTextRemoveAttribute(handle: FakeHandle, index: number, length: number, type: number) {
      calls.push(`removeAttribute ${index} ${length} ${type}`);
      const text = textOf(handle);
      if (index + length > text.units.length || type < TYPE_MIN || type > TYPE_MAX) return false;
      for (let i = index; i < index + length; i++) {
        const old = must(text.attrs[i]).get(type);
        if (typeof old === "object") release(old as Core);
        must(text.attrs[i]).delete(type);
      }
      return true;
    },
    TRFontFeaturesCreate(features: unknown[]) {
      calls.push("createFontFeatures");
      return handleOf(core("features", { items: features }));
    },
    TRFontFeaturesGetCount: (handle: FakeHandle) => must(live(handle).core.items).length,
    TRFontFeaturesGetItemsPtr: (handle: FakeHandle) => ({ items: live(handle).core.items }),
  };
}

before(async () => {
  out = compileModules([
    "src/layout/TText.ts", "src/layout/TMutableText.ts", "src/graphics/Typeface.ts", "src/sfnt/FontFeatures.ts",
  ]);
  TText = ((await importModule(out, "layout/TText.js")) as { TText: typeof TText }).TText;
  TMutableText = ((await importModule(out, "layout/TMutableText.js")) as { TMutableText: typeof TMutableText }).TMutableText;
  Typeface = ((await importModule(out, "graphics/Typeface.js")) as { Typeface: typeof Typeface }).Typeface;
  FontFeatures = ((await importModule(out, "sfnt/FontFeatures.js")) as { FontFeatures: typeof FontFeatures }).FontFeatures;
});

beforeEach(() => {
  calls = [];
  cores = [];
  failNext = new Set();
  (globalThis as Record<string, unknown>)["__tehreer"] = fake();
});

after(() => {
  delete (globalThis as Record<string, unknown>)["__tehreer"];
  rmSync(out, { recursive: true, force: true });
});

function typeface(): Wrapper {
  return Typeface.adopting(handleOf(core("typeface")));
}

function refsOf(wrapper: Wrapper): number {
  return wrapper.nativeHandle.core.refs;
}

/** The types of TRAttribute.h by member name, as the header lists them. */
function headerTypes(): Map<string, number> {
  const header = readFileSync(join(import.meta.dirname, "../Libraries/TehreerCore/Headers/Tehreer/TRAttribute.h"), "utf8");
  const body = /enum\s*\{([\s\S]*?)\};\s*(?:\/\*[\s\S]*?\*\/\s*)?typedef\s+TRUInt32\s+TRAttributeType;/.exec(header)?.[1] ?? "";
  const types = new Map<string, number>();
  for (const [, name, value] of body.matchAll(/TRAttribute(\w+)\s*=\s*(\d+)/g)) {
    const member = name === "Language" ? "languageTag" : must(name).charAt(0).toLowerCase() + must(name).slice(1);
    types.set(member, Number(value));
  }
  return types;
}

const EVERY_ATTRIBUTE: Attributes = {
  typeSize: 12.5,
  scaleX: 1.5,
  scaleY: 0.5,
  baselineOffset: 2,
  obliqueness: -0.25,
  foregroundColor: 0x80ff0000,
  backgroundColor: 0xff00ff00,
  underline: true,
  strikethrough: false,
  decorationColor: 0xff0000ff,
  userData: 4242,
  languageTag: 0x55524420,
  textAlignment: 1,
  firstLineHeadIndent: 10,
  headIndent: 8,
  tailIndent: -4,
  firstIndentLineCount: 2,
  paragraphSpacingBefore: 3,
  paragraphSpacing: 5,
  lineHeightMultiple: 1.25,
  minimumLineHeight: 14,
  maximumLineHeight: 40,
  lineSpacing: 2,
};

test("a text keeps its string, and an empty one is made with no buffer", () => {
  const text = new TText("abc");
  assert.equal(text.length, 3);
  assert.equal(text.string, "abc");
  assert.equal(text.getString(1, 3), "bc");
  assert.equal(text.getString(2, 2), "");
  assert.equal(`${text}`, "abc");
  assert.equal(calls[0], "create 3 buffer 1", "UTF-16 is encoding 1");

  calls = [];
  assert.equal(new TText("").length, 0);
  assert.equal(calls[0], "create 0 none 1");
  assert.throws(() => new TText(5 as unknown as string), TypeError);
});

test("indices are code units: a range may end inside a surrogate pair, and lone surrogates survive", () => {
  const text = new TText("a\u{1F600}b");
  assert.equal(text.length, 4);
  assert.equal(text.getString(1, 3), "\u{1F600}");
  assert.equal(text.getString(1, 2), "\ud83d", "the high half alone");
  assert.equal(text.getString(2, 3), "\ude00", "the low half alone");

  const lone = new TText("\ud800x\udc00");
  assert.equal(lone.string, "\ud800x\udc00");

  const mutable = new TMutableText("a\u{1F600}");
  mutable.setAttributes(2, 3, { typeSize: 9 });
  assert.equal(mutable.getAttributeRun(1)?.length, 1, "the pair is split by the range, as Core counts units");
  assert.equal(mutable.getAttributeRun(2)?.attributes["typeSize"], 9);
  mutable.delete(2, 3);
  assert.equal(mutable.length, 2);
});

test("a long string is read in chunks", () => {
  const long = "ab".repeat(40000);
  assert.equal(new TText(long).string, long);
});

test("every attribute that the wrapper supports has the Core type of its name in TRAttribute.h", () => {
  const types = headerTypes();
  types.delete("replacement");
  assert.equal(types.size, 25, "25 supported attributes; replacement waits for issue #21");

  const text = new TMutableText("a");
  for (const [name, type] of types) {
    calls = [];
    const value = name === "typeface" ? typeface() : name === "fontFeatures" ? [{ tag: 1, value: 1 }] : EVERY_ATTRIBUTE[name];
    assert.ok(value !== undefined, `${name} has a test value`);
    text.setAttributes(0, 1, { [name]: value });
    assert.ok(calls.includes(`setAttribute 0 1 ${type}`), `${name} is type ${type}: ${calls.join(", ")}`);
  }
});

test("every kind of attribute is stored and read back", () => {
  const text = new TMutableText("abc");
  const face = typeface();
  text.setAttributes(0, 3, { ...EVERY_ATTRIBUTE, typeface: face, fontFeatures: [{ tag: 0x6c696761, value: 0 }] });

  const run = must(text.getAttributeRun(0));
  assert.equal(run.length, 3);
  const { typeface: readFace, fontFeatures, ...plain } = run.attributes;
  assert.deepEqual(plain, EVERY_ATTRIBUTE);
  assert.ok(must(readFace).equals(face));
  assert.notEqual(readFace, face, "a read gives a wrapper of its own");
  assert.ok(fontFeatures !== undefined);
  assert.deepEqual(fontFeatures.items.toArray(), [{ tag: 0x6c696761, value: 0 }]);
});

test("attributes come back as runs, a later one replacing the earlier in its part", () => {
  const text = new TMutableText("abcde");
  text.setAttributes(0, 3, { typeSize: 20 });
  text.setAttributes(2, 5, { foregroundColor: 0xff112233 });

  assert.deepEqual(text.getAttributeRun(0), { attributes: { typeSize: 20 }, length: 2 });
  assert.deepEqual(text.getAttributeRun(2), { attributes: { typeSize: 20, foregroundColor: 0xff112233 }, length: 1 });
  assert.deepEqual(text.getAttributeRun(3), { attributes: { foregroundColor: 0xff112233 }, length: 2 });
  assert.equal(text.getAttributeRun(5), undefined, "an index at the length has no run");
  assert.equal(text.getAttributeRun(500), undefined);
  assert.deepEqual(new TText("").getAttributeRun(0), undefined);
});

test("attributes are removed from ranges, and one that is not set is left alone", () => {
  const text = new TMutableText("abcd");
  text.setAttributes(0, 4, { typeSize: 10, underline: true });
  text.removeAttributes(1, 3, "typeSize", "underline", "scaleX");

  assert.equal(text.getAttributeRun(0)?.length, 1);
  assert.deepEqual(text.getAttributeRun(1), { attributes: {}, length: 2 });
  assert.equal(text.getAttributeRun(3)?.attributes["typeSize"], 10);
});

test("invalid ranges are a RangeError, and nothing reaches Core", () => {
  const text = new TMutableText("abc");
  calls = [];
  const bad: [number, number][] = [[2, 4], [-1, 2], [3, 2], [0.5, 2], [0, NaN], [0, Infinity], [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1]];
  for (const [from, to] of bad) {
    const label = `${from}..${to}`;
    assert.throws(() => text.getString(from, to), RangeError, `getString ${label}`);
    assert.throws(() => text.delete(from, to), RangeError, `delete ${label}`);
    assert.throws(() => text.replace(from, to, "x"), RangeError, `replace ${label}`);
    assert.throws(() => text.setAttributes(from, to, { typeSize: 1 }), RangeError, `setAttributes ${label}`);
    assert.throws(() => text.removeAttributes(from, to, "typeSize"), RangeError, `removeAttributes ${label}`);
  }
  for (const index of [4, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => text.insert(index, "x"), RangeError, `insert ${index}`);
  }
  for (const index of [-1, 1.5, NaN, Infinity, -Infinity]) {
    assert.throws(() => text.getAttributeRun(index), RangeError, `getAttributeRun ${index}`);
  }
  assert.deepEqual(calls.filter((call) => !call.startsWith("getCodeUnits")), []);
  assert.equal(text.string, "abc");

  text.insert(3, "d");
  assert.equal(text.string, "abcd", "the end is a valid insertion point");
});

test("an empty range is valid and changes nothing", () => {
  const text = new TMutableText("abc");
  calls = [];
  text.setAttributes(1, 1, { typeSize: 3 });
  text.removeAttributes(1, 1, "typeSize");
  text.delete(2, 2);
  assert.deepEqual(calls, []);
  assert.deepEqual(text.getAttributeRun(0), { attributes: {}, length: 3 });
});

test("editing passes code units, takes no buffer for no code units, and batches", () => {
  const text = new TMutableText("hello");
  text.append(" world");
  text.insert(5, ",");
  assert.equal(text.string, "hello, world");
  text.delete(5, 6);
  text.replace(0, 5, "HELLO");
  assert.equal(text.string, "HELLO world");
  text.setString("again");
  assert.equal(text.string, "again");

  calls = [];
  text.append("");
  text.insert(1, "");
  assert.deepEqual(calls, [], "appending nothing is not a call: Core refuses a missing buffer there");
  text.replace(0, 2, "");
  text.setString("");
  assert.deepEqual(calls, ["replace 0 2 0 none", "setCodeUnits 0 none"]);
  assert.throws(() => text.append(5 as unknown as string), TypeError);

  calls = [];
  text.edit((editing) => {
    assert.equal(editing, text);
    editing.append("a");
  });
  assert.deepEqual(calls, ["begin", "append 1", "end"]);

  calls = [];
  assert.throws(() => text.edit(() => { throw new Error("boom"); }), /boom/);
  assert.deepEqual(calls, ["begin", "end"], "the batch ends when the body throws");
});

test("a mutable text is made with its string, and is disposed if the string cannot be added", () => {
  const text = new TMutableText("ab");
  assert.equal(text.string, "ab");
  assert.equal(new TMutableText().length, 0);

  calls = [];
  failNext.add("append");
  assert.throws(() => new TMutableText("x"), /append/);
  const abandoned = cores.filter((c) => c.kind === "mutable").at(-1);
  assert.equal(abandoned?.refs, 0, "the text that was made is released");
  const made = cores.length;
  assert.throws(() => new TMutableText(1 as unknown as string), TypeError);
  assert.equal(cores.length, made, "a bad string creates nothing");
});

test("a copy does not change when its source does, and the other way round", () => {
  const source = new TMutableText("abc");
  source.setAttributes(0, 3, { typeSize: 10 });
  const copy = source.copy();
  const again = copy.mutableCopy();

  source.append("d");
  source.setAttributes(0, 1, { typeSize: 99 });
  again.append("e");
  again.removeAttributes(0, 3, "typeSize");

  assert.equal(copy.string, "abc");
  assert.deepEqual(copy.getAttributeRun(0), { attributes: { typeSize: 10 }, length: 3 });
  assert.equal(again.string, "abce");
  assert.equal(source.string, "abcd");
  assert.equal(source.getAttributeRun(0)?.attributes["typeSize"], 99);
  assert.ok(!(copy as unknown as MutableLike).append, "a copy is immutable");
  assert.ok(again instanceof TMutableText);
  assert.ok(!copy.equals(source));
});

test("a replacement keeps the attributes of the range that it replaces", () => {
  const text = new TMutableText("abcd");
  text.setAttributes(0, 4, { typeSize: 10 });
  text.replace(1, 3, "XYZ");
  assert.equal(text.string, "aXYZd");
  assert.deepEqual(text.getAttributeRun(0), { attributes: { typeSize: 10 }, length: 5 });
});

test("a bad attribute changes nothing, even after a good one", () => {
  const text = new TMutableText("abc");
  const cases: [string, Attributes, ErrorConstructor | RangeErrorConstructor | TypeErrorConstructor][] = [
    ["unknown name", { typeSize: 3, bogus: 1 }, TypeError],
    ["inherited name", { typeSize: 3, constructor: 1 }, TypeError],
    ["replacement is not supported yet", { typeSize: 3, replacement: {} }, TypeError],
    ["string size", { typeSize: "3" }, TypeError],
    ["NaN size", { typeSize: 3, scaleX: NaN }, RangeError],
    ["infinite size", { scaleY: Infinity }, RangeError],
    ["number underline", { underline: 1 }, TypeError],
    ["negative color", { foregroundColor: -1 }, RangeError],
    ["fraction color", { backgroundColor: 1.5 }, RangeError],
    ["big color", { decorationColor: 2 ** 32 }, RangeError],
    ["negative user data", { userData: -1 }, RangeError],
    ["fraction user data", { userData: 0.5 }, RangeError],
    ["invalid count", { firstIndentLineCount: -1 }, RangeError],
    ["fraction count", { firstIndentLineCount: 1.5 }, RangeError],
    ["bad tag", { languageTag: -1 }, RangeError],
    ["bad alignment", { textAlignment: "left" }, TypeError],
    ["typeface that is not one", { typeSize: 3, typeface: {} }, TypeError],
    ["features that are not a list", { fontFeatures: 3 }, TypeError],
  ];
  for (const [label, attributes, error] of cases) {
    calls = [];
    assert.throws(() => text.setAttributes(0, 3, attributes), error, label);
    assert.ok(!calls.some((call) => call.startsWith("setAttribute")), `${label}: nothing was set`);
  }
  assert.throws(() => text.setAttributes(0, 3, null as unknown as Attributes), TypeError);
  assert.deepEqual(text.getAttributeRun(0), { attributes: {}, length: 3 });
  assert.throws(() => text.removeAttributes(0, 3, "typeSize", "bogus"), TypeError);
  assert.throws(() => text.removeAttributes(0, 3, "replacement"), TypeError);
  assert.ok(!calls.some((call) => call.startsWith("removeAttribute")), "no removal happens when a name is bad");

  // A member that is undefined is not set.
  calls = [];
  text.setAttributes(0, 3, { typeSize: undefined });
  assert.deepEqual(calls, []);
});

test("an attribute that Core refuses is an Error, and the temporary features are still disposed", () => {
  const text = new TMutableText("abc");
  failNext.add("setAttribute");
  assert.throws(() => text.setAttributes(0, 3, { fontFeatures: [{ tag: 1, value: 1 }] }), /Could not set the attribute: fontFeatures/);
  const features = cores.find((c) => c.kind === "features");
  assert.equal(features?.refs, 0, "the temporary set was released");
});

test("the text retains typefaces and features, and the caller's wrapper can be disposed after the call", () => {
  const text = new TMutableText("abc");
  const face = typeface();
  const given = new FontFeatures([{ tag: 1, value: 1 }]);

  text.setAttributes(0, 3, { typeface: face, fontFeatures: given });
  assert.equal(refsOf(face), 1 + 3, "one reference for each code unit of the range, as the fake keeps");
  face.dispose();
  given.dispose();

  const run = must(text.getAttributeRun(0));
  assert.ok(run.attributes.typeface && !run.attributes.typeface.isDisposed);
  assert.ok(run.attributes.fontFeatures && !run.attributes.fontFeatures.isDisposed);
  const faceCore = run.attributes.typeface.nativeHandle.core;
  run.attributes.typeface.dispose();
  run.attributes.fontFeatures.dispose();
  assert.equal(faceCore.refs, 3, "only the three that the text holds are left");

  text.dispose();
  assert.equal(faceCore.refs, 0, "disposing the text lets go of the typeface");
});

test("a features list that is given as an array makes one temporary set, and a set that is given is not disposed", () => {
  const text = new TMutableText("ab");
  const given = new FontFeatures([{ tag: 1, value: 1 }]);
  calls = [];
  text.setAttributes(0, 2, { fontFeatures: given });
  assert.ok(!calls.includes("createFontFeatures"));
  assert.equal(given.isDisposed, false);

  text.setAttributes(0, 2, { fontFeatures: [{ tag: 2, value: 1 }] });
  assert.equal(calls.filter((c) => c === "createFontFeatures").length, 1);
});

test("reading attributes gives the list back and the references of what was read", () => {
  const text = new TMutableText("a");
  const face = typeface();
  text.setAttributes(0, 1, { typeface: face });
  const before = refsOf(face);

  const run = must(text.getAttributeRun(0));
  const list = must(cores.find((c) => c.kind === "list"));
  assert.equal(list.refs, 0, "the list is released after the read");
  assert.equal(refsOf(face), before + 1, "the wrapper that was read owns one reference");
  must(run.attributes.typeface).dispose();
  assert.equal(refsOf(face), before);
});

test("a replacement that a text holds is skipped, and its reference is given back", () => {
  const text = new TMutableText("a");
  // Not settable through the wrapper; Core could have it from another way, so reading must cope.
  const replacement = core("replacement");
  const inner = textOf(text.nativeHandle);
  must(inner.attrs[0]).set(7, replacement);
  must(inner.attrs[0]).set(2, 9);

  const run = must(text.getAttributeRun(0));
  assert.deepEqual(run.attributes, { typeSize: 9 });
  assert.equal(replacement.refs, 1, "only the text holds it");
});

test("use after dispose throws, and dispose can be repeated", () => {
  const text = new TMutableText("abc");
  const copy = text.copy();
  text.dispose();
  text.dispose();
  assert.equal(text.isDisposed, true);

  const message = /already disposed/;
  assert.throws(() => text.length, message);
  assert.throws(() => text.string, message);
  assert.throws(() => text.getString(0, 1), message);
  assert.throws(() => text.getAttributeRun(0), message);
  assert.throws(() => text.copy(), message);
  assert.throws(() => text.mutableCopy(), message);
  assert.throws(() => text.append("x"), message);
  assert.throws(() => text.insert(0, "x"), message);
  assert.throws(() => text.delete(0, 1), message);
  assert.throws(() => text.replace(0, 1, "x"), message);
  assert.throws(() => text.setString("x"), message);
  assert.throws(() => text.setAttributes(0, 1, { typeSize: 1 }), message);
  assert.throws(() => text.removeAttributes(0, 1, "typeSize"), message);
  assert.throws(() => text.beginEditing(), message);
  assert.throws(() => text.endEditing(), message);
  assert.throws(() => text.equals(copy), message);

  assert.equal(copy.string, "abc", "a copy lives on");
  const disposedFace = typeface();
  const live = new TMutableText("a");
  disposedFace.dispose();
  assert.throws(() => live.setAttributes(0, 1, { typeface: disposedFace }), /already disposed/);
  assert.deepEqual(live.getAttributeRun(0), { attributes: {}, length: 1 });
});
