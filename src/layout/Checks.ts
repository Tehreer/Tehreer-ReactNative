/**
 * Argument checks that the layout classes share. Core takes indices as `TRUInteger`, which the
 * bindings read as -1 for `TRInvalidIndex`, so a negative index must never reach them; the upper
 * bound of a range is Core's to check.
 */

/** @throws RangeError if the value is not a whole number that is not negative. @internal */
export function checkIndex(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} (${String(value)}) must be a whole number that is not negative.`);
  }
}

/**
 * Checks that `fromIndex <= toIndex` and both are whole numbers that are not negative.
 *
 * @throws RangeError if they are not.
 * @internal
 */
export function checkOrderedRange(fromIndex: number, toIndex: number): void {
  checkIndex("fromIndex", fromIndex);
  checkIndex("toIndex", toIndex);
  if (fromIndex > toIndex) {
    throw new RangeError(`The range ${fromIndex}..${toIndex} is not ordered.`);
  }
}

/**
 * Like {@link checkOrderedRange}, and the range must not be empty (Core's functions say it MUST NOT
 * be zero).
 *
 * @throws RangeError if it is not.
 * @internal
 */
export function checkNonEmptyRange(fromIndex: number, toIndex: number): void {
  checkOrderedRange(fromIndex, toIndex);
  if (fromIndex === toIndex) {
    throw new RangeError("The range must not be empty.");
  }
}

/**
 * Checks that a value is one of the constants of an enumeration. Core handles the others in its
 * own way (as the default, or with no result), which the wrapper does not hide behind a guess.
 *
 * @throws RangeError if it is not.
 * @internal
 */
export function checkConstant(name: string, value: unknown, constants: Readonly<Record<string, number>>): void {
  if (typeof value !== "number" || !Object.values(constants).includes(value)) {
    throw new RangeError(`${name} (${String(value)}) is not one of its constants.`);
  }
}
