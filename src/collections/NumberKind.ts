/** An unsigned 8-bit integer, as the kind of the numbers of a `NumberList`. */
export type UInt8 = "UInt8";
/** An unsigned 16-bit integer, such as a glyph ID. */
export type UInt16 = "UInt16";
/** A signed 32-bit integer. */
export type Int32 = "Int32";
/** An unsigned 32-bit integer, such as a color or an index. */
export type UInt32 = "UInt32";
/** A 32-bit floating point number. */
export type Float = "Float";

/** The typed array that holds numbers of each kind. */
export interface TypedArrays {
  UInt8: Uint8Array;
  UInt16: Uint16Array;
  Int32: Int32Array;
  UInt32: Uint32Array;
  Float: Float32Array;
}

/** The kinds of numbers that a list can have. */
export type NumberKind = keyof TypedArrays;

/** What every typed array of a kind of number can do, so that code can read them without knowing the kind. @internal */
export interface NumberArray extends ArrayBufferView {
  readonly length: number;
  [index: number]: number;
  set(array: ArrayLike<number>, offset?: number): void;
  subarray(begin: number, end: number): NumberArray;
}

/** A typed array class that can be made over a whole `ArrayBuffer`. */
export interface TypedArrayConstructor<A extends ArrayBufferView> {
  readonly BYTES_PER_ELEMENT: number;
  new (buffer: ArrayBuffer): A;
}

/**
 * The class of the typed arrays of each kind, which is how a kind tells its size and how to read
 * it.
 *
 * @internal
 */
export const typedArrayConstructors: { readonly [K in NumberKind]: TypedArrayConstructor<TypedArrays[K]> } = {
  UInt8: Uint8Array,
  UInt16: Uint16Array,
  Int32: Int32Array,
  UInt32: Uint32Array,
  Float: Float32Array,
};
