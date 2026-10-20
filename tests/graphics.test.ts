import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, before, test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";

// FontFile and Typeface run over a fake of the native bindings, so what is checked here is what the
// TypeScript layer decides: argument checks, what it passes to Core, laziness, ownership and the
// mapping of results. Real fonts and real Core memory are covered by the device suite
// (example/tests/GraphicsTests.ts).

interface FakeHandle {
  readonly kind: string;
  readonly id: number;
  disposed: boolean;
}

interface Disposable {
  dispose(): void;
  readonly isDisposed: boolean;
}

interface Typeface extends Disposable {
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface FontFile extends Disposable {
  readonly typefaces: { length: number; get(index: number): Typeface; slice(from?: number, to?: number): { length: number; get(index: number): Typeface } };
}

interface FontFileClass {
  new (data: ArrayBuffer | ArrayBufferView): FontFile;
  fromBytes(data: ArrayBuffer | ArrayBufferView): FontFile;
  fromPath(path: string): FontFile;
}

let out: string;
let FontFile: FontFileClass;
let nextId = 1;

const log: string[] = [];
const state = {
  usableData: true,
  usablePath: "/fonts/ok.ttf",
  typefaceCount: 3,
  structReads: 0,
  buffers: 0,
  tableSize: 0,
  tableBytes: new Uint8Array(0),
  glyphName: "",
  derivedExists: true,
};
const received: { variation?: Float32Array; colors?: Uint32Array; memory?: { data: unknown; size: number } } = {};

function handle(kind: string): FakeHandle {
  return { kind, id: nextId++, disposed: false };
}

function live<T extends FakeHandle>(h: T): T {
  if (h.disposed) {
    throw new Error("handle is already disposed");
  }
  return h;
}

// A struct pointer is a plain object with the structs the native side would convert.
function structs(items: unknown[]): never {
  return { structs: items } as never;
}

const axes = [
  { name: "Weight", tag: 0x77676874, flags: 0, minValue: 100, maxValue: 900, defaultValue: 400 },
  { name: undefined, tag: 0x77647468, flags: 1, minValue: 75, maxValue: 100, defaultValue: 100 },
];
const styles = [
  { subfamilyName: "Regular", coordinates: [400, 100], postScriptName: "Roboto-Regular" },
  { subfamilyName: undefined, coordinates: [700, 75], postScriptName: undefined },
];
const palettes = [{ name: "Light", colors: [0xff000000, 0x80ffffff], flags: 1 }, { name: undefined, colors: [], flags: 0 }];
const strikes = [{ pixelWidth: 109, pixelHeight: 109 }];

const floats = new Float32Array([400, 100]).buffer;
const colors = new Uint32Array([0xff112233, 0x80ffffff]).buffer;

function typefaceFunctions() {
  const getter = (name: string, value: unknown) => ({ [name]: (h: FakeHandle) => (live(h), value) });
  return {
    ...getter("TRTypefaceGetWeight", 700),
    ...getter("TRTypefaceGetWidth", 3),
    ...getter("TRTypefaceGetSlope", 1),
    ...getter("TRTypefaceGetUnitsPerEM", 2048),
    ...getter("TRTypefaceGetAscent", 1900),
    ...getter("TRTypefaceGetDescent", 500),
    ...getter("TRTypefaceGetLeading", 0),
    ...getter("TRTypefaceGetGlyphCount", 4),
    ...getter("TRTypefaceGetBoundingBox", { origin: { x: -1510, y: -555 }, size: { width: 3863, height: 2718 } }),
    ...getter("TRTypefaceGetUnderlinePosition", -200),
    ...getter("TRTypefaceGetUnderlineThickness", 100),
    ...getter("TRTypefaceGetStrikeoutPosition", 512),
    ...getter("TRTypefaceGetStrikeoutThickness", 102),
    ...getter("TRTypefaceGetFamilyName", "Roboto"),
    ...getter("TRTypefaceGetStyleName", undefined),
    ...getter("TRTypefaceGetFullName", "Roboto Regular"),
    ...getter("TRTypefaceIsScalable", true),
    ...getter("TRTypefaceIsVariable", true),
    ...getter("TRTypefaceGetVariationAxisCount", axes.length),
    ...getter("TRTypefaceGetVariationAxesPtr", structs(axes)),
    ...getter("TRTypefaceGetNamedStyleCount", styles.length),
    ...getter("TRTypefaceGetNamedStylesPtr", structs(styles)),
    ...getter("TRTypefaceGetPaletteEntryCount", 2),
    ...getter("TRTypefaceGetPaletteEntriesPtr", structs([{ name: "foreground" }, { name: undefined }])),
    ...getter("TRTypefaceGetPredefinedPaletteCount", palettes.length),
    ...getter("TRTypefaceGetPredefinedPalettesPtr", structs(palettes)),
    ...getter("TRTypefaceGetBitmapStrikeCount", strikes.length),
    ...getter("TRTypefaceGetBitmapStrikesPtr", structs(strikes)),
    ...getter("TRTypefaceGetVariationCoordinatesPtr", { memory: floats }),
    ...getter("TRTypefaceGetAssociatedColorsPtr", { memory: colors }),
    TRTypefaceGetGlyphID: (h: FakeHandle, codePoint: number) => (live(h), codePoint === 0x61 ? 1 : 0),
    TRTypefaceGetVariantGlyphID: (h: FakeHandle) => (live(h), 0),
    TRTypefaceGetGlyphAdvance: (h: FakeHandle, glyph: number, size: number, vertical: boolean) => (live(h), vertical ? 0 : glyph * size),
    TRTypefaceGetTableSize: (h: FakeHandle) => (live(h), state.tableSize),
    TRTypefaceGetTableData(h: FakeHandle, _tag: number, offset: number, buffer: Uint8Array, capacity: number) {
      live(h);
      const part = state.tableBytes.subarray(offset, offset + capacity);
      buffer.set(part);
      return part.length;
    },
    TRTypefaceGetGlyphName(h: FakeHandle, _glyph: number, buffer: Uint8Array) {
      live(h);
      for (let i = 0; i < state.glyphName.length; i++) {
        buffer[i] = state.glyphName.charCodeAt(i);
      }
      return state.glyphName.length;
    },
    TRTypefaceCreateWithVariation(h: FakeHandle, coordinates: Float32Array, count: number) {
      live(h);
      received.variation = coordinates;
      assert.equal(count, coordinates.length);
      return state.derivedExists ? handle("TRTypeface") : undefined;
    },
    TRTypefaceCreateWithColors(h: FakeHandle, values: Uint32Array, count: number) {
      live(h);
      received.colors = values;
      assert.equal(count, values.length);
      return state.derivedExists ? handle("TRTypeface") : undefined;
    },
  };
}

before(async () => {
  out = compileModules(["src/graphics/FontFile.ts", "src/graphics/Typeface.ts"]);
  FontFile = ((await importModule(out, "graphics/FontFile.js")) as { FontFile: FontFileClass }).FontFile;

  (globalThis as Record<string, unknown>)["__tehreer"] = {
    ...typefaceFunctions(),
    disposeHandle(h: FakeHandle) {
      h.disposed = true;
      log.push(`dispose ${h.kind}`);
    },
    handleEquals: (a: FakeHandle, b: FakeHandle) => live(a).id === live(b).id,
    isHandleMutable: () => false,
    // The native side refuses what is not a buffer; the fake only records what it was given.
    TRFontFileCreateFromMemory(data: ArrayBuffer | ArrayBufferView, size: number) {
      received.memory = { data, size };
      return state.usableData && size > 0 ? handle("TRFontFile") : undefined;
    },
    TRFontFileCreateFromPath: (path: string) => (path === state.usablePath ? handle("TRFontFile") : undefined),
    TRFontFileGetTypefaceCount: (h: FakeHandle) => (live(h), state.typefaceCount),
    TRFontFileGetTypeface(h: FakeHandle, index: number) {
      live(h);
      log.push(`get typeface ${index}`);
      return index < state.typefaceCount ? handle("TRTypeface") : undefined;
    },
    createPointerBuffer: (view: { memory: ArrayBuffer }) => view.memory,
    readPointerStructs(view: { structs: unknown[] }, _count: number, from: number, to: number) {
      state.structReads++;
      return view.structs.slice(from, to);
    },
  };
});

after(() => {
  delete (globalThis as Record<string, unknown>)["__tehreer"];
  rmSync(out, { recursive: true, force: true });
});

function typeface(): Typeface {
  return FontFile.fromBytes(new Uint8Array(8)).typefaces.get(0);
}

test("a font file is made from bytes, whole or a view, and from a path", () => {
  const bytes = new Uint8Array([1, 2, 3, 4, 5, 6]);

  FontFile.fromBytes(bytes);
  assert.equal(received.memory?.data, bytes);
  assert.equal(received.memory?.size, 6);

  const view = bytes.subarray(2, 5);
  new FontFile(view);
  assert.equal(received.memory?.size, 3, "the size is the byte length of the view, not of its buffer");

  const buffer = new ArrayBuffer(10);
  FontFile.fromBytes(buffer);
  assert.equal(received.memory?.size, 10);

  assert.equal(FontFile.fromPath("/fonts/ok.ttf").isDisposed, false);
});

test("a font that Core cannot use is an Error, for bytes, empty data and a path", () => {
  assert.throws(() => FontFile.fromBytes(new Uint8Array(0)), { name: "Error", message: /usable font/ });
  state.usableData = false;
  try {
    assert.throws(() => FontFile.fromBytes(new Uint8Array(4)), { name: "Error", message: /usable font/ });
  } finally {
    state.usableData = true;
  }
  assert.throws(() => FontFile.fromPath("/no/such.ttf"), { name: "Error", message: /\/no\/such\.ttf/ });
});

test("the typefaces of a file are a lazy list that makes an owner of each element it reads", () => {
  const file = FontFile.fromBytes(new Uint8Array(8));
  log.length = 0;
  const list = file.typefaces;

  assert.equal(list.length, 3);
  assert.deepEqual(log, [], "making the list gets no typeface");

  const first = list.get(1);
  assert.deepEqual(log, ["get typeface 1"]);
  const again = list.get(1);
  assert.notEqual(first, again, "each read makes a wrapper with a reference of its own");
  assert.equal(first.isDisposed, false);

  assert.equal(list.slice(1, 3).length, 2);
  assert.throws(() => list.get(3), RangeError);
  assert.throws(() => list.get(-1), RangeError);
});

test("a typeface outlives its font file, and a disposed font file cannot be read", () => {
  const file = FontFile.fromBytes(new Uint8Array(8));
  const list = file.typefaces;
  const face = list.get(0);

  file.dispose();
  file.dispose();
  assert.equal(file.isDisposed, true);
  assert.equal(face.weight, 700, "the typeface owns a reference of its own");
  assert.throws(() => list.get(0), /already disposed/);
  assert.throws(() => file.typefaces, /already disposed/);
});

test("a disposed typeface fails every member with already disposed, lists included", () => {
  const face = typeface();
  const axesList = face.variationAxes;
  const coordinates = face.variationCoordinates;
  const stylesList = face.namedStyles;

  face.dispose();
  face.dispose();
  for (const read of [
    () => face.weight, () => face.familyName, () => face.boundingBox, () => face.variationAxes, () => face.getGlyphId(0x61),
    () => face.getTableData(1), () => face.getVariationInstance([1]), () => axesList.get(0), () => coordinates.get(0), () => stylesList.get(0),
  ]) {
    assert.throws(read, /already disposed/);
  }
});

test("the metrics and names are read from Core, and the bounding box has the shape of Rect", () => {
  const face = typeface();

  assert.equal(face.weight, 700);
  assert.equal(face.width, 3);
  assert.equal(face.slope, 1);
  assert.equal(face.unitsPerEm, 2048);
  assert.equal(face.ascent, 1900);
  assert.equal(face.descent, 500);
  assert.equal(face.leading, 0);
  assert.equal(face.glyphCount, 4);
  assert.deepEqual(face.boundingBox, { x: -1510, y: -555, width: 3863, height: 2718 });
  assert.equal(face.underlinePosition, -200);
  assert.equal(face.underlineThickness, 100);
  assert.equal(face.strikeoutPosition, 512);
  assert.equal(face.strikeoutThickness, 102);
  assert.equal(face.familyName, "Roboto");
  assert.equal(face.styleName, undefined);
  assert.equal(face.fullName, "Roboto Regular");
  assert.equal(face.isScalable, true);
  assert.equal(face.isVariable, true);
  assert.equal(face.getGlyphId(0x61), 1);
  assert.equal(face.getGlyphId(0x62), 0);
  assert.equal(face.getGlyphAdvance(2, 10), 20);
  assert.equal(face.getGlyphAdvance(2, 10, true), 0);
});

test("the axes, styles, palettes and strikes are read when an element is asked for", () => {
  const face = typeface();

  const list = face.variationAxes;
  const before = state.structReads;
  assert.equal(list.length, 2);
  assert.equal(state.structReads, before, "making a list reads no struct");
  assert.deepEqual(list.get(0), { tag: 0x77676874, name: "Weight", isHidden: false, minValue: 100, maxValue: 900, defaultValue: 400 });
  assert.equal(state.structReads, before + 1, "one element, one read");
  assert.equal(list.get(1).isHidden, true);
  assert.equal(list.get(1).name, undefined);

  const named = face.namedStyles;
  assert.equal(named.length, 2);
  const style = named.get(0);
  assert.equal(style.styleName, "Regular");
  assert.equal(style.postScriptName, "Roboto-Regular");
  assert.deepEqual(style.coordinates.toArray(), [400, 100]);
  assert.deepEqual(style.coordinates.toTypedArray(), new Float32Array([400, 100]));
  assert.deepEqual(style.coordinates.slice(1).toArray(), [100]);
  assert.equal(named.get(1).styleName, undefined);
  assert.equal(named.get(1).postScriptName, undefined);
  assert.throws(() => style.coordinates.get(2), RangeError);

  assert.deepEqual(face.paletteEntryNames.toArray(), ["foreground", undefined]);

  const palette = face.predefinedPalettes.get(0);
  assert.equal(palette.name, "Light");
  assert.equal(palette.flags, 1);
  assert.deepEqual(palette.colors.toTypedArray(), new Uint32Array([0xff000000, 0x80ffffff]));
  assert.equal(face.predefinedPalettes.get(1).colors.length, 0);

  assert.deepEqual(face.bitmapStrikes.toArray(), [{ pixelWidth: 109, pixelHeight: 109 }]);
});

test("the coordinates and the colors in use are lists of numbers over Core memory", () => {
  const face = typeface();

  assert.deepEqual(face.variationCoordinates.toTypedArray(), new Float32Array([400, 100]));
  assert.deepEqual(face.associatedColors.toTypedArray(), new Uint32Array([0xff112233, 0x80ffffff]));
  assert.equal(face.associatedColors.get(1), 0x80ffffff);
});

test("a variation instance clamps nothing itself, passes floats, and refuses what is not a number", () => {
  const face = typeface();

  const derived = face.getVariationInstance([700, 75]);
  assert.ok(derived);
  assert.deepEqual(received.variation, new Float32Array([700, 75]));
  assert.equal(derived.isDisposed, false);

  face.getVariationInstance([]);
  assert.equal(received.variation?.length, 0, "no coordinates means the defaults, which Core fills in");

  for (const bad of [[NaN], [Infinity], [1, -Infinity], ["5" as unknown as number]]) {
    assert.throws(() => face.getVariationInstance(bad), RangeError, JSON.stringify(bad));
  }

  state.derivedExists = false;
  try {
    assert.equal(face.getVariationInstance([1]), undefined, "a typeface without axes gives undefined");
  } finally {
    state.derivedExists = true;
  }
});

test("a color instance passes unsigned colors, and refuses numbers that are not colors", () => {
  const face = typeface();

  const derived = face.getColorInstance([0xff000000, 0x80ffffff, 0]);
  assert.ok(derived);
  assert.deepEqual(received.colors, new Uint32Array([0xff000000, 0x80ffffff, 0]));

  for (const bad of [[-1], [1.5], [0x100000000], [NaN], ["1" as unknown as number]]) {
    assert.throws(() => face.getColorInstance(bad), RangeError, JSON.stringify(bad));
  }

  state.derivedExists = false;
  try {
    assert.equal(face.getColorInstance([1]), undefined);
  } finally {
    state.derivedExists = true;
  }
});

test("table data is clipped to the table, empty past its end, and undefined without the table", () => {
  const face = typeface();
  state.tableSize = 6;
  state.tableBytes = new Uint8Array([10, 11, 12, 13, 14, 15]);

  assert.deepEqual(face.getTableData(1), state.tableBytes);
  assert.deepEqual(face.getTableData(1, 2), new Uint8Array([12, 13, 14, 15]));
  assert.deepEqual(face.getTableData(1, 2, 2), new Uint8Array([12, 13]));
  assert.deepEqual(face.getTableData(1, 4, 100), new Uint8Array([14, 15]), "a part beyond the end is cut short");
  assert.deepEqual(face.getTableData(1, 6), new Uint8Array(0), "an offset at the end is an empty table part");
  assert.deepEqual(face.getTableData(1, 100), new Uint8Array(0));
  assert.deepEqual(face.getTableData(1, 0, 0), new Uint8Array(0));
  assert.equal(face.getTableSize(1), 6);

  for (const [offset, length] of [[-1, undefined], [1.5, undefined], [NaN, undefined], [0, -1], [0, 2.5], [0, NaN]] as const) {
    assert.throws(() => face.getTableData(1, offset, length), RangeError, `${offset}, ${length}`);
  }

  state.tableSize = 0;
  assert.equal(face.getTableData(1), undefined);
});

test("a glyph name is ASCII from Core, or undefined when the font gives none", () => {
  const face = typeface();

  state.glyphName = "";
  assert.equal(face.getGlyphName(1), undefined);
  state.glyphName = "uni0627.fina";
  assert.equal(face.getGlyphName(1), "uni0627.fina");
  state.glyphName = "";
});

test("two wrappers of one Core typeface are equal, and different typefaces are not", () => {
  const list = FontFile.fromBytes(new Uint8Array(8)).typefaces;
  const [a, b] = [list.get(0), list.get(1)];
  assert.equal(a.equals(a), true);
  assert.equal(a.equals(b), false);
});
