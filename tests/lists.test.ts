import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { pathToFileURL } from "node:url";
import type { IndexedList as IndexedListClass } from "../src/collections/IndexedList.js";
import type { List } from "../src/collections/List.js";
import type { NativeObject } from "../src/internal/NativeObject.js";

// The lists are compiled into a scratch directory, because node cannot map the `.js` specifiers of
// the sources to `.ts`, and run over a fake of the two native functions that read Core memory. The
// fake keeps "Core memory" in plain ArrayBuffers, so what is tested is the logic of the lists: bounds,
// slices, iteration, laziness and what happens after the owner is disposed. What the native side does
// with real memory is tested on a device (tests/device/ListTests.ts).
const root = join(import.meta.dirname, "..");
const scratch = mkdtempSync(join(tmpdir(), "tehreer-lists-"));

type Module = typeof import("../src/collections/CoreList.js") & { IndexedList: typeof IndexedListClass };
let lists: typeof import("../src/collections/CoreList.js");
let IndexedList: typeof IndexedListClass;

/** A pointer that Core gave: the memory it points to and what a read of it asks. */
interface FakePointer {
  readonly memory: ArrayBuffer;
  readonly structs?: unknown[];
}

class FakeOwner {
  disposed = false;
  get nativeHandle(): object {
    if (this.disposed) {
      throw new Error("FakeOwner is already disposed.");
    }
    return {};
  }
}

const calls = { buffers: 0, structReads: 0, alignments: [] as number[] };

function owner(): FakeOwner & NativeObject<string> {
  return new FakeOwner() as unknown as FakeOwner & NativeObject<string>;
}

function pointer(memory: ArrayBuffer, structs?: unknown[]): never {
  return { memory, structs } as unknown as never;
}

function numbers(values: ArrayLike<number>, array: new (length: number) => { set(values: ArrayLike<number>): void; buffer: ArrayBuffer }): ArrayBuffer {
  const typed = new array(values.length);
  typed.set(values);
  return typed.buffer;
}

before(async () => {
  const tsc = join(root, "node_modules/typescript/lib/tsc.js");
  const result = spawnSync(process.execPath, [
    tsc, join(root, "src/collections/CoreList.ts"), join(root, "src/collections/IndexedList.ts"),
    "--outDir", scratch, "--rootDir", join(root, "src"),
    "--target", "es2022", "--module", "nodenext", "--moduleResolution", "nodenext", "--lib", "es2022,esnext.disposable",
    "--ignoreConfig", "--skipLibCheck", "--erasableSyntaxOnly", "--strict", "--noUncheckedIndexedAccess",
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  writeFileSync(join(scratch, "package.json"), '{"type":"module"}');

  lists = (await import(pathToFileURL(join(scratch, "collections/CoreList.js")).href)) as Module;
  IndexedList = ((await import(pathToFileURL(join(scratch, "collections/IndexedList.js")).href)) as Module).IndexedList;

  (globalThis as Record<string, unknown>)["__tehreer"] = {
    // Like the native function: a buffer over the memory itself (so a change shows), and the
    // refusals that it makes.
    createPointerBuffer(view: FakePointer, count: number, alignment: number) {
      calls.buffers++;
      calls.alignments.push(alignment);
      assert.ok(count * 1 <= view.memory.byteLength, "the count is within the memory");
      return view.memory;
    },
    readPointerStructs(view: FakePointer, count: number, fromIndex: number, toIndex: number) {
      calls.structReads++;
      assert.ok(toIndex <= count);
      return (view.structs ?? []).slice(fromIndex, toIndex);
    },
  };
});

after(() => {
  delete (globalThis as Record<string, unknown>)["__tehreer"];
  rmSync(scratch, { recursive: true, force: true });
});

function reads(action: () => void): { buffers: number; structReads: number } {
  const start = { buffers: calls.buffers, structReads: calls.structReads };
  action();
  return { buffers: calls.buffers - start.buffers, structReads: calls.structReads - start.structReads };
}

// ---- the behavior that every list shares, checked on a list that makes its elements ----

function letters(count = 5): { list: List<string>; made: number[] } {
  const made: number[] = [];
  const list = new IndexedList(owner(), count, (index) => {
    made.push(index);
    return String.fromCharCode(97 + index);
  });
  return { list, made };
}

test("a list reads elements by index, from the end with at, and refuses an index that is not one", () => {
  const { list } = letters();

  assert.equal(list.length, 5);
  assert.equal(list.get(0), "a");
  assert.equal(list.get(4), "e");
  assert.equal(list.at(-1), "e");
  assert.equal(list.at(-5), "a");
  assert.equal(list.at(5), undefined);
  assert.equal(list.at(-6), undefined);
  for (const index of [-1, 5, 1.5, NaN, Infinity]) {
    assert.throws(() => list.get(index), RangeError, `get(${index})`);
  }
  assert.equal(list.isEmpty, false);
  assert.equal(letters(0).list.isEmpty, true);
  assert.throws(() => letters(0).list.get(0), RangeError);
});

test("a list is iterated, converted and searched like an array", () => {
  const { list } = letters();

  assert.deepEqual([...list], ["a", "b", "c", "d", "e"]);
  assert.deepEqual(Array.from(list), list.toArray());
  assert.deepEqual(list.map((letter, index) => letter + index), ["a0", "b1", "c2", "d3", "e4"]);
  assert.equal(list.reduce((text, letter) => text + letter, ""), "abcde");
  assert.equal(list.find((letter) => letter > "b"), "c");
  assert.equal(list.find((letter) => letter > "z"), undefined);
  assert.equal(list.findIndex((letter) => letter === "d"), 3);
  assert.equal(list.findIndex((letter) => letter === "z"), -1);
  assert.equal(list.some((letter) => letter === "e"), true);
  assert.equal(list.some((letter) => letter === "z"), false);
  assert.equal(list.every((letter) => letter < "f"), true);
  assert.equal(list.every((letter) => letter < "e"), false);
  const seen: [string, number][] = [];
  list.forEach((letter, index) => seen.push([letter, index]));
  assert.deepEqual(seen, [["a", 0], ["b", 1], ["c", 2], ["d", 3], ["e", 4]]);
});

test("a slice is a view of part of a list, counted from its own start, and can be sliced again", () => {
  const { list } = letters();
  const part = list.slice(1, 4);

  assert.equal(part.length, 3);
  assert.deepEqual([...part], ["b", "c", "d"]);
  assert.equal(part.at(-1), "d");
  assert.deepEqual([...part.slice(1)], ["c", "d"]);
  assert.deepEqual([...part.slice(1, 2)], ["c"]);
  assert.deepEqual([...list.slice()], [...list]);
  assert.deepEqual([...list.slice(5)], []);
  assert.deepEqual([...list.slice(2, 2)], []);
  assert.throws(() => part.get(3), RangeError);

  for (const [from, to] of [[3, 2], [-1, 2], [0, 6], [0.5, 2], [1, NaN]] as const) {
    assert.throws(() => list.slice(from, to), RangeError, `slice(${from}, ${to})`);
  }
  assert.throws(() => part.slice(0, 4), RangeError);
});

test("an indexed list makes an element only when it is asked for, and again each time", () => {
  const { list, made } = letters();
  assert.deepEqual(made, []);

  const part = list.slice(2);
  assert.deepEqual(made, []);
  part.get(1);
  part.get(1);
  assert.deepEqual(made, [3, 3]);
});

test("an indexed list cannot be read once its owner is disposed", () => {
  const holder = owner();
  const list = new IndexedList(holder, 3, (index) => index);
  const part = list.slice(1);
  assert.equal(list.get(0), 0);

  holder.disposed = true;
  assert.throws(() => list.get(0), /already disposed/);
  assert.throws(() => part.get(0), /already disposed/);
  assert.throws(() => list.at(-1), /already disposed/);
  assert.throws(() => [...list], /already disposed/);
  assert.throws(() => list.toArray(), /already disposed/);
  // An index that is not one is still the caller's mistake.
  assert.throws(() => list.get(9), RangeError);
});

// ---- lists over Core memory ----

test("making a list over Core memory reads nothing, a slice shares what the list made", () => {
  const memory = numbers([1, 2, 3, 4], Uint16Array);
  const used = reads(() => {
    const list = lists.coreNumbers(owner(), pointer(memory), 4, "UInt16");
    list.slice(1, 3);
    assert.equal(list.length, 4);
    assert.equal(list.isEmpty, false);
  });
  assert.deepEqual(used, { buffers: 0, structReads: 0 });

  const list = lists.coreNumbers(owner(), pointer(memory), 4, "UInt16");
  const slice = list.slice(1, 3);
  const afterReads = reads(() => {
    list.get(0);
    slice.get(0);
    list.slice(2).get(0);
    list.toTypedArray();
    void [...list];
  });
  assert.equal(afterReads.buffers, 1, "one buffer serves the list and its slices");
});

test("every kind of number is read from the memory as the typed array of its kind", () => {
  const cases = [
    ["UInt8", Uint8Array, [0, 1, 255]],
    ["UInt16", Uint16Array, [0, 1, 65535]],
    ["Int32", Int32Array, [-2147483648, -1, 2147483647]],
    ["UInt32", Uint32Array, [0, 1, 4294967295]],
    ["Float", Float32Array, [-0.5, 1.5, 1024.25]],
  ] as const;

  for (const [kind, array, values] of cases) {
    const list = lists.coreNumbers(owner(), pointer(numbers(values, array as never)), values.length, kind);
    assert.deepEqual([...list], [...values], kind);
    assert.equal(list.at(-1), values[2]);
    const copy = list.toTypedArray();
    assert.ok(copy instanceof array, kind);
    assert.deepEqual([...copy], [...values], kind);
    assert.deepEqual([...list.slice(1, 3).toTypedArray()], [...values].slice(1, 3), kind);
    assert.ok(calls.alignments.includes(array.BYTES_PER_ELEMENT));
  }
  assert.equal(calls.alignments.at(-1), 4, "a typed array is asked for the alignment of its elements");
});

test("a list reads the memory when an element is asked for, and toTypedArray copies it", () => {
  const memory = numbers([10, 20, 30], Uint16Array);
  const list = lists.coreNumbers(owner(), pointer(memory), 3, "UInt16");
  assert.equal(list.get(1), 20);

  // Core's memory changes (here by the test) and the list shows it: nothing was copied before.
  new Uint16Array(memory)[1] = 99;
  assert.equal(list.get(1), 99);

  const copy = list.toTypedArray();
  new Uint16Array(memory)[1] = 5;
  assert.equal(copy[1], 99, "the copy does not follow the memory");
  copy[0] = 1;
  assert.equal(new Uint16Array(memory)[0], 10, "writing the copy does not write Core's memory");
  const again = list.toTypedArray();
  assert.notEqual(again, copy);
  assert.equal(again.buffer === memory, false, "a copy never exposes the buffer over Core's memory");
});

test("numbers of a list over Core memory are read after the owner is disposed only with an error", () => {
  const holder = owner();
  const list = lists.coreNumbers(holder, pointer(numbers([1, 2, 3], Uint16Array)), 3, "UInt16");
  const slice = list.slice(1);
  assert.equal(list.get(0), 1);

  holder.disposed = true;
  const expected = /already disposed/;
  assert.throws(() => list.get(0), expected);
  assert.throws(() => slice.get(0), expected);
  assert.throws(() => list.at(-1), expected);
  assert.throws(() => list.toTypedArray(), expected);
  assert.throws(() => slice.toTypedArray(), expected);
  assert.throws(() => list.toArray(), expected);
  assert.throws(() => [...list], expected);
  assert.throws(() => list.map((value) => value), expected);
  assert.throws(() => list.get(7), RangeError, "an index that is not one is still a RangeError");
});

test("a read that finds the owner disposed lets go of the buffer, which a new read would make again", () => {
  const holder = owner();
  const list = lists.coreNumbers(holder, pointer(numbers([1, 2], Uint16Array)), 2, "UInt16");
  assert.deepEqual(reads(() => { list.get(0); list.get(1); }).buffers, 1);

  holder.disposed = true;
  assert.throws(() => list.get(0), /already disposed/);
  holder.disposed = false;
  assert.equal(reads(() => list.get(0)).buffers, 1, "the buffer was dropped, so the object it kept alive can be freed");
});

test("an empty list needs no memory, but still fails after its owner is disposed", () => {
  const holder = owner();
  const empty = lists.coreNumbers(holder, undefined, 0, "Float");
  assert.equal(empty.length, 0);
  assert.deepEqual([...empty], []);
  assert.equal(empty.toTypedArray().length, 0);
  assert.ok(empty.toTypedArray() instanceof Float32Array);

  holder.disposed = true;
  assert.throws(() => empty.toTypedArray(), /already disposed/);
  assert.throws(() => lists.corePoints(holder, undefined, 0).toFloat32Array(), /already disposed/);
});

test("memory that Core did not give for elements it counted is an error when the list is made", () => {
  assert.throws(() => lists.coreNumbers(owner(), undefined, 3, "UInt8"), /no memory for 3 elements/);
  assert.throws(() => lists.coreNumbers(owner(), pointer(new ArrayBuffer(4)), -1, "UInt8"), RangeError);
  assert.throws(() => lists.coreNumbers(owner(), pointer(new ArrayBuffer(4)), 1.5, "UInt8"), RangeError);
});

test("elements that are not as wide as the kind are refused instead of read wrongly", () => {
  // Eight bytes an element cannot be floats, and a byte count that is not a multiple of the kind cannot be read at all.
  const wide = lists.coreNumbers(owner(), pointer(new ArrayBuffer(16)), 2, "Float");
  assert.throws(() => wide.get(0), TypeError);
  assert.throws(() => wide.toTypedArray(), TypeError);
  const odd = lists.coreNumbers(owner(), pointer(new ArrayBuffer(3)), 3, "UInt16");
  assert.throws(() => odd.get(0), TypeError);
});

test("indices that Core keeps as pointer-sized numbers are read as UInt32 whatever their width", { skip: !new Uint8Array(new Uint32Array([1]).buffer)[0] }, () => {
  // Four bytes: a 32-bit target.
  const narrow = lists.coreIndices(owner(), pointer(numbers([0, 7, 4294967295], Uint32Array)), 3);
  assert.deepEqual([...narrow], [0, 7, 4294967295]);
  assert.deepEqual([...narrow.slice(1).toTypedArray()], [7, 4294967295]);

  // Eight bytes: a 64-bit target. TRInvalidIndex has all of its bits set.
  const wide = new Uint32Array([0, 0, 7, 0, 0xffffffff, 0xffffffff]);
  const list = lists.coreIndices(owner(), pointer(wide.buffer), 3);
  assert.deepEqual([...list], [0, 7, 4294967295]);
  assert.equal(list.at(-1), 4294967295);
  const copy = list.slice(1).toTypedArray();
  assert.ok(copy instanceof Uint32Array);
  assert.deepEqual([...copy], [7, 4294967295]);
  assert.deepEqual([...list.slice(2, 2).toTypedArray()], []);

  // Anything else is not a list of indices.
  assert.throws(() => lists.coreIndices(owner(), pointer(new ArrayBuffer(12)), 1).get(0), TypeError);
  // A list of numbers of a kind never accepts the wide layout.
  assert.throws(() => lists.coreNumbers(owner(), pointer(wide.buffer), 3, "UInt32").get(0), TypeError);
});

test("points are read as x and y from pairs of floats, and copy as the pairs", () => {
  const memory = numbers([1, 2, 3.5, -4, 5, 6], Float32Array);
  const points = lists.corePoints(owner(), pointer(memory), 3);

  assert.equal(points.length, 3);
  assert.deepEqual(points.get(1), { x: 3.5, y: -4 });
  assert.deepEqual(points.at(-1), { x: 5, y: 6 });
  assert.deepEqual(points.toArray(), [{ x: 1, y: 2 }, { x: 3.5, y: -4 }, { x: 5, y: 6 }]);
  assert.deepEqual([...points.toFloat32Array()], [1, 2, 3.5, -4, 5, 6]);
  assert.deepEqual([...points.slice(1).toFloat32Array()], [3.5, -4, 5, 6]);
  assert.deepEqual(points.slice(1, 3).get(0), { x: 3.5, y: -4 });
  assert.throws(() => points.get(3), RangeError);
  assert.throws(() => points.slice(2, 1), RangeError);

  assert.throws(() => lists.corePoints(owner(), pointer(new ArrayBuffer(12)), 3).get(0), TypeError);
});

test("points cannot be read once their owner is disposed", () => {
  const holder = owner();
  const points = lists.corePoints(holder, pointer(numbers([1, 2, 3, 4], Float32Array)), 2);
  assert.deepEqual(points.get(0), { x: 1, y: 2 });

  holder.disposed = true;
  assert.throws(() => points.get(0), /already disposed/);
  assert.throws(() => points.toFloat32Array(), /already disposed/);
});

test("a list of structs asks the native side for them, in one call for toArray", () => {
  const structs = [{ tag: 1, value: 10 }, { tag: 2, value: 20 }, { tag: 3, value: 30 }];
  const holder = owner();
  const list = lists.coreStructs<{ tag: number; value: number }>(holder, pointer(new ArrayBuffer(24), structs), 3);

  assert.deepEqual(reads(() => assert.equal(list.length, 3)), { buffers: 0, structReads: 0 });
  assert.deepEqual(list.get(1), structs[1]);
  assert.deepEqual(list.at(-1), structs[2]);
  assert.deepEqual(list.slice(1).get(0), structs[1]);
  assert.deepEqual(reads(() => assert.deepEqual(list.slice(1, 3).toArray(), structs.slice(1))), { buffers: 0, structReads: 1 });
  assert.deepEqual(list.slice(1, 1).toArray(), []);
  assert.throws(() => list.get(3), RangeError);
  assert.throws(() => (list as unknown as { toTypedArray(): unknown }).toTypedArray(), TypeError, "structs are not numbers");

  holder.disposed = true;
  assert.throws(() => list.get(0), /already disposed/);
  assert.throws(() => list.toArray(), /already disposed/);
});
