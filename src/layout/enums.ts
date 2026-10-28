// Core's constants, verified against the headers in tests/enums.test.ts. They are constant objects
// rather than TypeScript enums because the project allows only erasable syntax.

/** Where a line may break when the text does not fit. */
export const BreakMode = {
  /** A line breaks at the opportunities that Unicode gives. */
  Line: 0,
  /** A line breaks at any character. */
  Character: 1,
} as const;

export type BreakMode = (typeof BreakMode)[keyof typeof BreakMode];

/** Which part of a line is replaced with the token when it is truncated. */
export const TruncationPlace = {
  /** The start of the line is replaced. */
  Start: 0,
  /** The middle of the line is replaced. */
  Middle: 1,
  /** The end of the line is replaced. */
  End: 2,
} as const;

export type TruncationPlace = (typeof TruncationPlace)[keyof typeof TruncationPlace];

/** The alignment of the lines of a paragraph. Leading and trailing follow its base direction. */
export const TextAlignment = {
  /** Lines start at the left edge. */
  Left: 0,
  /** Lines are centered. */
  Center: 1,
  /** Lines end at the right edge. */
  Right: 2,
  /** The edge where the paragraph starts: left for left-to-right text, right otherwise. */
  Leading: 3,
  /** The edge where the paragraph ends. */
  Trailing: 4,
} as const;

export type TextAlignment = (typeof TextAlignment)[keyof typeof TextAlignment];

/** Where the lines go when a frame is taller than they are. */
export const VerticalAlignment = {
  /** The lines start at the top of the frame. */
  Top: 0,
  /** The lines are centered in the frame. */
  Center: 1,
  /** The lines end at the bottom of the frame. */
  Bottom: 2,
} as const;

export type VerticalAlignment = (typeof VerticalAlignment)[keyof typeof VerticalAlignment];

/** How a replacement is placed in the text. */
export const ReplacementKind = {
  /** It stays on the line of the text around it. */
  Inline: 0,
  /** It has a line of its own. */
  Block: 1,
} as const;

export type ReplacementKind = (typeof ReplacementKind)[keyof typeof ReplacementKind];
