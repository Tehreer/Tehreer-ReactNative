import type { IndexedList } from "../../src/collections/IndexedList.js";
import type { coreIndices, coreNumbers, corePoints, coreStructs } from "../../src/collections/CoreList.js";
import type { adopt } from "../../src/internal/Adopt.js";
import type { NativeBindings } from "../../src/internal/NativeBindings.js";
import type { Handle, PointerView } from "../../src/internal/NativeFunctions.js";
import type { NativeObject } from "../../src/internal/NativeObject.js";
import type { TestResult } from "./StructTests.js";

// The suite of the lists over Core memory (issue #10). It runs against the real bindings in Hermes
// and needs a debug build of the native module (the `testCreateMemoryProbe` hooks, which stand in for
// an object of Core that owns memory, so most tests need no font). The device runner calls it like
// the other suites, handing over the library modules, since this file has no runtime imports (Metro
// maps the `.js` suffix of the library's own imports, not those of a test):
//
//     import { runListTests, listTestCount } from "../../tests/device/ListTests";
//     import { NativeObject } from "../../src/internal/NativeObject";
//     import { adopt } from "../../src/internal/Adopt";
//     import { IndexedList } from "../../src/collections/IndexedList";
//     import { coreIndices, coreNumbers, corePoints, coreStructs } from "../../src/collections/CoreList";
//     const library = { NativeObject, adopt, IndexedList, coreIndices, coreNumbers, corePoints, coreStructs };
//     const result = runListTests(bindings, library, { fontBytes });   // { passed, failures, skipped }
//
// The tests that read the glyphs of a shaping result need a font, which the runner passes as bytes
// (any font with the letters "abc"); without one they are reported in `skipped`, not passed. The
// ones on a real getter of Core that needs no font (the features of a shaping engine) always run.

/** The parts of the library that the suite uses. */
export interface ListLibrary {
  NativeObject: typeof NativeObject;
  adopt: typeof adopt;
  IndexedList: typeof IndexedList;
  coreIndices: typeof coreIndices;
  coreNumbers: typeof coreNumbers;
  corePoints: typeof corePoints;
  coreStructs: typeof coreStructs;
}

export interface ListTestOptions {
  /** The bytes of a font that has the letters "abc". */
  fontBytes?: Uint8Array;
}

export interface ListTestResult extends TestResult {
  /** Tests that did not run because the runner gave them nothing to run on. */
  skipped: string[];
}

class Skip extends Error {}

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

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

type Bindings = Required<Pick<NativeBindings,
  "testCreateMemoryProbe" | "testReplaceMemoryProbe" | "testGetMemoryProbeView" | "testWriteMemoryProbe" | "testGetMemoryProbeReferences" |
  "testGetMemoryBlockCount" | "testDropPointerBufferOnOtherThread" | "testCollectGarbage">> & NativeBindings;

function hooks(b: NativeBindings): Bindings {
  const missing = ["testCreateMemoryProbe", "testReplaceMemoryProbe", "testGetMemoryProbeView", "testWriteMemoryProbe", "testGetMemoryProbeReferences",
    "testGetMemoryBlockCount", "testDropPointerBufferOnOtherThread", "testCollectGarbage"]
    .filter((name) => (b as unknown as Record<string, unknown>)[name] === undefined);
  if (missing.length > 0) {
    throw new Error(`the debug hooks are missing (${missing.join(", ")}): the list tests need a debug build of the native module`);
  }
  return b as Bindings;
}

// Frees what nothing refers to any more. Two rounds, since a buffer's memory is freed in the sweep
// that follows the one that found the buffer dead.
function collect(b: Bindings): void {
  b.testCollectGarbage();
  b.testCollectGarbage();
}

function ownerClass(lib: ListLibrary) {
  // What a wrapper of a Core object is: it owns the handle and says "already disposed" afterwards.
  return class Owner<Kind extends string> extends lib.NativeObject<Kind> {
    constructor(token: typeof lib.adopt, handle: Handle<Kind>) {
      check(token === lib.adopt, "an owner is made with the adopt token");
      super(handle);
    }
  };
}

interface Probe {
  owner: NativeObject<"TRMemoryProbe">;
  /** The pointer that a getter of Core would give, `byteOffset` bytes into the memory. */
  view(element: string, elementSize: number, byteOffset?: number): PointerView<string>;
}

function makeProbe(b: Bindings, lib: ListLibrary, bytes: ArrayBufferView, mutable = false): Probe {
  const Owner = ownerClass(lib);
  const owner = new Owner(lib.adopt, b.testCreateMemoryProbe(bytes, mutable));
  return {
    owner,
    view: (element, elementSize, byteOffset) => b.testGetMemoryProbeView(owner.nativeHandle, element, elementSize, byteOffset),
  };
}

const u16 = (...values: number[]) => new Uint16Array(values);
const u32 = (...values: number[]) => new Uint32Array(values);
const f32 = (...values: number[]) => new Float32Array(values);

const tests: [string, (b: Bindings, lib: ListLibrary, options: ListTestOptions) => void][] = [
  ["a number list reads Core memory when an element is asked for and keeps no copy", (b, lib) => {
    const probe = makeProbe(b, lib, u16(10, 20, 30, 40));
    const list = lib.coreNumbers(probe.owner, probe.view("TRGlyphID", 2), 4, "UInt16");
    check(list.length === 4 && list.get(1) === 20, "reads the memory");

    // Core's memory changes (the hook writes it) and the same list shows it.
    b.testWriteMemoryProbe(probe.owner.nativeHandle, 2, u16(99));
    check(list.get(1) === 99, `the list reads the memory again: ${list.get(1)}`);
    check(list.slice(1, 3).get(0) === 99 && list.at(-1) === 40, "a slice and at read the same memory");

    const copy = list.toTypedArray();
    check(copy instanceof Uint16Array && same([...copy], [10, 99, 30, 40]), "toTypedArray is a Uint16Array of the numbers");
    b.testWriteMemoryProbe(probe.owner.nativeHandle, 0, u16(1));
    check(copy[0] === 10, "the copy does not follow the memory");
    copy[1] = 7;
    check(list.get(1) === 99, "writing the copy does not write Core's memory");
    probe.owner.dispose();
  }],

  ["every kind of number reads as the typed array of its kind", (b, lib) => {
    const cases = [
      ["UInt8", new Uint8Array([0, 1, 255]), 1, Uint8Array],
      ["UInt16", u16(0, 1, 65535), 2, Uint16Array],
      ["Int32", new Int32Array([-2147483648, -1, 2147483647]), 4, Int32Array],
      ["UInt32", u32(0, 1, 4294967295), 4, Uint32Array],
      ["Float", f32(-0.5, 1.5, 1024.25), 4, Float32Array],
    ] as const;

    for (const [kind, values, size, array] of cases) {
      const probe = makeProbe(b, lib, values);
      const list = lib.coreNumbers(probe.owner, probe.view("Number", size), 3, kind);
      check(same([...list], [...values]), `${kind}: ${[...list]}`);
      const copy = list.toTypedArray();
      check(copy instanceof array && same([...copy], [...values]), `${kind}: toTypedArray`);
      check(same([...list.slice(1, 3).toTypedArray()], [...values].slice(1)), `${kind}: slice`);
      probe.owner.dispose();
    }
  }],

  ["making a list or a slice does not touch the memory, the first read takes one reference that the buffer holds", (b, lib) => {
    const probe = makeProbe(b, lib, u16(1, 2, 3));
    const handle = probe.owner.nativeHandle;
    check(b.testGetMemoryProbeReferences(handle) === 1, "the handle has the one reference");

    const list = lib.coreNumbers(probe.owner, probe.view("TRGlyphID", 2), 3, "UInt16");
    list.slice(1);
    check(b.testGetMemoryProbeReferences(handle) === 1, "making lists takes no reference");

    list.get(0);
    list.slice(1).get(0);
    void [...list];
    list.toTypedArray();
    check(b.testGetMemoryProbeReferences(handle) === 2, `one buffer serves the list and its slices: ${b.testGetMemoryProbeReferences(handle)}`);
    probe.owner.dispose();
  }],

  ["reading after the owner is disposed throws 'already disposed', for every way of reading", (b, lib) => {
    const probe = makeProbe(b, lib, f32(1, 2, 3, 4));
    const numbers = lib.coreNumbers(probe.owner, probe.view("TRFloat", 4), 4, "Float");
    const points = lib.corePoints(probe.owner, probe.view("TRPoint", 8), 2);
    const structs = lib.coreStructs<{ x: number; y: number }>(probe.owner, probe.view("TRPoint", 8), 2);
    const slice = numbers.slice(1, 3);
    check(numbers.get(0) === 1 && points.get(1).y === 4 && structs.get(0).x === 1, "readable while the owner is alive");
    const baseline = b.testGetMemoryBlockCount();

    probe.owner.dispose();
    const pattern = /already disposed/;
    expectThrows(() => numbers.get(0), pattern);
    expectThrows(() => slice.get(0), pattern);
    expectThrows(() => numbers.at(-1), pattern);
    expectThrows(() => numbers.toTypedArray(), pattern);
    expectThrows(() => [...numbers], pattern);
    expectThrows(() => numbers.toArray(), pattern);
    expectThrows(() => points.get(0), pattern);
    expectThrows(() => points.toFloat32Array(), pattern);
    expectThrows(() => structs.get(0), pattern);
    expectThrows(() => structs.toArray(), pattern);
    expectThrows(() => numbers.get(9), /out of the range/, "RangeError");

    // The failed reads let go of the buffers, so the memory they kept alive goes with them.
    collect(b);
    check(b.testGetMemoryBlockCount() === baseline - 1, `the memory is freed: ${baseline} -> ${b.testGetMemoryBlockCount()}`);
  }],

  ["an indexed list makes its elements when they are asked for and fails once its owner is disposed", (b, lib) => {
    const probe = makeProbe(b, lib, u16(0));
    const made: number[] = [];
    const list = new lib.IndexedList(probe.owner, 4, (index) => {
      made.push(index);
      return index * 2;
    });
    check(made.length === 0 && list.slice(1).length === 3, "nothing is made in advance");
    check(list.slice(1).get(0) === 2 && same(made, [1]), "an element is made from its index");
    probe.owner.dispose();
    expectThrows(() => list.get(0), /already disposed/);
    expectThrows(() => list.slice(1).toArray(), /already disposed/);
  }],

  ["a buffer over Core memory keeps the memory valid after the owner is disposed", (b, lib) => {
    const baseline = b.testGetMemoryBlockCount();
    const probe = makeProbe(b, lib, u16(5, 6, 7));
    const buffer = b.createPointerBuffer(probe.view("TRGlyphID", 2), 3, 2);
    check(buffer.byteLength === 6, `the buffer covers the elements: ${buffer.byteLength}`);
    check(b.testGetMemoryProbeReferences(probe.owner.nativeHandle) === 2, "the buffer holds a reference of its own");

    // Nothing touches the buffer while the owner goes away, which would leave the memory dangling
    // if the buffer only borrowed it.
    probe.owner.dispose();
    check(b.testGetMemoryBlockCount() === baseline + 1, "the memory outlives the disposed owner");
    check(same([...new Uint16Array(buffer)], [5, 6, 7]), "and is still readable");
  }],

  ["the memory of a buffer is freed by the collector when nothing refers to the buffer", (b, lib) => {
    const baseline = b.testGetMemoryBlockCount();
    // The owner and the buffer die in a function, so that no register of this frame refers to them.
    (() => {
      const probe = makeProbe(b, lib, u16(1, 2, 3));
      const buffer = b.createPointerBuffer(probe.view("TRGlyphID", 2), 3, 2);
      check(buffer.byteLength === 6, "a buffer");
      probe.owner.dispose();
      check(b.testGetMemoryBlockCount() === baseline + 1, "alive through the buffer");
    })();
    collect(b);
    check(b.testGetMemoryBlockCount() === baseline, `freed with the buffer: ${b.testGetMemoryBlockCount() - baseline} left`);
  }],

  ["a list that is never disposed gives everything back when it is collected (the finalizer path)", (b, lib) => {
    const baseline = b.testGetMemoryBlockCount();
    (() => {
      const probe = makeProbe(b, lib, u16(1, 2, 3));
      const list = lib.coreNumbers(probe.owner, probe.view("TRGlyphID", 2), 3, "UInt16");
      check(list.get(2) === 3 && b.testGetMemoryBlockCount() === baseline + 1, "a list that has read");
    })();
    collect(b);
    check(b.testGetMemoryBlockCount() === baseline, `both references were released: ${b.testGetMemoryBlockCount() - baseline} left`);
  }],

  ["a buffer that ends on another thread only gives its reference back", (b, lib) => {
    const probe = makeProbe(b, lib, u16(1, 2, 3));
    const handle = probe.owner.nativeHandle;
    b.testDropPointerBufferOnOtherThread(probe.view("TRGlyphID", 2), 3);
    check(b.testGetMemoryProbeReferences(handle) === 1, "the reference of the dropped buffer is back");
    probe.owner.dispose();
  }],

  ["a buffer over memory whose owner is disposed is refused", (b, lib) => {
    const probe = makeProbe(b, lib, u16(1, 2));
    const view = probe.view("TRGlyphID", 2);
    probe.owner.dispose();
    expectThrows(() => b.createPointerBuffer(view, 2, 2), /already disposed/);
    expectThrows(() => b.createPointerBuffer(view, 0, 2), /already disposed/);
    expectThrows(() => b.readPointerStructs(view, 2, 0, 1), /already disposed/);
  }],

  ["a count above what Core has for the pointer is refused, whatever JavaScript passes", (b, lib) => {
    const probe = makeProbe(b, lib, u16(1, 2, 3));
    const view = probe.view("TRGlyphID", 2);
    check(b.createPointerBuffer(view, 3, 2).byteLength === 6, "the count that Core gave is accepted");
    expectThrows(() => b.createPointerBuffer(view, 4, 2), /more than the pointer has/, "RangeError");
    expectThrows(() => b.createPointerBuffer(view, 1e9, 1), /more than the pointer has/, "RangeError");
    expectThrows(() => b.createPointerBuffer(view, 0xffffffff, 2), /more than the pointer has/, "RangeError");

    // The same for structs, which read from the pointer element by element.
    const pairs = makeProbe(b, lib, f32(1, 2, 3, 4));
    const pairView = pairs.view("TRPoint", 8);
    check(b.readPointerStructs(pairView, 2, 0, 2).length === 2, "the count that Core gave is accepted for structs");
    expectThrows(() => b.readPointerStructs(pairView, 3, 0, 3), /more than the pointer has/, "RangeError");
    expectThrows(() => b.readPointerStructs(pairView, 1e9, 0, 5), /more than the pointer has/, "RangeError");
    probe.owner.dispose();
    pairs.owner.dispose();
  }],

  ["a list over a mutable owner reads what Core has now: a freed and replaced block is never read", (b, lib) => {
    const baseline = b.testGetMemoryBlockCount();
    const probe = makeProbe(b, lib, u16(1, 2, 3), true);
    const handle = probe.owner.nativeHandle;
    check(b.isHandleMutable(handle), "the probe is a mutable owner");

    // What a wrapper does: the getter and the count again, on every read.
    const refresh = () => {
      const view = b.testGetMemoryProbeView(probe.owner.nativeHandle, "TRGlyphID", 2);
      return { pointer: view, length: (view as unknown as { count: number }).count };
    };
    const list = lib.coreNumbers(probe.owner, probe.view("TRGlyphID", 2), 3, "UInt16", refresh);
    check(list.get(1) === 2 && same([...list], [1, 2, 3]), "reads the memory");

    // The block is freed (and filled with 0xDD first) and another one made, as a setter of Core does,
    // while the owner lives and the first read's buffer may still be alive.
    b.testReplaceMemoryProbe(handle, u16(7, 8, 9));
    check(list.get(1) === 8, `reads the new block, not the freed one: ${list.get(1)}`);
    check(same(list.toArray(), [7, 8, 9]) && same([...list.toTypedArray()], [7, 8, 9]), "every way of reading sees it");

    b.testReplaceMemoryProbe(handle, u16(5));
    check(list.get(0) === 5, "a smaller block");
    expectThrows(() => list.get(2), /fewer than the list was made for/, "RangeError");
    expectThrows(() => list.toArray(), /fewer than the list was made for/, "RangeError");

    // Nothing was kept: after the buffers of the reads are collected the one block is all that is left.
    probe.owner.dispose();
    collect(b);
    check(b.testGetMemoryBlockCount() === baseline, `no block is kept: ${b.testGetMemoryBlockCount() - baseline} left`);
  }],

  ["a mutable owner cannot be read through a list that cannot ask Core again", (b, lib) => {
    const probe = makeProbe(b, lib, u16(1, 2), true);
    const list = lib.coreNumbers(probe.owner, probe.view("TRGlyphID", 2), 2, "UInt16");
    check(list.length === 2, "making it reads nothing");
    expectThrows(() => list.get(0), /without asking Core again/);
    check(!b.isHandleMutable(makeProbe(b, lib, u16(1)).owner.nativeHandle), "a probe is immutable unless it is made mutable");
    probe.owner.dispose();
  }],

  ["a list over the features of a shaping engine follows the engine when its features are set again", (b, lib) => {
    const engine = b.TRShapingEngineCreate();
    check(engine !== undefined, "no shaping engine");
    const Owner = ownerClass(lib);
    const owner = new Owner(lib.adopt, engine as Handle<"TRShapingEngine">);
    const handle = owner.nativeHandle;
    check(b.isHandleMutable(handle), "a shaping engine is mutable");

    const first = [{ tag: 0x6c696761, value: 1 }, { tag: 0x6b65726e, value: 0 }, { tag: 0x73616c74, value: 2 }];
    check(b.TRShapingEngineSetOpenTypeFeatures(handle, first, first.length), "the features are set");
    const refresh = () => ({ pointer: b.TRShapingEngineGetOpenTypeFeaturesPtr(handle), length: b.TRShapingEngineGetOpenTypeFeatureCount(handle) });
    const initial = refresh();
    const list = lib.coreStructs<{ tag: number; value: number }>(owner, initial.pointer, initial.length, refresh);
    check(same(list.toArray(), first), "the features are read");

    // Core frees the array that the first read used and makes another one.
    const second = [{ tag: 0x63617365, value: 1 }, { tag: 0x6c6f636c, value: 1 }, { tag: 0x6d6b6d6b, value: 1 }];
    check(b.TRShapingEngineSetOpenTypeFeatures(handle, second, second.length), "the features are set again");
    check(same(list.toArray(), second) && same(list.get(2), second[2]), "the list shows the new features");

    check(b.TRShapingEngineSetOpenTypeFeatures(handle, [second[0] as { tag: number; value: number }], 1), "one feature");
    expectThrows(() => list.get(2), /fewer than the list was made for/, "RangeError");
    check(b.TRShapingEngineSetOpenTypeFeatures(handle, undefined, 0), "none");
    expectThrows(() => list.get(0), /fewer than the list was made for/, "RangeError");
    owner.dispose();
  }],

  ["a pointer that is not aligned for the numbers, or an argument that is not valid, is refused", (b, lib) => {
    const probe = makeProbe(b, lib, new Uint8Array(32));
    expectThrows(() => b.createPointerBuffer(probe.view("TRGlyphID", 2, 1), 2, 2), /not aligned/, "RangeError");
    expectThrows(() => b.createPointerBuffer(probe.view("TRFloat", 4, 2), 2, 4), /not aligned/, "RangeError");
    check(b.createPointerBuffer(probe.view("TRFloat", 4, 4), 2, 4).byteLength === 8, "an aligned address is accepted");
    check(b.createPointerBuffer(probe.view("TRFloat", 4, 1), 2, 1).byteLength === 8, "any address is aligned for bytes");
    check(b.createPointerBuffer(probe.view("TRFloat", 4), 0, 4).byteLength === 0, "no elements make an empty buffer");

    expectThrows(() => b.createPointerBuffer(probe.view("TRFloat", 4), 2, 3), /must be 1, 2, 4 or 8/, "RangeError");
    expectThrows(() => b.createPointerBuffer(probe.view("TRFloat", 4), 2, 16), /must be 1, 2, 4 or 8/, "RangeError");
    expectThrows(() => b.createPointerBuffer(probe.view("TRFloat", 4), -1, 4), /must not be -1/, "RangeError");
    expectThrows(() => b.createPointerBuffer(probe.view("TRFloat", 0), 2, 4), /no size/);
    // Only what Core gave counts as a pointer: nothing that JavaScript makes can name an address.
    for (const forged of [{}, { address: 1, element: "TRFloat", elementSize: 4, owner: probe.owner.nativeHandle }, 1, undefined, probe.owner.nativeHandle]) {
      expectThrows(() => b.createPointerBuffer(forged as never, 1, 4), /not a pointer that Core gave/);
      expectThrows(() => b.readPointerStructs(forged as never, 1, 0, 1), /not a pointer that Core gave/);
    }

    // The same through a list, where a misaligned address is found when the list is read.
    const list = lib.coreNumbers(probe.owner, probe.view("TRGlyphID", 2, 1), 2, "UInt16");
    expectThrows(() => list.get(0), /not aligned/, "RangeError");
    probe.owner.dispose();
  }],

  ["a view tells its element but never its address", (b, lib) => {
    const probe = makeProbe(b, lib, u16(1));
    const view = probe.view("TRGlyphID", 2) as unknown as Record<string, unknown>;
    check(view["element"] === "TRGlyphID" && view["elementSize"] === 2 && view["count"] === 1, "the element, its size and its count");
    check(view["address"] === undefined && view["owner"] === undefined, "nothing else can be read");
    probe.owner.dispose();
  }],

  ["a list of indices reads TRUInteger as UInt32 in either width", (b, lib) => {
    // Four bytes an element is a 32-bit target.
    const narrow = makeProbe(b, lib, u32(0, 7, 0xffffffff));
    const small = lib.coreIndices(narrow.owner, narrow.view("TRUInteger", 4), 3);
    check(same([...small], [0, 7, 4294967295]), `32-bit: ${[...small]}`);

    // Eight bytes is a 64-bit one, in the byte order of the device: the low word is the value.
    const littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
    const words = littleEndian ? u32(0, 0, 7, 0, 0xffffffff, 0xffffffff) : u32(0, 0, 0, 7, 0xffffffff, 0xffffffff);
    const wide = makeProbe(b, lib, words);
    const big = lib.coreIndices(wide.owner, wide.view("TRUInteger", 8), 3);
    check(same([...big], [0, 7, 4294967295]), `64-bit: ${[...big]}`);
    const copy = big.slice(1).toTypedArray();
    check(copy instanceof Uint32Array && same([...copy], [7, 4294967295]), "toTypedArray is a Uint32Array");

    // Numbers of a kind never take the wide layout, and no other width is a list of indices.
    expectThrows(() => lib.coreNumbers(wide.owner, wide.view("TRUInteger", 8), 3, "UInt32").get(0), /not UInt32 numbers/, "TypeError");
    const odd = makeProbe(b, lib, new Uint8Array(24));
    expectThrows(() => lib.coreIndices(odd.owner, odd.view("TRUInteger", 12), 2).get(0), /not UInt32 numbers/, "TypeError");
    for (const probe of [narrow, wide, odd]) {
      probe.owner.dispose();
    }
  }],

  ["a list of points reads the pairs of floats", (b, lib) => {
    const probe = makeProbe(b, lib, f32(1, 2, 3.5, -4, 5, 6));
    const points = lib.corePoints(probe.owner, probe.view("TRPoint", 8), 3);
    check(points.length === 3 && same(points.get(1), { x: 3.5, y: -4 }), "a point");
    check(same(points.at(-1), { x: 5, y: 6 }), "at");
    check(same(points.slice(1).toArray(), [{ x: 3.5, y: -4 }, { x: 5, y: 6 }]), "slice and toArray");
    const copy = points.slice(1).toFloat32Array();
    check(copy instanceof Float32Array && same([...copy], [3.5, -4, 5, 6]), "toFloat32Array");
    expectThrows(() => points.get(3), /out of the range/, "RangeError");
    probe.owner.dispose();
  }],

  ["a list of structs is converted by the native codec, whatever the alignment of the address", (b, lib) => {
    const aligned = makeProbe(b, lib, f32(1.5, 2.5, 3.5, -4.5));
    const list = lib.coreStructs<{ x: number; y: number }>(aligned.owner, aligned.view("TRPoint", 8), 2);
    check(same(list.get(1), { x: 3.5, y: -4.5 }) && same(list.toArray(), [{ x: 1.5, y: 2.5 }, { x: 3.5, y: -4.5 }]), "points");
    check(same(list.slice(1).toArray(), [{ x: 3.5, y: -4.5 }]) && list.slice(1, 1).toArray().length === 0, "slices");

    // A struct that is only 4-byte aligned in the middle of other data, as Core can have it.
    const bytes = new Uint8Array(32);
    const data = new DataView(bytes.buffer);
    [1.5, 2.5, 3.5, -4.5].forEach((value, index) => data.setFloat32(1 + index * 4, value, true));
    const shifted = makeProbe(b, lib, bytes);
    const odd = lib.coreStructs<{ x: number; y: number }>(shifted.owner, shifted.view("TRPoint", 8, 1), 2);
    check(same(odd.toArray(), [{ x: 1.5, y: 2.5 }, { x: 3.5, y: -4.5 }]), "unaligned points are read from a copy");

    const features = makeProbe(b, lib, u32(0xffffffff, 0x80000000));
    const feature = lib.coreStructs<{ tag: number; value: number }>(features.owner, features.view("TROpenTypeFeature", 8), 1);
    check(same(feature.get(0), { tag: 4294967295, value: 2147483648 }), "unsigned members stay unsigned");

    for (const probe of [aligned, shifted, features]) {
      probe.owner.dispose();
    }
  }],

  ["a struct list refuses what it cannot convert, and a range that is not within its count", (b, lib) => {
    const probe = makeProbe(b, lib, f32(1, 2, 3, 4));
    const points = probe.view("TRPoint", 8);
    expectThrows(() => lib.coreStructs(probe.owner, probe.view("TRFloat", 4), 4).get(0), /does not hold structs/);
    expectThrows(() => lib.coreStructs(probe.owner, probe.view("TRPoint", 4), 2).get(0), /not the size of the struct/);
    // A struct with function pointers has a layout check but no conversion; the lists of a typeface
    // (TRVariationAxis, ...) have one, which example/tests/GraphicsTests.ts covers.
    expectThrows(() => lib.coreStructs(probe.owner, probe.view("TRDrawCallbacks", 8), 2).get(0), /does not hold structs/);
    expectThrows(() => lib.coreStructs(probe.owner, probe.view("TRVariationAxis", 8), 1).get(0), /not the size of the struct/);
    expectThrows(() => b.readPointerStructs(points, 2, 1, 3), /not a range within the count/, "RangeError");
    expectThrows(() => b.readPointerStructs(points, 2, 2, 1), /not a range within the count/, "RangeError");
    expectThrows(() => b.readPointerStructs(points, 2, -1, 1), /must not be -1/, "RangeError");
    check(b.readPointerStructs(points, 2, 2, 2).length === 0, "an empty range at the end");
    probe.owner.dispose();
  }],

  ["a list over a real getter of Core reads its memory, and a buffer over it outlives the disposed object", (b, lib) => {
    const items = [{ tag: 0x6c696761, value: 1 }, { tag: 0x6b65726e, value: 0 }, { tag: 0xffffffff, value: 3 }];
    const handle = b.TRFontFeaturesCreate(items, items.length);
    check(handle !== undefined, "TRFontFeaturesCreate returned no handle");
    const Owner = ownerClass(lib);
    const owner = new Owner(lib.adopt, handle as Handle<"TRFontFeatures">);
    const pointer = b.TRFontFeaturesGetItemsPtr(owner.nativeHandle);
    const count = b.TRFontFeaturesGetCount(owner.nativeHandle);
    check(pointer !== undefined && count === 3, "Core gave memory for three features");

    const list = lib.coreStructs<{ tag: number; value: number }>(owner, pointer, count);
    check(same(list.toArray(), items) && same(list.get(2), items[2]), "the features are read from Core");

    // Two words an element: the memory itself, which stays valid for the buffer's reference alone.
    const buffer = b.createPointerBuffer(pointer as PointerView<string>, count, 4);
    const words = new Uint32Array(buffer);
    const expected = items.flatMap((item) => [item.tag, item.value]);
    check(same([...words], expected), `the words of the memory: ${[...words]}`);
    owner.dispose();
    check(same([...new Uint32Array(buffer)], expected), "still readable after the object was disposed");
    expectThrows(() => list.get(0), /already disposed/);
  }],

  ["the glyphs of a shaping result are lists over Core memory", (b, lib, options) => {
    const bytes = options.fontBytes;
    if (bytes === undefined) {
      throw new Skip("needs a font");
    }

    const file = b.TRFontFileCreateFromMemory(bytes, bytes.byteLength);
    check(file !== undefined, "the font cannot be loaded");
    const typeface = b.TRFontFileGetTypeface(file as Handle<"TRFontFile">, 0);
    check(typeface !== undefined, "the font has no typeface");
    const engine = b.TRShapingEngineCreate();
    check(engine !== undefined, "no shaping engine");
    try {
      b.TRShapingEngineSetTypeface(engine as Handle<"TRShapingEngine">, typeface);
      b.TRShapingEngineSetTypeSize(engine as Handle<"TRShapingEngine">, 40);
      b.TRShapingEngineSetScriptTag(engine as Handle<"TRShapingEngine">, 0x6c61746e);

      const text = new Uint16Array([0x61, 0x62, 0x63]);
      const handle = b.TRShapingEngineCreateShapingResult(engine as Handle<"TRShapingEngine">, text, text.length, 1);
      check(handle !== undefined, "no shaping result");
      const Owner = ownerClass(lib);
      const owner = new Owner(lib.adopt, handle as Handle<"TRShapingResult">);

      const count = b.TRShapingResultGetGlyphCount(owner.nativeHandle);
      check(count > 0, "the text has glyphs");
      const ids = lib.coreNumbers(owner, b.TRShapingResultGetGlyphIDsPtr(owner.nativeHandle), count, "UInt16");
      const advances = lib.coreNumbers(owner, b.TRShapingResultGetGlyphAdvancesPtr(owner.nativeHandle), count, "Float");
      const offsets = lib.corePoints(owner, b.TRShapingResultGetGlyphOffsetsPtr(owner.nativeHandle), count);
      const clusters = lib.coreIndices(owner, b.TRShapingResultGetClusterMapPtr(owner.nativeHandle), count);

      const glyphIds = ids.toTypedArray();
      check(glyphIds instanceof Uint16Array && glyphIds.length === count && glyphIds.every((id) => id !== 0), `glyph ids: ${[...glyphIds]}`);
      check(ids.get(count - 1) === glyphIds[count - 1], "get agrees with the copy");
      const widths = advances.toTypedArray();
      check(widths instanceof Float32Array && widths.every((width) => width > 0), `advances: ${[...widths]}`);
      check(offsets.length === count && offsets.toFloat32Array().length === count * 2, "offsets");
      check(Number.isFinite(offsets.get(0).x) && Number.isFinite(offsets.get(0).y), "an offset is a point");
      const map = clusters.toTypedArray();
      check(map instanceof Uint32Array && map.length === count && map.every((cluster) => cluster < text.length), `cluster map: ${[...map]}`);
      check(same([...clusters], [...map]), "iteration agrees with the copy");

      owner.dispose();
      for (const list of [ids, advances, offsets, clusters]) {
        expectThrows(() => list.get(0), /already disposed/);
      }
    } finally {
      b.disposeHandle(engine as Handle<"TRShapingEngine">);
      b.disposeHandle(typeface as Handle<"TRTypeface">);
      b.disposeHandle(file as Handle<"TRFontFile">);
    }
  }],
];

export function runListTests(bindings: NativeBindings, library: ListLibrary, options: ListTestOptions = {}): ListTestResult {
  const b = hooks(bindings);
  const result: ListTestResult = { passed: 0, failures: [], skipped: [] };
  for (const [name, body] of tests) {
    // What the test before left behind is collected first, so that the counts of memory blocks start from what is alive.
    collect(b);
    try {
      body(b, library, options);
      result.passed++;
    } catch (e) {
      if (e instanceof Skip) {
        result.skipped.push(`${name}: ${e.message}`);
      } else {
        result.failures.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return result;
}

export const listTestCount = tests.length;
