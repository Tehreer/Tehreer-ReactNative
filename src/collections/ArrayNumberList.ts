import { List, type NumberList } from "./List.js";
import { typedArrayConstructors, type NumberKind, type TypedArrays } from "./NumberKind.js";

/**
 * A list of numbers that were already copied out of Core, such as the coordinates of one named
 * style, which the native side converts together with the rest of the style. It reads nothing from
 * Core and so needs no owner; it is a snapshot of the moment the element was read.
 *
 * @internal
 */
export class ArrayNumberList<K extends NumberKind> extends List<number> implements NumberList<K> {
  readonly #kind: K;
  readonly #numbers: readonly number[];
  readonly length: number;

  constructor(kind: K, numbers: readonly number[]) {
    super();
    this.#kind = kind;
    this.#numbers = numbers;
    this.length = numbers.length;
  }

  get(index: number): number {
    this.checkIndex(index);
    return this.#numbers[index] as number;
  }

  override slice(fromIndex = 0, toIndex: number = this.length): ArrayNumberList<K> {
    this.checkSlice(fromIndex, toIndex);
    return new ArrayNumberList(this.#kind, this.#numbers.slice(fromIndex, toIndex));
  }

  override toArray(): number[] {
    return this.#numbers.slice();
  }

  toTypedArray(): TypedArrays[K] {
    const constructor = typedArrayConstructors[this.#kind];
    const array = new constructor(new ArrayBuffer(this.length * constructor.BYTES_PER_ELEMENT));
    (array as unknown as { set(values: ArrayLike<number>): void }).set(this.#numbers);
    return array;
  }
}
