import { MutableTypesetter } from '../../src/layout/MutableTypesetter';

/**
 * A mutable typesetter that starts with a string and no attributes, which is what most tests build a
 * text from: set the attributes, then `copy()` it for a typesetter that lays out.
 */
export function mutableText(string: string): MutableTypesetter {
  const text = new MutableTypesetter();
  if (string.length > 0) {
    text.append(string);
  }
  return text;
}
