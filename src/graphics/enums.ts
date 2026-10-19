// Core's constants, verified against the headers in tests/enums.test.ts. They are constant objects
// rather than TypeScript enums because the project allows only erasable syntax.

/** The thickness of a typeface on the scale of the CSS and OpenType weight classes. */
export const TypeWeight = {
  Thin: 100,
  ExtraLight: 200,
  Light: 300,
  Regular: 400,
  Medium: 500,
  SemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  ExtraHeavy: 900,
} as const;

export type TypeWeight = (typeof TypeWeight)[keyof typeof TypeWeight];

/** How condensed or expanded a typeface is, on the scale of the OpenType width classes. */
export const TypeWidth = {
  UltraCondensed: 1,
  ExtraCondensed: 2,
  Condensed: 3,
  SemiCondensed: 4,
  Normal: 5,
  SemiExpanded: 6,
  Expanded: 7,
  ExtraExpanded: 8,
  UltraExpanded: 9,
} as const;

export type TypeWidth = (typeof TypeWidth)[keyof typeof TypeWidth];

/** Whether a typeface is upright, italic or oblique. */
export const TypeSlope = {
  Plain: 0,
  Italic: 1,
  Oblique: 2,
} as const;

export type TypeSlope = (typeof TypeSlope)[keyof typeof TypeSlope];

/** What the draw functions produce for glyphs. */
export const DrawStyle = {
  /** The glyphs are filled with the foreground color. */
  Fill: 0,
  /** The outlines are drawn with the stroke color. */
  Stroke: 1,
  /** The glyphs are filled, and then their outlines are drawn. */
  FillStroke: 2,
} as const;

export type DrawStyle = (typeof DrawStyle)[keyof typeof DrawStyle];

/** The shape at the end of an open stroked contour. */
export const StrokeCap = {
  Butt: 0,
  Round: 1,
  Square: 2,
} as const;

export type StrokeCap = (typeof StrokeCap)[keyof typeof StrokeCap];

/** The shape at the corner of a stroked contour. */
export const StrokeJoin = {
  Round: 0,
  Bevel: 1,
  /** A miter, which is cut at the miter limit of the renderer, as a variable length. */
  MiterVariable: 2,
  /** A miter that is cut at a fixed length. */
  MiterFixed: 3,
} as const;

export type StrokeJoin = (typeof StrokeJoin)[keyof typeof StrokeJoin];

/** The pixel format of a glyph image. */
export const GlyphImageFormat = {
  /** One byte per pixel, which is the coverage of the glyph. */
  Alpha: 0,
  /** Four bytes per pixel in the order alpha, red, green, blue, premultiplied by alpha. */
  ARGB: 1,
} as const;

export type GlyphImageFormat = (typeof GlyphImageFormat)[keyof typeof GlyphImageFormat];

/** Which kind of image of a glyph a renderer makes. */
export const GlyphImageKind = {
  Fill: 0,
  Stroke: 1,
} as const;

export type GlyphImageKind = (typeof GlyphImageKind)[keyof typeof GlyphImageKind];
