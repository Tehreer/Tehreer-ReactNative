// Core's constants, verified against the headers in tests/enums.test.ts. They are constant objects
// rather than TypeScript enums because the project allows only erasable syntax.

/** The direction in which text of a script is written. */
export const WritingDirection = {
  /** Glyphs advance from left to right. */
  LeftToRight: 0,
  /** Glyphs advance from right to left. */
  RightToLeft: 1,
} as const;

export type WritingDirection = (typeof WritingDirection)[keyof typeof WritingDirection];

/** The order in which the code units of text are shaped. */
export const ShapingOrder = {
  /** Code units are shaped from the start of the text to its end. */
  Forward: 0,
  /** Code units are shaped from the end of the text to its start. */
  Backward: 1,
} as const;

export type ShapingOrder = (typeof ShapingOrder)[keyof typeof ShapingOrder];
