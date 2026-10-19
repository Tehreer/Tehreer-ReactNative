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
  Start: 0,
  Middle: 1,
  End: 2,
} as const;

export type TruncationPlace = (typeof TruncationPlace)[keyof typeof TruncationPlace];

/** The alignment of the lines of a paragraph. Leading and trailing follow its base direction. */
export const TextAlignment = {
  Left: 0,
  Center: 1,
  Right: 2,
  /** The edge where the paragraph starts: left for left-to-right text, right otherwise. */
  Leading: 3,
  /** The edge where the paragraph ends. */
  Trailing: 4,
} as const;

export type TextAlignment = (typeof TextAlignment)[keyof typeof TextAlignment];

/** Where the lines go when a frame is taller than they are. */
export const VerticalAlignment = {
  Top: 0,
  Center: 1,
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
