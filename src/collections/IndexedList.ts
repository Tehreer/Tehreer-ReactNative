import type { NativeObject } from "../internal/NativeObject.js";
import { List } from "./List.js";

/**
 * The elements that are made by a function from their index, such as the runs of a line. Their
 * number is known when the list is made, as the objects of Core do not change. Nothing is made
 * until an element is asked for, and each ask makes a new one.
 *
 * @internal
 */
export class IndexedList<T> extends List<T> {
  readonly #owner: NativeObject<string>;
  readonly #item: (index: number) => T;
  readonly #offset: number;
  readonly length: number;

  /**
   * @param owner What the elements belong to: reading fails once it is disposed.
   * @param item Makes the element at an index, which is within 0..`length` of the list that
   *   {@link IndexedList.slice} cut from, so it is counted from the first element of the whole list.
   */
  constructor(owner: NativeObject<string>, length: number, item: (index: number) => T, offset = 0) {
    super();
    this.#owner = owner;
    this.length = length;
    this.#item = item;
    this.#offset = offset;
  }

  get(index: number): T {
    this.checkIndex(index);
    // Reading the handle of a disposed object fails with a message that says so.
    void this.#owner.nativeHandle;
    return this.#item(this.#offset + index);
  }

  slice(fromIndex = 0, toIndex: number = this.length): IndexedList<T> {
    this.checkSlice(fromIndex, toIndex);
    return new IndexedList(this.#owner, toIndex - fromIndex, this.#item, this.#offset + fromIndex);
  }
}
