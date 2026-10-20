/** A four-character tag of an SFNT table, script, language or feature, as an unsigned integer. */
export type SfntTag = number;

/** Functions to convert tags between strings and integers. */
export const SfntTag = {
  /**
   * Makes a tag from a string of up to four characters between U+0020 and U+007E, which is padded
   * with spaces on the right, so `"URD"` and `"URD "` are the same tag.
   *
   * @throws RangeError if the string is empty, longer than four characters or not printable ASCII.
   */
  make(text: string): SfntTag {
    if (text.length === 0 || text.length > 4 || !/^[\x20-\x7e]+$/.test(text)) {
      throw new RangeError(`Not a valid tag: "${text}"`);
    }

    const padded = text.padEnd(4, " ");
    // Unsigned: the first character in the top byte would otherwise make a negative number.
    return ((padded.charCodeAt(0) << 24) | (padded.charCodeAt(1) << 16) | (padded.charCodeAt(2) << 8) | padded.charCodeAt(3)) >>> 0;
  },

  /** Converts a tag to its four characters, without trimming the padding. */
  toString(tag: SfntTag): string {
    return String.fromCharCode((tag >>> 24) & 0xff, (tag >>> 16) & 0xff, (tag >>> 8) & 0xff, tag & 0xff);
  },
} as const;
