// Core's constants, verified against the headers in tests/enums.test.ts. They are constant objects
// rather than TypeScript enums because the project allows only erasable syntax.

/** The direction in which text of a script is written. */
export const WritingDirection = {
  LeftToRight: 0,
  RightToLeft: 1,
} as const;

export type WritingDirection = (typeof WritingDirection)[keyof typeof WritingDirection];

/** The order in which the code units of text are shaped. */
export const ShapingOrder = {
  Forward: 0,
  Backward: 1,
} as const;

export type ShapingOrder = (typeof ShapingOrder)[keyof typeof ShapingOrder];
