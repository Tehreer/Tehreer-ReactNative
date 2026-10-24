import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, before, beforeEach, test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";

// The layout wrappers run over a fake of Core's layout objects: reference counts, the arguments that
// reach each binding, and what a binding returns for a range that is not in the text. What is checked
// is what the TypeScript layer decides: argument checks before Core is asked, the mapping of Core's
// `NULL`, -1 and `TRFalse` to errors, ownership of every object that a getter hands out, the state
// that a replacement and a line locator keep, and use after dispose. Core's own geometry is tested on
// a device against the numbers of Tehreer-Web (example/tests/LayoutTests.ts).

interface Core {
  kind: string;
  refs: number;
  data: Record<string, unknown>;
}

interface FakeHandle {
  core: Core;
  disposed: boolean;
}

interface Wrapper {
  readonly isDisposed: boolean;
  dispose(): void;
  readonly nativeHandle: FakeHandle;
}

interface RunLike extends Wrapper {
  readonly glyphIds: { length: number; get(index: number): number; toArray(): number[] };
  readonly glyphOffsets: { length: number; toArray(): unknown[] };
  readonly glyphAdvances: { length: number; toArray(): number[] };
  readonly clusterMap: { length: number; toArray(): number[] };
  readonly typeface: Wrapper | undefined;
  readonly replacement: Wrapper | undefined;
  readonly foregroundColor: number | undefined;
  readonly userData: number;
  getCodeUnitDistance(index: number): number;
  getClusterStart(index: number): number;
  computeInkBox(renderer: unknown): unknown;
}

interface LineLike extends Wrapper {
  readonly runs: { length: number; get(index: number): RunLike };
  getCodeUnitDistance(index: number): number;
  getVisualEdges(from: number, to: number): unknown[];
  computeInkBox(renderer: unknown): unknown;
}

interface FrameLike extends Wrapper {
  readonly lines: { length: number; get(index: number): LineLike; toArray(): LineLike[] };
  getLineIndexForCodeUnit(index: number): number;
  getSelectionRects(from: number, to: number): unknown[];
}

interface TypesetterLike extends Wrapper {
  readonly codeUnitCount: number;
  suggestForwardBreak(from: number, to: number, extent: number, mode: number): number;
  suggestBackwardBreak(from: number, to: number, extent: number, mode: number): number;
  createSimpleLine(from: number, to: number, width?: number): LineLike;
  createTruncationToken(from: number, to: number, place: number, token?: string): LineLike;
  createTruncatedLine(from: number, to: number, extent: number, mode: number, place: number, token: LineLike): LineLike;
  createJustifiedLine(from: number, to: number, factor: number, extent: number): LineLike;
}

interface ResolverLike extends Wrapper {
  typesetter: TypesetterLike | undefined;
  frameWidth: number;
  frameHeight: number;
  maxLines: number | undefined;
  [setting: string]: unknown;
  createFrame(from: number, to: number): FrameLike;
}

interface LocatorLike extends Wrapper {
  readonly lineCount: number;
  getLineBox(index: number): unknown;
  findLines(bounds: unknown): number[];
  getFirstLineIndexBelow(y: number): number;
}

let out: string;
let Typesetter: { new (text: unknown, defaults?: Record<string, unknown>): TypesetterLike };
let FrameResolver: { new (): ResolverLike };
let LineLocator: { new (frame: unknown, renderer: unknown): LocatorLike };
let Replacement: { new (delegate: unknown, kind?: number): Wrapper & { kind: number; computeRoom(width: number): unknown } };
let Renderer: { new (): Wrapper };
let Typeface: { adopting(handle: FakeHandle): Wrapper };
let TText: { new (text: string): Wrapper };
let ComposedLine: { adopting(handle: FakeHandle): LineLike };
let ComposedFrame: { adopting(handle: FakeHandle): FrameLike };

let cores: Core[];
let calls: string[];
let attributesSeen: { type: number; value: unknown }[] | undefined | null;
let failNext: Set<string>;
/** Runs inside the Core call of the bindings that can reach a replacement, as its computeRoom would. */
let duringCall: (() => void) | undefined;
const TEXT_LENGTH = 10;

function core(kind: string, data: Record<string, unknown> = {}): Core {
  const made = { kind, refs: 1, data };
  cores.push(made);
  return made;
}

function handleOf(target: Core): FakeHandle {
  return { core: target, disposed: false };
}

function live(handle: FakeHandle): Core {
  if (handle.disposed) {
    throw new Error("handle is already disposed");
  }
  return handle.core;
}

/** A getter that retains for the caller: the handle it returns owns a reference of its own. */
function retained(target: Core): FakeHandle {
  target.refs++;
  return handleOf(target);
}

function must<T>(value: T | undefined): T {
  assert.ok(value !== undefined);
  return value;
}

/** Gives a reference back; what an object holds goes back with the last one, as in Core. */
function release(target: Core): void {
  target.refs--;
  if (target.refs > 0) {
    return;
  }
  for (const attribute of (target.data["attributes"] as { value: unknown }[] | undefined) ?? []) {
    if (typeof attribute.value === "object") release((attribute.value as FakeHandle).core);
  }
  const held = target.data["typesetter"] as Core | undefined;
  if (held !== undefined) release(held);
}

function retainer(): (handle: FakeHandle) => FakeHandle {
  return (handle) => retained(live(handle));
}

function fake(): Record<string, unknown> {
  const settings = new Map<string, unknown>();
  const rect = { origin: { x: 1, y: 2 }, size: { width: 3, height: 4 } };
  const line = (from: number, to: number) => handleOf(core("line", { from, to, runs: 2 }));
  const inText = (from: number, length: number) => from + length <= TEXT_LENGTH;

  return {
    disposeHandle(handle: FakeHandle) {
      if (!handle.disposed) {
        handle.disposed = true;
        release(handle.core);
      }
    },
    isHandleMutable: () => false,
    handleEquals: (a: FakeHandle, b: FakeHandle) => live(a) === live(b),
    retainHandle: (handle: FakeHandle) => retained(live(handle)),
    createPointerBuffer(view: { memory: ArrayBuffer }) {
      calls.push("buffer");
      return view.memory;
    },
    TRTextCreate: (units: Uint16Array | undefined, length: number) => handleOf(core("text", { length })),
    // A typesetter looks at the runs of its text for replacements; these texts have no attributes.
    TRTextGetLength: (handle: FakeHandle) => handle.core.data.length,
    TRTextCopyAttributes: () => ({ result: undefined, outLength: 0 }),
    TRFontFeaturesCreate: () => handleOf(core("features")),
    TRRendererCreate: () => handleOf(core("renderer")),
    TRRendererRetain: retainer(),
    TRReplacementCreate(handler: unknown, kind: number) {
      calls.push(`createReplacement ${kind}`);
      return handleOf(core("replacement", { handler, kind }));
    },
    TRReplacementGetKind: (handle: FakeHandle) => live(handle).data["kind"],
    TRReplacementComputeRoom(handle: FakeHandle, width: number) {
      duringCall?.();
      const handler = live(handle).data["handler"] as { computeRoom(width: number): unknown };
      return handler.computeRoom(width);
    },
    TRTypesetterCreate(text: FakeHandle, attributes: { type: number; value: unknown }[] | undefined) {
      live(text);
      attributesSeen = attributes;
      duringCall?.();
      live(text);
      for (const attribute of attributes ?? []) {
        if (typeof attribute.value === "object") live(attribute.value as FakeHandle);
      }
      calls.push("createTypesetter");
      if (failNext.delete("createTypesetter")) return undefined;
      for (const attribute of attributes ?? []) {
        if (typeof attribute.value === "object") live(attribute.value as FakeHandle).refs++;
      }
      return handleOf(core("typesetter", { attributes }));
    },
    TRTypesetterRetain: retainer(),
    TRTypesetterGetCodeUnitCount: () => TEXT_LENGTH,
    TRTypesetterSuggestForwardBreak(handle: FakeHandle, index: number, length: number, extent: number, mode: number) {
      live(handle);
      calls.push(`forward ${index} ${length} ${extent} ${mode}`);
      return inText(index, length) ? index + Math.min(length, 3) : -1;
    },
    TRTypesetterSuggestBackwardBreak(handle: FakeHandle, index: number, length: number) {
      live(handle);
      return inText(index, length) ? index : -1;
    },
    TRTypesetterCreateSimpleLine(handle: FakeHandle, index: number, length: number, width: number) {
      live(handle);
      duringCall?.();
      live(handle);
      calls.push(`simple ${index} ${length} ${width}`);
      return inText(index, length) ? line(index, index + length) : undefined;
    },
    TRTypesetterCreateTruncationToken(handle: FakeHandle, index: number, length: number, place: number, buffer: Uint16Array | undefined, tokenLength: number, encoding: number) {
      live(handle);
      calls.push(`token ${index} ${length} ${place} ${buffer === undefined ? "none" : String.fromCharCode(...buffer)} ${tokenLength} ${encoding}`);
      return inText(index, length) ? line(0, tokenLength) : undefined;
    },
    TRTypesetterCreateTruncatedLine(handle: FakeHandle, index: number, length: number, extent: number, mode: number, place: number, token: FakeHandle) {
      live(handle);
      live(token);
      calls.push(`truncated ${index} ${length} ${mode} ${place}`);
      return inText(index, length) ? line(index, index + length) : undefined;
    },
    TRTypesetterCreateJustifiedLine(handle: FakeHandle, index: number, length: number) {
      live(handle);
      return inText(index, length) ? line(index, index + length) : undefined;
    },
    TRFrameResolverCreate: () => handleOf(core("resolver", { typesetter: undefined, size: { width: Infinity, height: Infinity } })),
    TRFrameResolverGetTypesetter(handle: FakeHandle) {
      const typesetter = live(handle).data["typesetter"] as Core | undefined;
      return typesetter === undefined ? undefined : retained(typesetter);
    },
    TRFrameResolverSetTypesetter(handle: FakeHandle, typesetter: FakeHandle | undefined) {
      const resolver = live(handle);
      const old = resolver.data["typesetter"] as Core | undefined;
      if (typesetter !== undefined) live(typesetter).refs++;
      if (old !== undefined) release(old);
      resolver.data["typesetter"] = typesetter === undefined ? undefined : typesetter.core;
    },
    TRFrameResolverGetFrameSize: (handle: FakeHandle) => live(handle).data["size"],
    TRFrameResolverSetFrameSize(handle: FakeHandle, size: unknown) {
      calls.push(`size ${JSON.stringify(size)}`);
      live(handle).data["size"] = size;
    },
    TRFrameResolverGetMaxLines: (handle: FakeHandle) => settings.get(`maxLines ${live(handle).kind}`) ?? 0,
    TRFrameResolverSetMaxLines(handle: FakeHandle, count: number) {
      calls.push(`maxLines ${count}`);
      settings.set(`maxLines ${live(handle).kind}`, count);
    },
    TRFrameResolverSetTextAlignment(handle: FakeHandle, value: number) {
      live(handle);
      calls.push(`textAlignment ${value}`);
    },
    TRFrameResolverSetFitsVertically(handle: FakeHandle, value: boolean) {
      live(handle);
      calls.push(`fitsVertically ${String(value)}`);
    },
    TRFrameResolverCreateFrame(handle: FakeHandle, index: number, length: number) {
      const resolver = live(handle);
      calls.push(`frame ${index} ${length}`);
      assert.ok(resolver.data["typesetter"] !== undefined, "a frame is not made without a typesetter");
      duringCall?.();
      live(handle);
      return inText(index, length) ? handleOf(core("frame", { from: index, to: index + length, lines: 3 })) : undefined;
    },
    TRComposedFrameRetain: retainer(),
    TRComposedFrameGetLineCount: (handle: FakeHandle) => live(handle).data["lines"],
    TRComposedFrameGetLine(handle: FakeHandle, index: number) {
      const frame = live(handle);
      if (index >= (frame.data["lines"] as number)) return undefined;
      return handleOf(core("line", { from: index, to: index + 1, runs: 1 }));
    },
    TRComposedFrameGetLineIndexForCodeUnit(handle: FakeHandle, index: number) {
      live(handle);
      return index > TEXT_LENGTH ? -1 : 0;
    },
    TRComposedFrameEnumerateSelection(handle: FakeHandle, index: number, length: number) {
      live(handle);
      calls.push(`selection ${index} ${length}`);
      return inText(index, length) ? [rect] : undefined;
    },
    TRComposedLineGetGlyphRunCount: (handle: FakeHandle) => live(handle).data["runs"],
    TRComposedLineGetGlyphRun(handle: FakeHandle, index: number) {
      const owner = live(handle);
      if (index >= (owner.data["runs"] as number)) return undefined;
      return handleOf(core("run", {}));
    },
    TRComposedLineGetCodeUnitDistance(handle: FakeHandle, index: number) {
      live(handle);
      return index > 3 ? undefined : index * 2;
    },
    TRComposedLineEnumerateVisualEdges(handle: FakeHandle, index: number, length: number) {
      live(handle);
      return index + length > 3 ? undefined : [{ left: 0, right: 1 }];
    },
    TRComposedLineComputeInkBox(line: FakeHandle, renderer: FakeHandle) {
      live(line);
      live(renderer);
      return rect;
    },
    TRGlyphRunGetGlyphCount: () => 2,
    TRGlyphRunGetGlyphIDsPtr(handle: FakeHandle) {
      live(handle);
      calls.push("glyphIdsPtr");
      return { memory: new Uint16Array([7, 9]).buffer };
    },
    TRGlyphRunGetGlyphOffsetsPtr: () => ({ memory: new Float32Array([1, 2, 3, 4]).buffer }),
    TRGlyphRunGetGlyphAdvancesPtr: () => ({ memory: new Float32Array([5, 6]).buffer }),
    TRGlyphRunGetClusterMapCount: () => 3,
    TRGlyphRunGetClusterMapPtr: () => ({ memory: new Uint32Array([0, 0, 1]).buffer }),
    TRGlyphRunGetTypeface: (handle: FakeHandle) => (live(handle) ? handleOf(core("typeface")) : undefined),
    TRGlyphRunGetReplacement: (handle: FakeHandle) => (live(handle).data["replacement"] === undefined ? undefined : retained(live(handle).data["replacement"] as Core)),
    TRGlyphRunGetForegroundColor: () => undefined,
    TRGlyphRunGetUserData: () => 0,
    TRGlyphRunGetClusterStart: (handle: FakeHandle, index: number) => (live(handle) && index < 3 ? 0 : -1),
    TRGlyphRunGetCodeUnitDistance: (handle: FakeHandle, index: number) => (live(handle) && index <= 3 ? index : undefined),
    TRGlyphRunComputeInkBox(run: FakeHandle, renderer: FakeHandle) {
      live(run);
      live(renderer);
      return rect;
    },
    TRLineLocatorCreate(frame: FakeHandle, renderer: FakeHandle) {
      live(frame);
      live(renderer);
      calls.push("createLocator");
      if (failNext.delete("createLocator")) return undefined;
      return handleOf(core("locator", {}));
    },
    TRLineLocatorGetLineCount: (handle: FakeHandle) => (live(handle) ? 3 : 0),
    TRLineLocatorGetLineBox: (handle: FakeHandle, index: number) => (live(handle) && index < 3 ? rect : undefined),
    TRLineLocatorEnumerateLines(handle: FakeHandle, bounds: { size: { width: number } }) {
      live(handle);
      calls.push(`findLines ${JSON.stringify(bounds)}`);
      return bounds.size.width < 0 ? undefined : [0, 1];
    },
    TRLineLocatorGetFirstLineIndexBelow: (handle: FakeHandle, y: number) => (live(handle) && y > 100 ? -1 : 0),
  };
}

before(async () => {
  out = compileModules([
    "src/layout/Typesetter.ts", "src/layout/FrameResolver.ts", "src/layout/LineLocator.ts", "src/layout/Replacement.ts",
    "src/layout/TText.ts", "src/graphics/Renderer.ts", "src/graphics/Typeface.ts", "src/sfnt/FontFeatures.ts",
  ]);
  const load = async <T>(file: string, name: string): Promise<T> => ((await importModule(out, file)) as Record<string, T>)[name] as T;
  Typesetter = await load("layout/Typesetter.js", "Typesetter");
  FrameResolver = await load("layout/FrameResolver.js", "FrameResolver");
  LineLocator = await load("layout/LineLocator.js", "LineLocator");
  Replacement = await load("layout/Replacement.js", "Replacement");
  Renderer = await load("graphics/Renderer.js", "Renderer");
  Typeface = await load("graphics/Typeface.js", "Typeface");
  TText = await load("layout/TText.js", "TText");
  ComposedLine = await load("layout/ComposedLine.js", "ComposedLine");
  ComposedFrame = await load("layout/ComposedFrame.js", "ComposedFrame");
});

beforeEach(() => {
  cores = [];
  calls = [];
  attributesSeen = undefined;
  failNext = new Set();
  duringCall = undefined;
  (globalThis as Record<string, unknown>)["__tehreer"] = fake();
});

after(() => {
  delete (globalThis as Record<string, unknown>)["__tehreer"];
  rmSync(out, { recursive: true, force: true });
});

const room = { ascent: 1, descent: 2, extent: 3 };

function lastAttributes(): { type: number; value: unknown }[] | undefined | null {
  return attributesSeen;
}

function typeface(): Wrapper {
  return Typeface.adopting(handleOf(core("typeface")));
}

function typesetter(): TypesetterLike {
  return new Typesetter("0123456789", { typeface: typeface(), typeSize: 20 });
}

function resolver(): ResolverLike {
  const made = new FrameResolver();
  made.typesetter = typesetter();
  return made;
}

function refs(wrapper: Wrapper): number {
  return wrapper.nativeHandle.core.refs;
}

function renderer(): Wrapper {
  return new Renderer();
}

// ---- Replacement ----

test("a replacement is made of a delegate, which Core calls as itself, and never refers to the wrapper", () => {
  class Box {
    seen: number[] = [];
    computeRoom(width: number) {
      this.seen.push(width);
      return room;
    }
    draw() {}
  }
  const delegate = new Box();
  const replacement = new Replacement(delegate, 1);
  assert.equal(replacement.kind, 1);
  assert.deepEqual(replacement.computeRoom(40), room);
  assert.deepEqual(delegate.seen, [40], "computeRoom ran with the delegate as this");

  const handler = replacement.nativeHandle.core.data["handler"] as Record<string, unknown>;
  assert.deepEqual(Object.keys(handler).sort(), ["computeRoom", "draw"], "the delegate's draw is kept for a painter");
  assert.ok(Object.values(handler).every((member) => typeof member === "function"), "the handler holds the delegate, not the wrapper");
  const plain = new Replacement({ computeRoom: () => room }).nativeHandle.core.data["handler"] as object;
  assert.ok(!("draw" in plain), "no draw, no hook");
});

test("a delegate that is not one, and a kind that is not one, create nothing", () => {
  for (const bad of [undefined, null, 5, {}, { computeRoom: 1 }]) {
    assert.throws(() => new Replacement(bad), TypeError);
  }
  assert.throws(() => new Replacement({ computeRoom: () => room, draw: 1 }), TypeError);
  for (const kind of [2, -1, 0.5, NaN, "0"]) {
    assert.throws(() => new Replacement({ computeRoom: () => room }, kind as number), RangeError);
  }
  assert.equal(calls.length, 0, "nothing reached Core, so no handler was left in the table");
  assert.equal(new Replacement({ computeRoom: () => room }).kind, 0, "the default kind is inline");
});

test("an error from computeRoom reaches the caller, and a disposed replacement is refused", () => {
  const boom = new Error("boom");
  const replacement = new Replacement({ computeRoom() { throw boom; } });
  assert.throws(() => replacement.computeRoom(1), (error) => error === boom, "the very value that was thrown");
  replacement.dispose();
  replacement.dispose();
  assert.throws(() => replacement.computeRoom(1), /already disposed/);
  assert.throws(() => replacement.kind, /already disposed/);
});

// ---- Typesetter ----

test("a typesetter of a string makes and disposes its own text, and a TText is left alone", () => {
  const set = new Typesetter("abc", { typeface: typeface(), typeSize: 12 });
  const text = cores.find((c) => c.kind === "text");
  assert.equal(must(text).refs, 0, "the text made for the string is disposed after Core copied it");
  assert.equal(set.codeUnitCount, TEXT_LENGTH);

  const own = new TText("abc");
  new Typesetter(own, { typeface: typeface() });
  assert.equal(refs(own), 1, "a text that the caller made is not disposed");
});

test("the default attributes reach Core as typed attributes, and temporaries are given back", () => {
  const face = typeface();
  const replacement = new Replacement({ computeRoom: () => room });
  new Typesetter("abc", { typeface: face, typeSize: 14, scaleX: 2, replacement, userData: 3, fontFeatures: [{ tag: 1, value: 1 }], languageTag: 5, baselineOffset: 1, obliqueness: 0.25 });

  const seen = must(lastAttributes() ?? undefined);
  assert.deepEqual(seen.map(({ type }) => type).sort((a, b) => a - b), [1, 2, 3, 5, 6, 7, 20, 21, 22]);
  assert.equal(refs(face), 2, "the typesetter retains the typeface");
  assert.equal(refs(replacement), 2, "and the replacement");
  const features = must(cores.find((c) => c.kind === "features"));
  assert.equal(features.refs, 1, "the typesetter holds the features, the temporary wrapper was disposed");

  new Typesetter("abc", { typeface: face });
  assert.equal(lastAttributes()?.length, 1);
  new Typesetter("abc");
  assert.equal(lastAttributes(), undefined, "no defaults, no array");
});

test("a typesetter that Core cannot make is an Error, and nothing stays held", () => {
  const face = typeface();
  failNext.add("createTypesetter");
  assert.throws(() => new Typesetter("abc", { typeface: face, fontFeatures: [{ tag: 1, value: 1 }] }), /typeface/);
  assert.equal(refs(face), 1);
  assert.equal(must(cores.find((c) => c.kind === "text")).refs, 0);
  assert.equal(must(cores.find((c) => c.kind === "features")).refs, 0);
});

test("a typesetter refuses what is not a text or an attribute before it asks Core", () => {
  assert.throws(() => new Typesetter(5 as never), TypeError);
  assert.throws(() => new Typesetter({} as never), TypeError);
  assert.throws(() => new Typesetter("abc", { bogus: 1 }), TypeError);
  assert.throws(() => new Typesetter("abc", { typeSize: NaN }), RangeError);
  assert.throws(() => new Typesetter("abc", { replacement: {} }), TypeError);
  assert.throws(() => new Typesetter("abc", { typeface: {} }), TypeError);
  assert.equal(calls.length, 0);
  const disposed = new TText("abc");
  disposed.dispose();
  assert.throws(() => new Typesetter(disposed), /already disposed/);
});

test("ranges are checked in TypeScript, and Core's refusal of the upper bound is a RangeError", () => {
  const set = typesetter();
  const invalid: [number, number][] = [[-1, 3], [3, 2], [1.5, 3], [0, NaN], [0, Infinity], [2, 2]];
  for (const [from, to] of invalid) {
    assert.throws(() => set.createSimpleLine(from, to), RangeError, `${from}..${to}`);
    assert.throws(() => set.suggestForwardBreak(from, to, 10, 0), RangeError);
    assert.throws(() => set.suggestBackwardBreak(from, to, 10, 0), RangeError);
    assert.throws(() => set.createJustifiedLine(from, to, 1, 10), RangeError);
  }
  assert.deepEqual(calls.filter((c) => c !== "createTypesetter"), [], "nothing reached Core");

  assert.throws(() => set.createSimpleLine(0, 99), RangeError, "the upper bound is Core's");
  assert.throws(() => set.suggestForwardBreak(0, 99, 10, 0), RangeError, "Core's -1 is a RangeError");
  assert.throws(() => set.suggestBackwardBreak(0, 99, 10, 0), RangeError);
  assert.throws(() => set.createJustifiedLine(0, 99, 1, 10), RangeError);
  assert.equal(set.suggestForwardBreak(0, 5, 10, 1), 3);
  assert.equal(set.suggestBackwardBreak(2, 5, 10, 0), 2);
  assert.ok(calls.includes("forward 0 5 10 1"), "the range is passed as an index and a length");
});

test("lines are made with the range as an index and a length, and own their reference", () => {
  const set = typesetter();
  const line = set.createSimpleLine(2, 7);
  assert.ok(calls.includes("simple 2 5 0"), "the layout width is 0 by default");
  set.createSimpleLine(0, 3, 55);
  assert.ok(calls.includes("simple 0 3 55"));
  assert.equal(refs(line), 1);
  line.dispose();
  assert.equal(line.isDisposed, true);
});

test("a truncation token is an ellipsis when it is omitted or empty, and truncation needs a valid place and token line", () => {
  const set = typesetter();
  set.createTruncationToken(0, 5, 2);
  set.createTruncationToken(0, 5, 1, "");
  set.createTruncationToken(0, 5, 0, "..");
  assert.deepEqual(calls.filter((c) => c.startsWith("token")), ["token 0 5 2 none 0 1", "token 0 5 1 none 0 1", "token 0 5 0 .. 2 1"]);
  assert.throws(() => set.createTruncationToken(0, 5, 3), RangeError);
  assert.throws(() => set.createTruncationToken(0, 5, 2, 7 as never), TypeError);
  assert.throws(() => set.createTruncationToken(0, 99, 2), RangeError);

  const token = set.createTruncationToken(0, 5, 2);
  const truncated = set.createTruncatedLine(0, 10, 50, 0, 2, token);
  assert.equal(truncated.nativeHandle.core.data["to"], 10);
  assert.throws(() => set.createTruncatedLine(0, 10, 50, 2, 2, token), RangeError, "break mode");
  assert.throws(() => set.createTruncatedLine(0, 10, 50, 0, 9, token), RangeError, "place");
  assert.throws(() => set.createTruncatedLine(0, 10, 50, 0, 2, {} as never), TypeError, "token line");
  assert.throws(() => set.createTruncatedLine(3, 3, 50, 0, 2, token), RangeError, "empty");
  token.dispose();
  assert.throws(() => set.createTruncatedLine(0, 10, 50, 0, 2, token), /already disposed/);
});

test("use after dispose of a typesetter throws, and what it made lives on", () => {
  const set = typesetter();
  const line = set.createSimpleLine(0, 3);
  set.dispose();
  set.dispose();
  const message = /already disposed/;
  assert.throws(() => set.codeUnitCount, message);
  assert.throws(() => set.createSimpleLine(0, 1), message);
  assert.throws(() => set.suggestForwardBreak(0, 1, 1, 0), message);
  assert.throws(() => set.createTruncationToken(0, 1, 0), message);
  assert.throws(() => set.createJustifiedLine(0, 1, 1, 1), message);
  assert.equal(line.runs.length, 2, "a line does not depend on its typesetter");
});

// ---- FrameResolver ----

test("a resolver keeps the typesetter it is given in Core, and a read hands out a reference of its own", () => {
  const made = new FrameResolver();
  assert.equal(made.typesetter, undefined);
  const set = typesetter();
  made.typesetter = set;
  assert.equal(refs(set), 2, "Core retains it");
  set.dispose();

  const read = must(made.typesetter);
  assert.equal(read.nativeHandle.core.refs, 2, "the resolver's and the reader's");
  read.dispose();
  assert.equal(must(cores.find((c) => c.kind === "typesetter")).refs, 1, "only the resolver holds it again");
  made.typesetter = undefined;
  assert.equal(made.typesetter, undefined);
  assert.throws(() => { made.typesetter = {} as never; }, TypeError);
});

test("frame width and height keep each other, and an unbounded size is infinite", () => {
  const made = new FrameResolver();
  assert.deepEqual([made.frameWidth, made.frameHeight], [Infinity, Infinity]);
  made.frameWidth = 123.5;
  made.frameHeight = 456.25;
  made.frameWidth = 10;
  assert.deepEqual([made.frameWidth, made.frameHeight], [10, 456.25]);
  assert.ok(calls.includes('size {"width":10,"height":456.25}'));
});

test("settings are checked before Core sees them", () => {
  const made = new FrameResolver();
  for (const name of ["textAlignment", "verticalAlignment", "truncationMode", "truncationPlace"]) {
    assert.throws(() => { made[name] = 9; }, RangeError, name);
    assert.throws(() => { made[name] = "0"; }, RangeError, name);
  }
  assert.throws(() => { made.textAlignment = 5; }, RangeError);
  for (const name of ["fitsHorizontally", "fitsVertically", "isTruncationEnabled", "isJustificationEnabled"]) {
    assert.throws(() => { made[name] = 1; }, TypeError, name);
  }
  assert.equal(calls.length, 0);

  made.textAlignment = 4;
  made.fitsVertically = true;
  assert.deepEqual(calls, ["textAlignment 4", "fitsVertically true"]);
});

test("maxLines is undefined for none, 0 means none, and a negative or fractional count is refused", () => {
  const made = new FrameResolver();
  assert.equal(made.maxLines, undefined);
  made.maxLines = 3;
  assert.equal(made.maxLines, 3);
  made.maxLines = undefined;
  assert.equal(made.maxLines, undefined);
  made.maxLines = 0;
  assert.equal(made.maxLines, undefined);
  for (const bad of [-1, 1.5, NaN, Infinity]) {
    assert.throws(() => { made.maxLines = bad; }, RangeError, String(bad));
  }
  assert.deepEqual(calls, ["maxLines 3", "maxLines 0", "maxLines 0"], "-1 never reaches the binding that would read it as an invalid index");
});

test("createFrame needs a typesetter and a range, and gives the typesetter reference back", () => {
  const empty = new FrameResolver();
  assert.throws(() => empty.createFrame(0, 3), /typesetter/);
  assert.equal(calls.length, 0, "checked before Core is asked");

  const made = resolver();
  const set = must(cores.find((c) => c.kind === "typesetter"));
  const before = set.refs;
  for (const [from, to] of [[-1, 3], [3, 2], [2, 2]] as const) {
    assert.throws(() => made.createFrame(from, to), RangeError);
  }
  assert.throws(() => made.createFrame(0, 99), RangeError);
  const frame = made.createFrame(2, 6);
  assert.ok(calls.includes("frame 2 4"));
  assert.equal(set.refs, before, "the check for the typesetter leaks no reference");
  made.dispose();
  assert.equal(frame.lines.length, 3, "a frame does not depend on its resolver");
});

// ---- ComposedFrame, ComposedLine, GlyphRun ----

test("a frame hands out a line, and a line a run, that own references and outlive their parents", () => {
  const frame = resolver().createFrame(0, 10);
  const lines = frame.lines;
  assert.equal(lines.length, 3);
  assert.deepEqual(calls.filter((c) => c === "glyphIdsPtr"), []);

  const line = lines.get(1);
  const same = lines.get(1);
  assert.notEqual(line, same, "each read makes a wrapper of its own");
  assert.equal(refs(line), 1);
  assert.throws(() => lines.get(3), RangeError);
  assert.throws(() => lines.get(-1), RangeError);

  const run = line.runs.get(0);
  frame.dispose();
  assert.throws(() => lines.get(0), /already disposed/, "the list needs its frame");
  line.dispose();
  assert.equal(refs(run), 1, "the run is its own reference");
  assert.equal(run.glyphIds.length, 2);
  run.dispose();
  same.dispose();
});

test("the order of disposal does not matter: typeface, typesetter, resolver, frame, line, run", () => {
  const face = typeface();
  const set = new Typesetter("0123456789", { typeface: face, typeSize: 20 });
  const made = new FrameResolver();
  made.typesetter = set;
  const frame = made.createFrame(0, 10);
  const line = frame.lines.get(0);
  const run = line.runs.get(0);
  const all = [face, set, made, frame, line, run];
  for (const wrapper of all) {
    wrapper.dispose();
    assert.equal(wrapper.isDisposed, true);
  }
  assert.deepEqual(cores.filter((c) => c.refs !== 0).map((c) => c.kind), [], "every reference was given back");
});

test("a line maps what Core refuses to RangeError, and its measurements need a renderer", () => {
  const line = typesetter().createSimpleLine(0, 3);
  assert.equal(line.getCodeUnitDistance(2), 4);
  assert.throws(() => line.getCodeUnitDistance(4), RangeError);
  assert.throws(() => line.getCodeUnitDistance(-1), RangeError);
  assert.deepEqual(line.getVisualEdges(0, 2), [{ left: 0, right: 1 }]);
  assert.throws(() => line.getVisualEdges(0, 9), RangeError);
  assert.throws(() => line.getVisualEdges(3, 1), RangeError);

  assert.deepEqual(line.computeInkBox(renderer()), { x: 1, y: 2, width: 3, height: 4 }, "a TRRect becomes a Rect");
  assert.throws(() => line.computeInkBox({}), TypeError);
  assert.throws(() => line.computeInkBox(undefined), TypeError);
});

test("a frame maps its indices, and selection rectangles are Rects", () => {
  const frame = resolver().createFrame(0, 10);
  assert.equal(frame.getLineIndexForCodeUnit(10), 0);
  assert.equal(frame.getLineIndexForCodeUnit(11), -1, "-1 for no line");
  assert.throws(() => frame.getLineIndexForCodeUnit(-1), RangeError);
  assert.deepEqual(frame.getSelectionRects(2, 5), [{ x: 1, y: 2, width: 3, height: 4 }]);
  assert.ok(calls.includes("selection 2 3"));
  assert.throws(() => frame.getSelectionRects(2, 99), RangeError);
  assert.throws(() => frame.getSelectionRects(5, 2), RangeError);
});

test("a run reads its glyph data lazily, and a list fails once the run is disposed", () => {
  const run = typesetter().createSimpleLine(0, 3).runs.get(0);
  assert.equal(calls.filter((c) => c === "buffer").length, 0, "nothing is read until it is asked for");

  const ids = run.glyphIds;
  assert.equal(ids.length, 2);
  assert.equal(calls.filter((c) => c === "buffer").length, 0, "making the list reads no memory");
  assert.deepEqual(ids.toArray(), [7, 9]);
  assert.deepEqual(run.glyphAdvances.toArray(), [5, 6]);
  assert.deepEqual(run.glyphOffsets.toArray(), [{ x: 1, y: 2 }, { x: 3, y: 4 }]);
  assert.deepEqual(run.clusterMap.toArray(), [0, 0, 1]);

  assert.equal(run.getClusterStart(1), 0);
  assert.equal(run.getClusterStart(9), -1);
  assert.equal(run.getCodeUnitDistance(2), 2);
  assert.throws(() => run.getCodeUnitDistance(9), RangeError);
  assert.equal(run.foregroundColor, undefined);
  assert.equal(run.userData, 0);

  const face = must(run.typeface);
  assert.equal(face.nativeHandle.core.refs, 1, "the typeface read is a reference of its own");
  assert.equal(run.replacement, undefined);

  run.dispose();
  assert.throws(() => ids.get(0), /already disposed/);
  assert.throws(() => run.glyphIds, /already disposed/);
  face.dispose();
});

test("a run of a replacement gives it back as a wrapper of its own", () => {
  const replacement = new Replacement({ computeRoom: () => room });
  const run = typesetter().createSimpleLine(0, 3).runs.get(0);
  run.nativeHandle.core.data["replacement"] = replacement.nativeHandle.core;
  const read = must(run.replacement);
  assert.equal(refs(replacement), 2);
  read.dispose();
  assert.equal(refs(replacement), 1);
});

test("a frame, line or run cannot be made by the application", () => {
  assert.throws(() => new (ComposedLine as unknown as new () => unknown)(), Error);
  assert.throws(() => new (ComposedFrame as unknown as new () => unknown)(), Error);
});

// ---- LineLocator ----

test("a locator keeps references of its own to the frame and the renderer until it is disposed", () => {
  const frame = resolver().createFrame(0, 10);
  const used = renderer();
  const locator = new LineLocator(frame, used);
  assert.equal(refs(frame), 2, "Core does not retain the frame, so the locator does");
  assert.equal(refs(used), 2);

  frame.dispose();
  used.dispose();
  assert.equal(locator.lineCount, 3, "disposing what it was made with does not affect it");
  assert.equal(must(cores.find((c) => c.kind === "frame")).refs, 1);
  assert.equal(must(cores.find((c) => c.kind === "renderer")).refs, 1);

  locator.dispose();
  locator.dispose();
  assert.equal(must(cores.find((c) => c.kind === "frame")).refs, 0);
  assert.equal(must(cores.find((c) => c.kind === "renderer")).refs, 0);
  assert.throws(() => locator.lineCount, /already disposed/);
});

test("a locator refuses what is not a frame and a renderer, and a failed creation holds nothing", () => {
  const frame = resolver().createFrame(0, 10);
  const used = renderer();
  assert.throws(() => new LineLocator({} as never, used), TypeError);
  assert.throws(() => new LineLocator(frame, {} as never), TypeError);
  assert.deepEqual(calls.filter((c) => c === "createLocator"), []);

  failNext.add("createLocator");
  assert.throws(() => new LineLocator(frame, used), /line locator/);
  assert.equal(refs(frame), 1);
  assert.equal(refs(used), 1);
  frame.dispose();
  assert.throws(() => new LineLocator(frame, used), /already disposed/);
});

test("a locator maps -1 and Core's refusals", () => {
  const frame = resolver().createFrame(0, 10);
  const locator = new LineLocator(frame, renderer());
  assert.deepEqual(locator.getLineBox(2), { x: 1, y: 2, width: 3, height: 4 });
  assert.throws(() => locator.getLineBox(3), RangeError);
  assert.throws(() => locator.getLineBox(-1), RangeError);
  assert.deepEqual(locator.findLines({ x: 0, y: 0, width: 5, height: 5 }), [0, 1]);
  assert.ok(calls.includes('findLines {"origin":{"x":0,"y":0},"size":{"width":5,"height":5}}'), "a Rect becomes a TRRect");
  assert.throws(() => locator.findLines({ x: 0, y: 0, width: -1, height: 5 }), RangeError);
  assert.throws(() => locator.findLines(undefined as never), TypeError);
  assert.equal(locator.getFirstLineIndexBelow(0), 0);
  assert.equal(locator.getFirstLineIndexBelow(1000), -1);
});

test("what computeRoom returns is a TypeError when it is not three numbers and a RangeError when a number is not valid", () => {
  const ask = (result: unknown) => new Replacement({ computeRoom: () => result as typeof room }).computeRoom(1);
  for (const bad of [undefined, null, 5, "room", {}, { ascent: 1, descent: 1 }, { ascent: "1", descent: 1, extent: 1 }, { ascent: 1, descent: 1, extent: null }]) {
    assert.throws(() => ask(bad), TypeError, JSON.stringify(bad));
  }
  for (const value of [NaN, -1, -Infinity, Infinity, 1e39]) {
    assert.throws(() => ask({ ascent: 1, descent: value, extent: 1 }), RangeError, String(value));
  }
  assert.deepEqual(ask({ ascent: 0, descent: 0, extent: 0 }), { ascent: 0, descent: 0, extent: 0 });
  let reads = 0;
  const getter = { get ascent() { reads++; return 1; }, descent: 2, extent: 3 };
  assert.deepEqual(ask(getter), room);
  assert.equal(reads, 1, "a copy is passed on, so a getter runs once");
});

test("a delegate's functions are read once, when the replacement is made", () => {
  const seen: string[] = [];
  const delegate = { computeRoom(): typeof room { seen.push("first"); return room; } };
  const replacement = new Replacement(delegate);
  delegate.computeRoom = () => { seen.push("second"); return room; };
  replacement.computeRoom(1);
  assert.deepEqual(seen, ["first"]);
});

test("a call that can reach computeRoom holds its own references, so a handler may dispose what the call uses", () => {
  const set = typesetter();
  const core = set.nativeHandle.core;
  duringCall = () => set.dispose();
  const line = set.createSimpleLine(0, 3);
  assert.ok(set.isDisposed, "the disposal took effect");
  assert.equal(core.refs, 0, "and Core's reference went once the call was over");
  assert.equal(line.runs.length, 2);

  const made = new FrameResolver();
  const given = typesetter();
  made.typesetter = given;
  const held = given.nativeHandle.core;
  given.dispose();
  duringCall = () => { made.typesetter = undefined; made.dispose(); };
  assert.equal(made.createFrame(0, 4).lines.length, 3);
  assert.ok(made.isDisposed);
  assert.equal(held.refs, 0, "the typesetter that the resolver dropped mid-call was kept until the end");

  duringCall = undefined;
  const replacement = new Replacement({ computeRoom: () => room });
  duringCall = () => replacement.dispose();
  assert.deepEqual(replacement.computeRoom(1), room);
  assert.ok(replacement.isDisposed);

  duringCall = undefined;
  const text = new TText("abc");
  const face = typeface();
  duringCall = () => { text.dispose(); face.dispose(); };
  new Typesetter(text, { typeface: face });
  assert.ok(text.isDisposed && face.isDisposed);
  assert.deepEqual(cores.filter((c) => c.kind === "text" && c.refs !== 0), [], "nothing is left held");
});
