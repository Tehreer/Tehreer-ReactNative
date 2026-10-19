import type { PointerView } from "../internal/NativeFunctions.js";
import type { NativeObject } from "../internal/NativeObject.js";
import { CoreMemory } from "./CoreMemory.js";
import { List, type NumberList, type PointList } from "./List.js";
import { typedArrayConstructors, type NumberArray, type NumberKind, type TypedArrayConstructor } from "./NumberKind.js";

/**
 * How the elements of a {@link CoreMemory} are read. Every function reads the memory when it is
 * called and keeps nothing; indices count from the first element of the memory.
 *
 * @internal
 */
export interface ElementReader<T> {
  /** Reads the element at an index. */
  get(memory: CoreMemory, index: number): T;
  /** Reads the elements from `fromIndex` up to `toIndex`, for readers that can do it in one go. */
  range?(memory: CoreMemory, fromIndex: number, toIndex: number): T[];
  /** Copies the elements from `fromIndex` up to `toIndex` to a new typed array, for the ones that have a raw form. */
  copy?(memory: CoreMemory, fromIndex: number, toIndex: number): ArrayBufferView;
}

const isLittleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;

function notNumbers(kind: string): TypeError {
  return new TypeError(`The elements of this memory are not ${kind} numbers.`);
}

/**
 * Reads numbers of a kind. An element is as wide as the kind, or, for a list of indices that Core
 * makes of `TRUInteger` (as wide as a pointer: 8 bytes on 64-bit targets), twice as wide, in which
 * case the number is its low 32 bits, as it is when Core is built for 32 bits.
 */
function numberReader(kind: NumberKind, acceptsPointerWidth: boolean): ElementReader<number> {
  const constructor = typedArrayConstructors[kind] as unknown as TypedArrayConstructor<NumberArray>;

  // How many numbers of the kind one element takes, and which of them is the value.
  const layout = (memory: CoreMemory) => {
    const array = memory.numbers(constructor);
    const stride = memory.length === 0 ? 1 : array.length / memory.length;
    if (stride !== 1 && !(acceptsPointerWidth && stride === 2)) {
      throw notNumbers(kind);
    }
    return { array, stride, low: isLittleEndian ? 0 : stride - 1 };
  };

  return {
    get(memory, index) {
      const { array, stride, low } = layout(memory);
      return array[index * stride + low] as number;
    },
    copy(memory, fromIndex, toIndex) {
      const { array, stride, low } = layout(memory);
      const count = toIndex - fromIndex;
      const copy = new constructor(new ArrayBuffer(count * constructor.BYTES_PER_ELEMENT));
      if (stride === 1) {
        copy.set(array.subarray(fromIndex, toIndex));
      } else {
        for (let index = 0; index < count; index++) {
          copy[index] = array[(fromIndex + index) * stride + low] as number;
        }
      }
      return copy;
    },
  };
}

// The points of Core are pairs of floats, which are read from the same buffer as numbers.
const pointReader: ElementReader<{ readonly x: number; readonly y: number }> = {
  get(memory, index) {
    const array = pairs(memory);
    return { x: array[index * 2] as number, y: array[index * 2 + 1] as number };
  },
  copy(memory, fromIndex, toIndex) {
    return pairs(memory).slice(fromIndex * 2, toIndex * 2);
  },
};

function pairs(memory: CoreMemory): Float32Array {
  const array = memory.numbers(Float32Array);
  if (array.length !== memory.length * 2) {
    throw new TypeError("The elements of this memory are not points.");
  }
  return array;
}

// The structs are made by the native side from the description of the struct, so what they hold is
// not known to this reader.
const structReader: ElementReader<unknown> = {
  get: (memory, index) => memory.structs(index, index + 1)[0],
  range: (memory, fromIndex, toIndex) => memory.structs(fromIndex, toIndex),
};

/**
 * A list of elements that Core keeps in memory. They are read from that memory when they are asked
 * for, and are never converted in advance: making a list, or a slice of one, does not touch the
 * memory at all. A slice reads the same memory as the list it was cut from.
 *
 * The owner keeps the memory valid, so every read checks that it is not disposed.
 *
 * @internal
 */
export class CoreList<T> extends List<T> {
  readonly #memory: CoreMemory;
  readonly #reader: ElementReader<T>;
  readonly #offset: number;
  readonly length: number;

  /** @param offset The index in `memory` of the first element of the list. */
  constructor(memory: CoreMemory, reader: ElementReader<T>, offset = 0, length: number = memory.length - offset) {
    super();
    this.#memory = memory;
    this.#reader = reader;
    this.#offset = offset;
    this.length = length;
  }

  get(index: number): T {
    this.checkIndex(index);
    return this.#reader.get(this.#memory, this.#offset + index);
  }

  override slice(fromIndex = 0, toIndex: number = this.length): CoreList<T> {
    this.checkSlice(fromIndex, toIndex);
    return new CoreList(this.#memory, this.#reader, this.#offset + fromIndex, toIndex - fromIndex);
  }

  override toArray(): T[] {
    if (this.#reader.range === undefined) {
      return super.toArray();
    }
    return this.#reader.range(this.#memory, this.#offset, this.#offset + this.length);
  }

  /**
   * Copies all of the numbers to a new typed array of the kind of the list.
   *
   * @throws TypeError if the elements are not numbers.
   */
  toTypedArray(): ArrayBufferView {
    return this.#copy();
  }

  /**
   * Copies all of the points to a new array of the pairs `x, y`.
   *
   * @throws TypeError if the elements are not points.
   */
  toFloat32Array(): Float32Array {
    return this.#copy() as Float32Array;
  }

  #copy(): ArrayBufferView {
    if (this.#reader.copy === undefined) {
      throw new TypeError("The elements of this list are not numbers.");
    }
    return this.#reader.copy(this.#memory, this.#offset, this.#offset + this.length);
  }
}

/**
 * Makes a list of the numbers of an array of Core, which is `undefined` when it has no elements.
 * Nothing is read.
 *
 * @internal
 */
export function coreNumbers<K extends NumberKind>(
  owner: NativeObject<string>,
  pointer: PointerView<string> | undefined,
  length: number,
  kind: K,
): NumberList<K> {
  return new CoreList(new CoreMemory(owner, pointer, length), numberReader(kind, false)) as unknown as NumberList<K>;
}

/**
 * Makes a list of the indices that Core keeps as `TRUInteger` (the cluster map of a run), which are
 * `UInt32` numbers whatever the width of that type is on the device: on a 64-bit target the low 32
 * bits are read, which is all there is since the text of a run is shorter than 4 GiB. `TRInvalidIndex`
 * reads as 4294967295, as it does on a 32-bit target.
 *
 * @internal
 */
export function coreIndices(owner: NativeObject<string>, pointer: PointerView<string> | undefined, length: number): NumberList<"UInt32"> {
  return new CoreList(new CoreMemory(owner, pointer, length), numberReader("UInt32", true)) as unknown as NumberList<"UInt32">;
}

/** Makes a list of the points of an array of Core. Nothing is read. @internal */
export function corePoints(owner: NativeObject<string>, pointer: PointerView<string> | undefined, length: number): PointList {
  return new CoreList(new CoreMemory(owner, pointer, length), pointReader) as unknown as PointList;
}

/**
 * Makes a list of the structs of an array of Core that the native side converts to objects (the
 * structs of `NativeFunctions.ts` that have a codec). `T` is the type of what it makes, which the
 * caller states. Nothing is read.
 *
 * @internal
 */
export function coreStructs<T>(owner: NativeObject<string>, pointer: PointerView<string> | undefined, length: number): List<T> {
  return new CoreList(new CoreMemory(owner, pointer, length), structReader as ElementReader<T>);
}
