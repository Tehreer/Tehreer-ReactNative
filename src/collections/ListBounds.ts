/** Checks that `index` is a whole number from 0 up to, but not including, `count`. */
export function checkElement(name: string, index: number, count: number): void {
  if (!Number.isInteger(index) || index < 0 || index >= count) {
    throw new RangeError(`${name} (${index}) is out of the range 0..${count - 1}.`);
  }
}

/** Checks that `fromIndex <= toIndex` and both are whole numbers within 0..`limit`. */
export function checkRange(fromIndex: number, toIndex: number, limit: number): void {
  if (
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    fromIndex > toIndex ||
    toIndex > limit
  ) {
    throw new RangeError(`The range ${fromIndex}..${toIndex} is not within 0..${limit}.`);
  }
}
