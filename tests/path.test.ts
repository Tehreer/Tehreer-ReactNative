import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, before, test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";

// Path, PathSink and Typeface.getGlyphPath run over a fake of the native bindings. What is checked
// here is what the TypeScript layer decides: the verbs and coordinates, the order and the
// arithmetic of a transform, the SVG text, that errors of a sink propagate, and that the native
// outline is released after it is copied on every path. The outline of a real glyph is covered by
// the device suite (example/tests/PathTests.ts).

interface FakeHandle {
  readonly kind: string;
  readonly id: number;
  disposed: boolean;
}

type Element =
  | { type: "moveTo"; x: number; y: number }
  | { type: "lineTo"; x: number; y: number }
  | { type: "quadTo"; controlX: number; controlY: number; x: number; y: number }
  | { type: "cubicTo"; control1X: number; control1Y: number; control2X: number; control2Y: number; x: number; y: number }
  | { type: "close" };

interface Transform {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}

interface Sink {
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  quadTo(controlX: number, controlY: number, x: number, y: number): void;
  cubicTo(c1x: number, c1y: number, c2x: number, c2y: number, x: number, y: number): void;
  close(): void;
}

interface PathObject extends Sink {
  readonly verbs: readonly number[];
  readonly coordinates: readonly number[];
  readonly isEmpty: boolean;
  enumerate(sink: Sink, transform?: Transform): void;
  transformed(transform: Transform): PathObject;
  append(path: PathObject): void;
  toSvgPathData(transform?: Transform): string;
}

interface PathClass {
  new (): PathObject;
  takeNative(handle: FakeHandle, transform?: Transform): PathObject;
}

let out: string;
let Path: PathClass;
let PathVerb: Record<string, number>;
let FontFile: { fromBytes(data: Uint8Array): { typefaces: { get(index: number): { getGlyphPath(glyph: number, size: number, transform?: Transform): PathObject | undefined; dispose(): void } } } };
let nextId = 1;

const state: { elements: Element[] | undefined; enumerateError: Error | undefined; glyphHasPath: boolean; created: FakeHandle[]; transforms: (Transform | undefined)[] } = {
  elements: [],
  enumerateError: undefined,
  glyphHasPath: true,
  created: [],
  transforms: [],
};

function handle(kind: string): FakeHandle {
  const created = { kind, id: nextId++, disposed: false };
  if (kind === "TRPath") {
    state.created.push(created);
  }
  return created;
}

// A glyph with every kind of element: a square with a quadratic and a cubic side, and a triangle.
const outline: Element[] = [
  { type: "moveTo", x: 0, y: 0 },
  { type: "lineTo", x: 10, y: 0 },
  { type: "quadTo", controlX: 12.5, controlY: -5, x: 10, y: -10 },
  { type: "cubicTo", control1X: 8, control1Y: -12, control2X: 2, control2Y: -12, x: 0, y: -10 },
  { type: "close" },
  { type: "moveTo", x: 20, y: 0 },
  { type: "lineTo", x: 30, y: 0 },
  { type: "lineTo", x: 25, y: -9.25 },
  { type: "close" },
];

before(async () => {
  out = compileModules(["src/graphics/Path.ts", "src/graphics/Typeface.ts", "src/graphics/FontFile.ts"]);
  const pathModule = (await importModule(out, "graphics/Path.js")) as { Path: PathClass; PathVerb: Record<string, number> };
  Path = pathModule.Path;
  PathVerb = pathModule.PathVerb;
  FontFile = ((await importModule(out, "graphics/FontFile.js")) as { FontFile: typeof FontFile }).FontFile;

  (globalThis as Record<string, unknown>)["__tehreer"] = {
    disposeHandle(h: FakeHandle) {
      h.disposed = true;
    },
    TRFontFileCreateFromMemory: () => handle("TRFontFile"),
    TRFontFileGetTypefaceCount: () => 1,
    TRFontFileGetTypeface: () => handle("TRTypeface"),
    TRTypefaceCreateGlyphPath(h: FakeHandle, glyph: number, size: number) {
      if (h.disposed) {
        throw new Error("handle is already disposed");
      }
      assert.equal(typeof glyph, "number");
      return state.glyphHasPath && size > 0 ? handle("TRPath") : undefined;
    },
    TRPathEnumerate(h: FakeHandle, transform: Transform | undefined) {
      if (h.disposed) {
        throw new Error("handle is already disposed");
      }
      state.transforms.push(transform);
      if (state.enumerateError) {
        throw state.enumerateError;
      }
      return state.elements;
    },
  };
});

after(() => {
  delete (globalThis as Record<string, unknown>)["__tehreer"];
  rmSync(out, { recursive: true, force: true });
});

function reset(): void {
  state.elements = outline;
  state.enumerateError = undefined;
  state.glyphHasPath = true;
  state.created.length = 0;
  state.transforms.length = 0;
}

function glyphPath(transform?: Transform): PathObject | undefined {
  const typeface = FontFile.fromBytes(new Uint8Array(4)).typefaces.get(0);
  return typeface.getGlyphPath(1, 100, transform);
}

// The SVG path data of this library: absolute commands, numbers separated by spaces.
function parseSvg(data: string): { verbs: number[]; coordinates: number[] } {
  const verbs: number[] = [];
  const coordinates: number[] = [];
  const counts: Record<string, number> = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };
  const codes: Record<string, number> = { M: 0, L: 1, Q: 2, C: 3, Z: 4 };

  for (const [, command, numbers] of data.matchAll(/([MLQCZ])([^MLQCZ]*)/g) as Iterable<RegExpMatchArray>) {
    const values = (numbers as string).trim() === "" ? [] : (numbers as string).trim().split(" ").map(Number);
    assert.equal(values.length, counts[command as string], `${command}${numbers}`);
    verbs.push(codes[command as string] as number);
    coordinates.push(...values);
  }
  return { verbs, coordinates };
}

test("a path keeps its verbs and coordinates in order, and starts empty", () => {
  const path = new Path();
  assert.equal(path.isEmpty, true);
  assert.deepEqual([...path.verbs], []);

  path.moveTo(1, 2);
  path.lineTo(3, 4);
  path.quadTo(5, 6, 7, 8);
  path.cubicTo(9, 10, 11, 12, 13, 14);
  path.close();

  assert.equal(path.isEmpty, false);
  assert.deepEqual([...path.verbs], [PathVerb["MoveTo"], PathVerb["LineTo"], PathVerb["QuadTo"], PathVerb["CubicTo"], PathVerb["Close"]]);
  assert.deepEqual([...path.coordinates], [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
});

test("the verbs are the numbers of the documented order", () => {
  assert.deepEqual(PathVerb, { MoveTo: 0, LineTo: 1, QuadTo: 2, CubicTo: 3, Close: 4 });
});

test("a path is enumerated into a sink in the order it was made", () => {
  reset();
  const path = glyphPath() as PathObject;
  const calls: string[] = [];
  path.enumerate({
    moveTo: (x, y) => calls.push(`M ${x} ${y}`),
    lineTo: (x, y) => calls.push(`L ${x} ${y}`),
    quadTo: (...v) => calls.push(`Q ${v.join(" ")}`),
    cubicTo: (...v) => calls.push(`C ${v.join(" ")}`),
    close: () => calls.push("Z"),
  });
  assert.deepEqual(calls, ["M 0 0", "L 10 0", "Q 12.5 -5 10 -10", "C 8 -12 2 -12 0 -10", "Z", "M 20 0", "L 30 0", "L 25 -9.25", "Z"]);
});

test("a transform maps every point as a, b, c, d, tx, ty say, in a copy and in the text", () => {
  const path = new Path();
  path.moveTo(1, 2);
  path.quadTo(3, 4, 5, 6);
  path.cubicTo(1, 0, 0, 1, 2, 2);
  path.close();
  const transform = { a: 2, b: 3, c: 5, d: 7, tx: 11, ty: 13 };

  const copy = path.transformed(transform);
  // (x, y) -> (a x + c y + tx, b x + d y + ty)
  assert.deepEqual([...copy.coordinates], [23, 30, 37, 50, 51, 70, 13, 16, 16, 20, 25, 33]);
  assert.deepEqual([...path.coordinates].slice(0, 2), [1, 2], "the original is not changed");
  assert.deepEqual([...copy.verbs], [...path.verbs]);
  assert.equal(copy.toSvgPathData(), path.toSvgPathData(transform));
});

test("append adds the segments of another path, and a path appended to itself doubles once", () => {
  const a = new Path();
  a.moveTo(1, 1);
  a.close();
  const b = new Path();
  b.moveTo(2, 2);
  b.lineTo(3, 3);

  a.append(b);
  assert.deepEqual([...a.verbs], [0, 4, 0, 1]);
  assert.deepEqual([...a.coordinates], [1, 1, 2, 2, 3, 3]);

  a.append(a);
  assert.deepEqual([...a.verbs], [0, 4, 0, 1, 0, 4, 0, 1]);
  assert.equal(a.coordinates.length, 12);
});

test("the SVG data uses absolute commands, and an empty path gives empty text", () => {
  const path = new Path();
  assert.equal(path.toSvgPathData(), "");
  path.moveTo(0, 0);
  path.lineTo(10, -2.5);
  path.quadTo(1, 2, 3, 4);
  path.cubicTo(1, 2, 3, 4, 5, 6);
  path.close();
  assert.equal(path.toSvgPathData(), "M0 0L10 -2.5Q1 2 3 4C1 2 3 4 5 6Z");
});

test("the outline of a glyph round-trips through SVG path data", () => {
  reset();
  const path = glyphPath() as PathObject;
  const parsed = parseSvg(path.toSvgPathData());
  assert.deepEqual(parsed.verbs, [...path.verbs]);
  assert.deepEqual(parsed.coordinates, [...path.coordinates]);

  // A number that JavaScript prints with an exponent still reads back as the same number.
  const tiny = new Path();
  tiny.moveTo(1e-7, -2.5e21);
  const again = parseSvg(tiny.toSvgPathData());
  assert.deepEqual(again.coordinates, [1e-7, -2.5e21]);
});

test("a transform that is not made of finite numbers is a RangeError, and nothing reaches the sink", () => {
  const path = new Path();
  path.moveTo(1, 1);
  const calls: string[] = [];
  const sink = { moveTo: () => calls.push("M"), lineTo() {}, quadTo() {}, cubicTo() {}, close() {} };
  const good = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

  for (const bad of [{ ...good, a: NaN }, { ...good, tx: Infinity }, { ...good, ty: undefined as unknown as number }, { ...good, d: "1" as unknown as number }]) {
    assert.throws(() => path.enumerate(sink, bad), RangeError);
    assert.throws(() => path.transformed(bad), RangeError);
    assert.throws(() => path.toSvgPathData(bad), RangeError);
  }
  assert.deepEqual(calls, []);
});

test("an error from a sink ends the enumeration and reaches the caller as it was thrown", () => {
  const path = new Path();
  path.moveTo(0, 0);
  path.lineTo(1, 1);
  path.lineTo(2, 2);
  path.close();

  const failure = new Error("sink failed");
  const seen: string[] = [];
  const sink = {
    moveTo: () => seen.push("M"),
    lineTo: () => {
      seen.push("L");
      throw failure;
    },
    quadTo() {},
    cubicTo() {},
    close: () => seen.push("Z"),
  };

  assert.throws(() => path.enumerate(sink), (error) => error === failure);
  assert.deepEqual(seen, ["M", "L"], "nothing after the failure");
  assert.equal(path.verbs.length, 4, "the path itself is not changed");
});

test("a native outline is copied, passed the transform untouched, and released", () => {
  reset();
  const transform = { a: 2, b: 0, c: 0, d: 2, tx: 5, ty: 6 };
  const path = glyphPath(transform) as PathObject;

  assert.deepEqual(state.transforms, [transform], "Core applies the transform");
  assert.deepEqual([...path.coordinates].slice(0, 4), [0, 0, 10, 0], "the copy holds what Core gave, with no second transform");
  assert.equal(state.created.length, 1);
  assert.equal((state.created[0] as FakeHandle).disposed, true, "released once it is copied");
  assert.equal(path.verbs.length, outline.length);

  assert.deepEqual(state.transforms.length, 1);
  glyphPath();
  assert.equal(state.transforms[1], undefined, "no transform means NULL");
});

test("the native outline is released when copying fails: invalid transform, a failing binding, a stop", () => {
  reset();
  const typeface = FontFile.fromBytes(new Uint8Array(4)).typefaces.get(0);

  assert.throws(() => typeface.getGlyphPath(1, 10, { a: NaN, b: 0, c: 0, d: 1, tx: 0, ty: 0 }), RangeError);
  assert.equal(state.created.length, 1);
  assert.equal((state.created[0] as FakeHandle).disposed, true, "an invalid transform");
  assert.deepEqual(state.transforms, [], "it never reached Core");

  const failure = new RangeError("transform.a must be a number");
  state.enumerateError = failure;
  assert.throws(() => typeface.getGlyphPath(1, 10), (error) => error === failure);
  assert.equal((state.created[1] as FakeHandle).disposed, true, "a failing binding");
  state.enumerateError = undefined;

  state.elements = undefined;
  assert.throws(() => typeface.getGlyphPath(1, 10), /stopped/);
  assert.equal((state.created[2] as FakeHandle).disposed, true, "an enumeration that was stopped");
});

test("a glyph without an outline, or at a size that is not positive, gives undefined and no handle", () => {
  reset();
  const typeface = FontFile.fromBytes(new Uint8Array(4)).typefaces.get(0);

  state.glyphHasPath = false;
  assert.equal(typeface.getGlyphPath(1, 10), undefined);
  state.glyphHasPath = true;
  assert.equal(typeface.getGlyphPath(1, 0), undefined);
  assert.equal(typeface.getGlyphPath(1, -5), undefined);
  assert.equal(state.created.length, 0);
});

test("a disposed typeface cannot make a path, and an empty outline is an empty path", () => {
  reset();
  const typeface = FontFile.fromBytes(new Uint8Array(4)).typefaces.get(0);
  state.elements = [];
  const made = typeface.getGlyphPath(1, 10) as PathObject;
  assert.equal(made.isEmpty, true);
  assert.equal((state.created[0] as FakeHandle).disposed, true);

  typeface.dispose();
  // The fake disposes by flag; the library reads the handle of a disposed wrapper and throws.
  assert.throws(() => typeface.getGlyphPath(1, 10), /already disposed/);
});
