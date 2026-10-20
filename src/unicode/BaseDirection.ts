/** The base direction of a paragraph, which are also the values of the levels that SheenBidi takes. */
export const BaseDirection = {
  /** The paragraph is left-to-right (level 0). */
  LeftToRight: 0,
  /** The paragraph is right-to-left (level 1). */
  RightToLeft: 1,
  /**
   * The direction is the one of the first strong character of the paragraph, as the Unicode
   * Bidirectional Algorithm says. Without a strong character, it is left-to-right.
   */
  DefaultLeftToRight: 0xfe,
  /**
   * The direction is the one of the first strong character of the paragraph, as the Unicode
   * Bidirectional Algorithm says. Without a strong character, it is right-to-left.
   */
  DefaultRightToLeft: 0xfd,
} as const;

export type BaseDirection = (typeof BaseDirection)[keyof typeof BaseDirection];

/** The greatest embedding level that text can have. */
export const MAX_BIDI_LEVEL = 125;

/**
 * The greatest level that can be given as the base level of a paragraph. SheenBidi takes 125 and
 * above for a request to find the direction, so 125 would silently not be a level.
 */
export const MAX_BASE_LEVEL = 124;
