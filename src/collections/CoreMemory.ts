import { getNativeBindings } from "../internal/NativeBindings.js";
import type { PointerView } from "../internal/NativeFunctions.js";
import type { NativeObject } from "../internal/NativeObject.js";
import type { TypedArrayConstructor } from "./NumberKind.js";

/**
 * The elements of an array in the memory of an object of Core, which a list reads. It is made from
 * what a `*Ptr()` getter returned and the count that the matching function gave, and keeps both
 * without asking Core for anything: no element is read, and no buffer is made, until a list asks
 * for one.
 *
 * **Lifetime.** The elements are valid while the owner is not disposed: every read checks it first
 * and fails with "already disposed" if it is. Numbers are read through an `ArrayBuffer` over Core's
 * memory, made on the first read. The buffer holds a reference of its own to the owner's object
 * (see `createPointerBuffer`), so it cannot dangle even if it is never touched again, but that also
 * means the object lives until the buffer is collected. To not keep an object that was disposed
 * for longer than needed, a read that finds the owner disposed drops the buffer.
 *
 * The buffer is Core's memory, which is immutable: it is only read, never given out.
 *
 * @internal
 */
export class CoreMemory {
  readonly #owner: NativeObject<string>;
  readonly #pointer: PointerView<string> | undefined;
  #typed: { readonly constructor: TypedArrayConstructor<ArrayBufferView>; readonly array: ArrayBufferView } | undefined;

  /** The number of elements. */
  readonly length: number;

  /**
   * @param pointer What the getter of Core returned, which is `undefined` for no memory.
   * @param length What the count function of Core returned.
   * @throws RangeError if `length` is not a whole number.
   * @throws Error if there are elements but Core gave no memory for them.
   */
  constructor(owner: NativeObject<string>, pointer: PointerView<string> | undefined, length: number) {
    if (!Number.isInteger(length) || length < 0) {
      throw new RangeError(`length (${length}) is not a count.`);
    }
    if (pointer === undefined && length > 0) {
      throw new Error(`Core gave no memory for ${length} elements.`);
    }

    this.#owner = owner;
    this.#pointer = pointer;
    this.length = length;
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
   * All of the elements as a typed array over Core's memory, which is for reading only, and which a
   * caller must not give out. An element can be wider than the typed array's, so its length is a
   * multiple of {@link length}: the caller checks the ratio.
   *
   * @throws Error if the owner is disposed.
   * @throws TypeError if the elements are not made of whole numbers of the typed array's size.
   * @throws RangeError if the memory is not aligned for the typed array.
   */
  numbers<A extends ArrayBufferView>(constructor: TypedArrayConstructor<A>): A {
    this.checkAlive();

    const cached = this.#typed;
    if (cached !== undefined && cached.constructor === constructor) {
      return cached.array as A;
    }

    let buffer: ArrayBuffer;
    if (this.length === 0 || this.#pointer === undefined) {
      buffer = new ArrayBuffer(0);
    } else {
      buffer = getNativeBindings().createPointerBuffer(this.#pointer, this.length, constructor.BYTES_PER_ELEMENT);
    }
    if (buffer.byteLength % constructor.BYTES_PER_ELEMENT !== 0) {
      throw new TypeError("The elements of this memory are not made of numbers of that kind.");
    }

    const array = new constructor(buffer);
    this.#typed = { constructor, array };
    return array;
  }

  /**
   * The elements from `fromIndex` up to `toIndex` as objects, converted by the native side with the
   * description of the struct, so that no offset is known here.
   *
   * @throws Error if the owner is disposed, or the elements are not structs that are converted.
   */
  structs(fromIndex: number, toIndex: number): unknown[] {
    this.checkAlive();
    if (this.#pointer === undefined || fromIndex === toIndex) {
      return [];
    }

    return getNativeBindings().readPointerStructs(this.#pointer, this.length, fromIndex, toIndex);
  }
}
