import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, before, test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";

// Renderer, GlyphCache and GlyphImage run over a fake of the native bindings, so what is checked
// here is what the TypeScript layer decides: argument checks, what it passes to Core, ownership of
// every handle it makes and the mapping of results. Real glyphs, caches and images are covered by
// the device suite (example/tests/RendererTests.ts).

interface FakeHandle {
  readonly kind: string;
  readonly id: number;
  disposed: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dynamic = any;

let out: string;
let Renderer: Dynamic;
let GlyphCache: Dynamic;
let GlyphImage: Dynamic;
let Path: Dynamic;
let nextId = 1;

const created: FakeHandle[] = [];
const calls: Record<string, unknown[]> = {};
const state = {
  settings: new Map<string, number>(),
  cacheMissing: false,
  hasTypeface: true,
  imageExists: true,
  glyphIdsSeen: [] as number[],
  placements: [] as { glyphIndex: number; origin: { x: number; y: number }; scaleX: number; scaleY: number }[],
  pathElements: [] as unknown[],
  pixels: new Uint8Array([1, 2, 3, 4, 5, 6]),
  imageBytes: 6,
  breakPlacement: -1,
  pixelAsks: 0,
};

function handle(kind: string): FakeHandle {
  const h = { kind, id: nextId++, disposed: false };
  created.push(h);
  return h;
}

function live<T extends FakeHandle>(h: T): T {
  if (h.disposed) {
    throw new Error("handle is already disposed");
  }
  return h;
}

function live_(kind: string, h: FakeHandle): FakeHandle {
  assert.equal(live(h).kind, kind);
  return h;
}

const defaults: Record<string, number> = {
  TypeSize: 16, ScaleX: 1, ScaleY: 1, SkewX: 0, RenderScale: 1, WritingDirection: 0,
  ForegroundColor: 0xff000000, StrokeRadius: 0.5, StrokeCap: 0, StrokeJoin: 0, StrokeMiter: 1,
  StrokeColor: 0xff000000, ShadowRadius: 0, ShadowDx: 0, ShadowDy: 0, ShadowColor: 0, DrawStyle: 0,
};

function rendererAccessors(): Record<string, unknown> {
  const fns: Record<string, unknown> = {};
  for (const name of Object.keys(defaults)) {
    fns[`TRRendererGet${name}`] = (h: FakeHandle) => {
      live_("TRRenderer", h);
      // Core returns an unsigned color as a signed 32-bit value on some paths; the wrapper fixes it.
      const value = state.settings.get(name) ?? (defaults[name] as number);
      return name.endsWith("Color") ? value | 0 : value;
    };
    fns[`TRRendererSet${name}`] = (h: FakeHandle, value: number) => {
      live_("TRRenderer", h);
      if (typeof value !== "number" || Number.isNaN(value)) {
        throw new RangeError(`TRRendererSet${name}: value must not be NaN`);
      }
      state.settings.set(name, value);
    };
  }
  return fns;
}

function record(name: string, ...args: unknown[]): void {
  (calls[name] ??= []).push(args);
}

before(async () => {
  out = compileModules(["src/graphics/Renderer.ts", "src/graphics/GlyphCache.ts", "src/graphics/GlyphImage.ts"]);
  Renderer = ((await importModule(out, "graphics/Renderer.js")) as Dynamic).Renderer;
  GlyphCache = ((await importModule(out, "graphics/GlyphCache.js")) as Dynamic).GlyphCache;
  GlyphImage = ((await importModule(out, "graphics/GlyphImage.js")) as Dynamic).GlyphImage;
  Path = ((await importModule(out, "graphics/Path.js")) as Dynamic).Path;

  (globalThis as Record<string, unknown>)["__tehreer"] = {
    ...rendererAccessors(),
    disposeHandle(h: FakeHandle) {
      h.disposed = true;
    },
    handleEquals: (a: FakeHandle, b: FakeHandle) => live(a).id === live(b).id,
    // Like the real one: a glyph image handle is not a const ref type, so it counts as mutable.
    isHandleMutable: () => true,
    TRRendererCreate: () => handle("TRRenderer"),
    TRRendererGetGlyphCache: (h: FakeHandle) => (live_("TRRenderer", h), state.cacheMissing ? undefined : handle("TRGlyphCache")),
    TRRendererSetGlyphCache(h: FakeHandle, cache: FakeHandle | undefined) {
      live_("TRRenderer", h);
      record("setCache", cache === undefined ? undefined : live_("TRGlyphCache", cache).id);
    },
    TRRendererGetTypeface: (h: FakeHandle) => (live_("TRRenderer", h), state.hasTypeface ? handle("TRTypeface") : undefined),
    TRRendererSetTypeface(h: FakeHandle, face: FakeHandle | undefined) {
      live_("TRRenderer", h);
      record("setTypeface", face === undefined ? undefined : live_("TRTypeface", face).id);
    },
    TRRendererIsRenderable: (h: FakeHandle) => (live_("TRRenderer", h), state.hasTypeface),
    TRRendererCreateGlyphImage(h: FakeHandle, glyph: number) {
      live_("TRRenderer", h);
      state.glyphIdsSeen.push(glyph);
      return state.imageExists ? handle("TRGlyphImage") : undefined;
    },
    TRRendererCreateStrokeImage(h: FakeHandle) {
      live_("TRRenderer", h);
      return state.imageExists ? handle("TRGlyphImage") : undefined;
    },
    TRRendererCreateGlyphPath(h: FakeHandle) {
      live_("TRRenderer", h);
      return handle("TRPath");
    },
    TRPathEnumerate: (path: FakeHandle) => (live_("TRPath", path), [
      { type: "moveTo", x: 1, y: 2 }, { type: "lineTo", x: 3, y: 4 }, { type: "close" },
    ]),
    TRRendererComputeGlyphInkBox(h: FakeHandle, glyph: number) {
      live_("TRRenderer", h);
      return { origin: { x: -1, y: -glyph }, size: { width: 5, height: 6 } };
    },
    TRRendererComputeRunInkBox(h: FakeHandle, ids: Uint16Array, offsets: unknown[], advances: Float32Array, count: number) {
      live_("TRRenderer", h);
      record("runInkBox", ids, offsets, advances, count);
      return { origin: { x: 0, y: 1 }, size: { width: 2, height: 3 } };
    },
    TRRendererEnumerateGlyphPlacements(h: FakeHandle, kind: number, ids: Uint16Array, offsets: unknown[], advances: Float32Array, count: number) {
      live_("TRRenderer", h);
      record("placements", kind, ids, offsets, advances, count);
      const items = state.placements.map((p) => ({ ...p, image: handle("TRGlyphImage") }));
      if (state.breakPlacement >= 0) {
        Object.defineProperty(items[state.breakPlacement] as object, "origin", { get() { throw new Error("broken"); } });
      }
      return items;
    },
    TRRendererEnumerateGlyphPaths(h: FakeHandle, ids: Uint16Array, offsets: unknown[], advances: Float32Array, count: number) {
      live_("TRRenderer", h);
      record("paths", ids, offsets, advances, count);
      return state.pathElements;
    },
    TRGlyphCacheCreate(capacity: number) {
      record("cacheCreate", capacity);
      return handle("TRGlyphCache");
    },
    TRGlyphCacheGetDefault: () => (state.cacheMissing ? undefined : handle("TRGlyphCache")),
    TRGlyphCacheGetCapacity: (h: FakeHandle) => (live_("TRGlyphCache", h), 8 * 1024 * 1024),
    TRGlyphCacheSetCapacity: (h: FakeHandle, capacity: number) => (live_("TRGlyphCache", h), record("setCapacity", capacity)),
    TRGlyphCacheGetSize: (h: FakeHandle) => (live_("TRGlyphCache", h), 1234),
    TRGlyphCacheClear: (h: FakeHandle) => (live_("TRGlyphCache", h), record("clear")),
    TRGlyphImageGetFormat: (h: FakeHandle) => (live_("TRGlyphImage", h), 1),
    TRGlyphImageGetLeft: (h: FakeHandle) => (live_("TRGlyphImage", h), -2),
    TRGlyphImageGetTop: (h: FakeHandle) => (live_("TRGlyphImage", h), 9),
    TRGlyphImageGetWidth: (h: FakeHandle) => (live_("TRGlyphImage", h), 3),
    TRGlyphImageGetHeight: (h: FakeHandle) => (live_("TRGlyphImage", h), 2),
    TRGlyphImageGetByteCount: (h: FakeHandle) => (live_("TRGlyphImage", h), state.imageBytes),
    TRGlyphImageGetPixelsPtr: (h: FakeHandle) => (live_("TRGlyphImage", h), state.pixelAsks++, { memory: state.pixels.buffer }),
    createPointerBuffer: (view: { memory: ArrayBuffer }) => view.memory,
  };
});

after(() => {
  delete (globalThis as Record<string, unknown>)["__tehreer"];
  rmSync(out, { recursive: true, force: true });
});

const liveHandles = (kind: string): number => created.filter((h) => h.kind === kind && !h.disposed).length;

test("a renderer is made with Core's defaults and every setting is read back from Core", () => {
  const renderer = new Renderer();
  assert.equal(renderer.typeSize, 16);
  assert.equal(renderer.scaleX, 1);
  assert.equal(renderer.renderScale, 1);
  assert.equal(renderer.strokeRadius, 0.5);
  assert.equal(renderer.strokeMiter, 1);
  assert.equal(renderer.foregroundColor, 0xff000000, "an unsigned color, whatever sign Core's value has");
  assert.equal(renderer.strokeColor, 0xff000000);
  assert.equal(renderer.shadowColor, 0);
  assert.equal(renderer.drawStyle, 0);

  renderer.typeSize = 24;
  renderer.skewX = -0.25;
  renderer.foregroundColor = 0xff336699;
  renderer.strokeCap = 2;
  renderer.strokeJoin = 3;
  renderer.shadowDx = -3;
  assert.equal(renderer.typeSize, 24);
  assert.equal(renderer.skewX, -0.25);
  assert.equal(renderer.foregroundColor, 0xff336699);
  assert.equal(renderer.strokeCap, 2);
  assert.equal(renderer.strokeJoin, 3);
  assert.equal(renderer.shadowDx, -3);

  // Nothing is mirrored: a change made in Core behind the wrapper is seen at once.
  state.settings.set("TypeSize", 99);
  assert.equal(renderer.typeSize, 99);
  state.settings.clear();
});

test("a number that Core cannot take is refused by the binding and the old value stays", () => {
  const renderer = new Renderer();
  renderer.strokeRadius = 2;
  assert.throws(() => (renderer.strokeRadius = NaN), RangeError);
  assert.equal(renderer.strokeRadius, 2);
  state.settings.clear();
});

test("the typeface and the glyph cache are retained by Core and each read is a reference of its own", () => {
  const renderer = new Renderer();
  const face = renderer.typeface;
  const again = renderer.typeface;
  assert.notEqual(face, again);
  assert.equal(face.equals(again), false, "two fresh fake handles are different objects here");
  face.dispose();
  assert.equal(again.isDisposed, false, "disposing one wrapper leaves the others");

  renderer.typeface = again;
  assert.deepEqual(calls["setTypeface"]?.at(-1), [again.nativeHandle.id]);
  renderer.typeface = undefined;
  assert.deepEqual(calls["setTypeface"]?.at(-1), [undefined], "undefined clears it");

  const cache = renderer.glyphCache;
  assert.ok(cache instanceof GlyphCache);
  renderer.glyphCache = cache;
  assert.deepEqual(calls["setCache"]?.at(-1), [cache.nativeHandle.id]);
  renderer.glyphCache = undefined;
  assert.deepEqual(calls["setCache"]?.at(-1), [undefined], "undefined selects the default cache");

  state.hasTypeface = false;
  state.cacheMissing = true;
  try {
    assert.equal(renderer.typeface, undefined);
    assert.equal(renderer.glyphCache, undefined);
    assert.equal(renderer.isRenderable, false);
  } finally {
    state.hasTypeface = true;
    state.cacheMissing = false;
  }
  assert.equal(renderer.isRenderable, true);
});

test("a disposed renderer fails every member with already disposed", () => {
  const renderer = new Renderer();
  renderer.dispose();
  renderer.dispose();
  for (const use of [
    () => renderer.typeSize, () => (renderer.typeSize = 1), () => renderer.typeface, () => renderer.glyphCache,
    () => renderer.isRenderable, () => renderer.getGlyphImage(1), () => renderer.getGlyphPath(1),
    () => renderer.computeGlyphInkBox(1), () => renderer.getGlyphPlacements(0, { glyphIds: [], glyphOffsets: [], glyphAdvances: [] }),
  ]) {
    assert.throws(use, /already disposed/);
  }
});

test("a glyph image and a stroke image are owned by the caller, or undefined", () => {
  const renderer = new Renderer();
  const before = liveHandles("TRGlyphImage");

  const image = renderer.getGlyphImage(5);
  const stroke = renderer.getStrokeImage(5);
  assert.ok(image instanceof GlyphImage && stroke instanceof GlyphImage);
  assert.equal(liveHandles("TRGlyphImage"), before + 2);
  image.dispose();
  stroke.dispose();
  assert.equal(liveHandles("TRGlyphImage"), before);

  state.imageExists = false;
  try {
    assert.equal(renderer.getGlyphImage(5), undefined);
    assert.equal(renderer.getStrokeImage(5), undefined);
  } finally {
    state.imageExists = true;
  }
});

test("a glyph ID that is not one is a RangeError before Core is asked", () => {
  const renderer = new Renderer();
  state.glyphIdsSeen.length = 0;
  for (const bad of [-1, 1.5, 65536, NaN, Infinity]) {
    assert.throws(() => renderer.getGlyphImage(bad), RangeError, String(bad));
    assert.throws(() => renderer.getStrokeImage(bad), RangeError);
    assert.throws(() => renderer.getGlyphPath(bad), RangeError);
    assert.throws(() => renderer.computeGlyphInkBox(bad), RangeError);
  }
  assert.deepEqual(state.glyphIdsSeen, []);
  assert.ok(renderer.getGlyphImage(0));
  assert.ok(renderer.getGlyphImage(65535));
});

test("a glyph path releases the outline of Core and keeps a path of its own", () => {
  const renderer = new Renderer();
  const before = liveHandles("TRPath");
  const path = renderer.getGlyphPath(2);
  assert.ok(path instanceof Path);
  assert.deepEqual(path.verbs, [0, 1, 4]);
  assert.deepEqual(path.coordinates, [1, 2, 3, 4]);
  assert.equal(liveHandles("TRPath"), before);
});

test("ink boxes have the shape of Rect", () => {
  const renderer = new Renderer();
  assert.deepEqual(renderer.computeGlyphInkBox(3), { x: -1, y: -3, width: 5, height: 6 });

  const run = { glyphIds: Uint16Array.of(1, 2), glyphOffsets: [{ x: 0, y: 1 }, { x: 2, y: 3 }], glyphAdvances: Float32Array.of(10, 11) };
  assert.deepEqual(renderer.computeRunInkBox(run), { x: 0, y: 1, width: 2, height: 3 });
  const [ids, offsets, advances, count] = calls["runInkBox"]?.at(-1) as [Uint16Array, unknown[], Float32Array, number];
  assert.deepEqual([...ids], [1, 2]);
  assert.deepEqual(offsets, [{ x: 0, y: 1 }, { x: 2, y: 3 }]);
  assert.deepEqual([...advances], [10, 11]);
  assert.equal(count, 2);
});

test("a run is read from lists as well as arrays, and checked before Core sees it", () => {
  const renderer = new Renderer();
  const list = <T>(items: T[]) => ({ length: items.length, toArray: () => items });

  renderer.computeRunInkBox({ glyphIds: list([4, 5]), glyphOffsets: list([{ x: 1, y: 2 }, { x: 3, y: 4 }]), glyphAdvances: list([6, 7]) });
  const [ids, offsets, advances, count] = calls["runInkBox"]?.at(-1) as [Uint16Array, unknown[], Float32Array, number];
  assert.ok(ids instanceof Uint16Array && advances instanceof Float32Array);
  assert.deepEqual([...ids], [4, 5]);
  assert.deepEqual(offsets, [{ x: 1, y: 2 }, { x: 3, y: 4 }]);
  assert.equal(count, 2);

  const calls_before = calls["runInkBox"]?.length;
  const run = (ids: number[], offsets: number, advances: number) => ({
    glyphIds: ids, glyphOffsets: Array.from({ length: offsets }, () => ({ x: 0, y: 0 })), glyphAdvances: new Array<number>(advances).fill(1),
  });
  assert.throws(() => renderer.computeRunInkBox(run([1, 2], 1, 2)), RangeError, "too few offsets");
  assert.throws(() => renderer.computeRunInkBox(run([1, 2], 2, 1)), RangeError, "too few advances");
  for (const bad of [-1, 65536, 1.5, NaN]) {
    assert.throws(() => renderer.computeRunInkBox(run([1, bad], 2, 2)), RangeError, String(bad));
  }
  assert.equal(calls["runInkBox"]?.length, calls_before, "Core was never reached");

  renderer.computeRunInkBox(run([], 0, 0));
  assert.equal((calls["runInkBox"]?.at(-1) as unknown[])[3], 0, "an empty run is fine");
  renderer.computeRunInkBox(run([1], 3, 3));
  assert.equal((calls["runInkBox"]?.at(-1) as unknown[])[3], 1, "extra offsets are ignored");
});

test("placements adopt every image, rename origin to x and y, and refuse an unknown kind", () => {
  const renderer = new Renderer();
  state.placements = [
    { glyphIndex: 0, origin: { x: 1, y: -2 }, scaleX: 1, scaleY: 1 },
    { glyphIndex: 2, origin: { x: 15, y: -2 }, scaleX: 0.5, scaleY: 0.25 },
  ];
  const run = { glyphIds: [1, 2, 3], glyphOffsets: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }], glyphAdvances: [5, 5, 5] };
  const before = liveHandles("TRGlyphImage");

  const placements = renderer.getGlyphPlacements(1, run);
  assert.equal((calls["placements"]?.at(-1) as unknown[])[0], 1);
  assert.equal(placements.length, 2);
  assert.deepEqual(placements.map(({ glyphIndex, x, y, scaleX, scaleY }: Dynamic) => [glyphIndex, x, y, scaleX, scaleY]),
    [[0, 1, -2, 1, 1], [2, 15, -2, 0.5, 0.25]]);
  assert.ok(placements.every((p: Dynamic) => p.image instanceof GlyphImage));
  assert.equal(liveHandles("TRGlyphImage"), before + 2);
  placements.forEach((p: Dynamic) => p.image.dispose());
  assert.equal(liveHandles("TRGlyphImage"), before);

  for (const kind of [2, -1, 0.5, undefined]) {
    assert.throws(() => renderer.getGlyphPlacements(kind, run), RangeError, String(kind));
  }
  state.placements = [];
});

test("a failure while adopting placements gives every reference back", () => {
  const renderer = new Renderer();
  state.placements = [0, 1, 2].map((glyphIndex) => ({ glyphIndex, origin: { x: 0, y: 0 }, scaleX: 1, scaleY: 1 }));
  const before = liveHandles("TRGlyphImage");

  // The third item breaks the read of its origin, after two images were adopted.
  state.breakPlacement = 2;
  try {
    assert.throws(() => renderer.getGlyphPlacements(0, { glyphIds: [1, 2, 3], glyphOffsets: [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }], glyphAdvances: [1, 1, 1] }), /broken/);
  } finally {
    state.breakPlacement = -1;
  }
  assert.equal(liveHandles("TRGlyphImage"), before, "no image is left owned");
  state.placements = [];
});

test("a generated path is made from the segments Core enumerated", () => {
  const renderer = new Renderer();
  state.pathElements = [
    { type: "moveTo", x: 0, y: 0 },
    { type: "quadTo", controlX: 1, controlY: 1, x: 2, y: 0 },
    { type: "cubicTo", control1X: 3, control1Y: 1, control2X: 4, control2Y: 1, x: 5, y: 0 },
    { type: "close" },
  ];
  const path = renderer.generatePath({ glyphIds: [7], glyphOffsets: [{ x: 0, y: 0 }], glyphAdvances: [9] });
  assert.ok(path instanceof Path);
  assert.deepEqual(path.verbs, [0, 2, 3, 4]);
  assert.equal(path.toSvgPathData(), "M0 0Q1 1 2 0C3 1 4 1 5 0Z");
  assert.throws(() => renderer.generatePath({ glyphIds: [70000], glyphOffsets: [{ x: 0, y: 0 }], glyphAdvances: [9] }), RangeError);
  state.pathElements = [];
});

test("a glyph cache is made with a byte capacity that cannot be -1 or fractional", () => {
  const cache = new GlyphCache(1024);
  assert.deepEqual(calls["cacheCreate"]?.at(-1), [1024]);
  assert.equal(cache.capacity, 8 * 1024 * 1024);
  assert.equal(cache.size, 1234);

  new GlyphCache(0);
  cache.capacity = 0;
  assert.deepEqual(calls["setCapacity"]?.at(-1), [0]);

  const before = calls["cacheCreate"]?.length;
  for (const bad of [-1, 1.5, NaN, Infinity, 2 ** 60, "8" as unknown as number]) {
    assert.throws(() => new GlyphCache(bad), RangeError, String(bad));
    assert.throws(() => (cache.capacity = bad), RangeError, String(bad));
  }
  assert.equal(calls["cacheCreate"]?.length, before, "-1 never reaches the index conversion of the binding");

  cache.clear();
  assert.equal(calls["clear"]?.length, 1);
});

test("the default cache is a reference of its own and fails when Core has none", () => {
  const first = GlyphCache.default;
  const second = GlyphCache.default;
  first.dispose();
  assert.equal(second.isDisposed, false);
  assert.equal(second.capacity, 8 * 1024 * 1024);

  state.cacheMissing = true;
  try {
    assert.throws(() => GlyphCache.default, { name: "Error", message: /default glyph cache/ });
  } finally {
    state.cacheMissing = false;
  }
});

test("a glyph image reads its properties from Core and copies its pixels when asked", () => {
  const image = new Renderer().getGlyphImage(1);
  assert.equal(image.format, 1);
  assert.equal(image.left, -2);
  assert.equal(image.top, 9);
  assert.equal(image.width, 3);
  assert.equal(image.height, 2);
  assert.equal(image.byteCount, 6);

  const asked = state.pixelAsks;
  const pixels = image.pixels;
  assert.ok(state.pixelAsks > asked + 1, "a mutable handle is read through a refresh, which asks Core for the pointer again");
  assert.deepEqual(pixels, new Uint8Array([1, 2, 3, 4, 5, 6]));
  pixels[0] = 99;
  assert.equal(image.pixels[0], 1, "a copy: writing to it changes nothing");

  state.imageBytes = 0;
  try {
    assert.deepEqual(image.pixels, new Uint8Array(0), "no bytes, no pointer to read");
  } finally {
    state.imageBytes = 6;
  }
});

test("a disposed glyph image fails every member, and an image is not made by hand", () => {
  const image = new Renderer().getGlyphImage(1);
  image.dispose();
  image.dispose();
  for (const read of [() => image.format, () => image.left, () => image.top, () => image.width, () => image.height, () => image.byteCount, () => image.pixels]) {
    assert.throws(read, /already disposed/);
  }
  assert.throws(() => new GlyphImage(), { name: "Error", message: /made by a renderer/ });
});

test("a disposed cache cannot be used, and the renderer that was given it is not affected", () => {
  const cache = new GlyphCache(10);
  const renderer = new Renderer();
  renderer.glyphCache = cache;
  cache.dispose();
  assert.throws(() => cache.size, /already disposed/);
  assert.throws(() => (renderer.glyphCache = cache), /already disposed/);
  assert.equal(renderer.typeSize, 16);
});
