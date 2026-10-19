/**
 * Passed as the first argument of an internal constructor overload, which takes ownership of a
 * reference that Core has created instead of creating a new object.
 */
export const adopt: unique symbol = Symbol("adopt");
