import { getNativeBindings } from "../internal/NativeBindings.js";
import type { PointerView } from "../internal/NativeFunctions.js";
import type { NativeObject } from "../internal/NativeObject.js";
import type { TypedArrayConstructor } from "./NumberKind.js";

/** What a `*Ptr()` getter and its count function gave at one moment. */
export interface MemoryState {
  /** What the getter of Core returned, which is `undefined` for no memory. */
  readonly pointer: PointerView<string> | undefined;
  /** What the count function of Core returned. */
  readonly length: number;
}

/**
 * Asks Core for the pointer and the count again. Required for an owner that Core lets change (a
 * shaping engine, a mutable text, ...): see {@link CoreMemory}.
 *
 * @internal
 */
export type MemorySource = () => MemoryState;

/** A typed array over the elements, and how many elements there are in it now. @internal */
export interface NumberMemory<A extends ArrayBufferView> {
  readonly array: A;
  readonly length: number;
}

/**
 * The elements of an array in the memory of an object of Core, which a list reads. It is made from
 * what a `*Ptr()` getter returned and the count that the matching function gave, and keeps both
 * without asking Core for anything: no element is read, and no buffer is made, until a list asks
 * for one.
 *
 * **Immutable owners.** The memory lives as long as the object, so the pointer, the length and the
 * buffer are kept. The elements are valid while the owner is not disposed: every read checks it
 * first and fails with "already disposed" if it is. Numbers are read through an `ArrayBuffer` over
 * Core's memory, made on the first read. The buffer holds a reference of its own to the owner's
 * object (see `createPointerBuffer`), so it cannot dangle even if it is never touched again, but
 * that also means the object lives until the buffer is collected. To not keep an object that was
 * disposed for longer than needed, a read that finds the owner disposed drops the buffer.
 *
 * **Mutable owners.** A reference to the object keeps the object alive, not the array behind a
 * pointer: a setter (`TRShapingEngineSetOpenTypeFeatures`) can free it while the object lives. A
 * pointer, a length or a buffer that was kept would then read freed memory, so for an owner that
 * Core lets change nothing is kept: every read calls `refresh` (the getter and the count function
 * again) and reads through what it returns. The list's `length` is what it was when the list was
 * made; a read that finds fewer elements now fails with a `RangeError`. Such a memory without a
 * `refresh` fails on its first read, since it cannot be read safely. Do not change the owner while
 * a read is running (a mutable object is not thread safe).
 *
 * The buffer is Core's memory, which is immutable: it is only read, never given out.
 *
 * @internal
 */
export class CoreMemory {
  readonly #owner: NativeObject<string>;
  readonly #pointer: PointerView<string> | undefined;
  readonly #refresh: MemorySource | undefined;
  #isVolatile: boolean | undefined;
  #typed: { readonly constructor: TypedArrayConstructor<ArrayBufferView>; readonly array: ArrayBufferView } | undefined;

  /** The number of elements when the memory was made. */
  readonly length: number;

  /**
   * @param pointer What the getter of Core returned, which is `undefined` for no memory.
   * @param length What the count function of Core returned.
   * @param refresh Calls the getter and the count function again; required for a mutable owner.
   * @throws RangeError if `length` is not a whole number.
   * @throws Error if there are elements but Core gave no memory for them.
   */
  constructor(owner: NativeObject<string>, pointer: PointerView<string> | undefined, length: number, refresh?: MemorySource) {
    CoreMemory.#validate(pointer, length);

    this.#owner = owner;
    this.#pointer = pointer;
    this.#refresh = refresh;
    this.length = length;
  }

  static #validate(pointer: PointerView<string> | undefined, length: number): void {
    if (!Number.isInteger(length) || length < 0) {
      throw new RangeError(`length (${length}) is not a count.`);
    }
    if ((pointer === undefined || pointer === null) && length > 0) {
      throw new Error(`Core gave no memory for ${length} elements.`);
    }
  }

  /** @throws Error if the owner is disposed. */
  checkAlive(): void {
    try {
      // Reading the handle of a disposed object fails with a message that says so.
      void this.#owner.nativeHandle;
    } catch (error) {
      this.#typed = undefined;
      throw error;
    }
  }

  /**
   * The pointer and the count to read now, after checking that the owner is alive: the ones kept
   * for an immutable owner, fresh ones from Core for a mutable owner.
   */
  #current(): MemoryState & { readonly isVolatile: boolean } {
    this.checkAlive();

    // Whether an object can change is fixed when it is made, so it is asked once.
    this.#isVolatile ??= getNativeBindings().isHandleMutable(this.#owner.nativeHandle);
    if (!this.#isVolatile) {
      return { pointer: this.#pointer, length: this.length, isVolatile: false };
    }

    if (this.#refresh === undefined) {
      throw new Error("The owner of this memory can change, so the memory cannot be read without asking Core again.");
    }
    const state = this.#refresh();
    CoreMemory.#validate(state.pointer, state.length);
    return { ...state, isVolatile: true };
  }

  /**
   * All of the elements as a typed array over Core's memory, which is for reading only, and which a
   * caller must not give out, with how many elements there are in it now. An element can be wider
   * than the typed array's, so the array's length is a multiple of that count: the caller checks
   * the ratio. Use the result at once: for a mutable owner it is not kept, and is only valid until
   * Core's next change.
   *
   * @throws Error if the owner is disposed.
   * @throws TypeError if the elements are not made of whole numbers of the typed array's size.
   * @throws RangeError if the memory is not aligned for the typed array.
   */
  numbers<A extends ArrayBufferView>(constructor: TypedArrayConstructor<A>): NumberMemory<A> {
    const { pointer, length, isVolatile } = this.#current();

    const cached = this.#typed;
    if (!isVolatile && cached !== undefined && cached.constructor === constructor) {
      return { array: cached.array as A, length };
    }

    let buffer: ArrayBuffer;
    if (length === 0 || pointer === undefined || pointer === null) {
      buffer = new ArrayBuffer(0);
    } else {
      buffer = getNativeBindings().createPointerBuffer(pointer, length, constructor.BYTES_PER_ELEMENT);
    }
    if (buffer.byteLength % constructor.BYTES_PER_ELEMENT !== 0) {
      throw new TypeError("The elements of this memory are not made of numbers of that kind.");
    }

    const array = new constructor(buffer);
    if (!isVolatile) {
      this.#typed = { constructor, array };
    }
    return { array, length };
  }

  /**
   * The elements from `fromIndex` up to `toIndex` as objects, converted by the native side with the
   * description of the struct, so that no offset is known here.
   *
   * @throws Error if the owner is disposed, or the elements are not structs that are converted.
   * @throws RangeError if a mutable owner has fewer elements than `toIndex` now.
   */
  structs(fromIndex: number, toIndex: number): unknown[] {
    const { pointer, length } = this.#current();
    CoreMemory.requireElements(length, toIndex);
    if (pointer === undefined || pointer === null || fromIndex === toIndex) {
      return [];
    }

    return getNativeBindings().readPointerStructs(pointer, length, fromIndex, toIndex);
  }

  /**
   * Checks that the memory still has elements up to `toIndex`, which only fails for a mutable owner
   * that Core changed after the list was made.
   *
   * @throws RangeError if it does not.
   */
  static requireElements(length: number, toIndex: number): void {
    if (toIndex > length) {
      throw new RangeError(`The memory has ${length} elements now, fewer than the list was made for (${toIndex}).`);
    }
  }
}
