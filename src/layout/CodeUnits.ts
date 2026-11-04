/** `TRStringEncodingUTF16`: the text of this wrapper is always UTF-16, as a JavaScript string is. */
export const UTF16 = 1;

// Large enough to keep String.fromCharCode away from the engine's argument limit.
const CHUNK = 8192;

/** The code units of a string, which keep an unpaired surrogate as it is. @internal */
export function toCodeUnits(text: string): Uint16Array {
  if (typeof text !== "string") {
    throw new TypeError("text must be a string.");
  }
  const units = new Uint16Array(text.length);
  for (let index = 0; index < units.length; index++) {
    units[index] = text.charCodeAt(index);
  }
  return units;
}

/** The string of some code units. @internal */
export function fromCodeUnits(units: Uint16Array): string {
  let result = "";
  for (let start = 0; start < units.length; start += CHUNK) {
    result += String.fromCharCode(...units.subarray(start, start + CHUNK));
  }
  return result;
}
