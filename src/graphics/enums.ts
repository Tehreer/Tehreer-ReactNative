// Core's constants, verified against the headers in tests/enums.test.ts. They are constant objects
// rather than TypeScript enums because the project allows only erasable syntax.

/** The thickness of a typeface on the scale of the CSS and OpenType weight classes. */
export const TypeWeight = {
  /** Thin, 100. */
  Thin: 100,
  /** Extra light, 200. */
  ExtraLight: 200,
  /** Light, 300. */
  Light: 300,
  /** Regular, 400. */
  Regular: 400,
  /** Medium, 500. */
  Medium: 500,
  /** Semi bold, 600. */
  SemiBold: 600,
  /** Bold, 700. */
  Bold: 700,
  /** Extra bold, 800. */
  ExtraBold: 800,
  /** Extra heavy, 900. */
  ExtraHeavy: 900,
} as const;

export type TypeWeight = (typeof TypeWeight)[keyof typeof TypeWeight];

/** How condensed or expanded a typeface is, on the scale of the OpenType width classes. */
export const TypeWidth = {
  /** 50% of the normal width. */
  UltraCondensed: 1,
  /** 62.5% of the normal width. */
  ExtraCondensed: 2,
  /** 75% of the normal width. */
  Condensed: 3,
  /** 87.5% of the normal width. */
  SemiCondensed: 4,
  /** The normal width, 100%. */
  Normal: 5,
  /** 112.5% of the normal width. */
  SemiExpanded: 6,
  /** 125% of the normal width. */
  Expanded: 7,
  /** 150% of the normal width. */
  ExtraExpanded: 8,
  /** 200% of the normal width. */
  UltraExpanded: 9,
} as const;

export type TypeWidth = (typeof TypeWidth)[keyof typeof TypeWidth];

/** Whether a typeface is upright, italic or oblique. */
export const TypeSlope = {
  /** Upright. */
  Plain: 0,
  /** The italic design of the family. */
  Italic: 1,
  /** An upright design that is slanted. */
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
  /** The stroke ends exactly at the end point. */
  Butt: 0,
  /** The stroke ends with a semicircle around the end point. */
  Round: 1,
  /** The stroke ends with a square that extends by the stroke radius. */
  Square: 2,
} as const;

export type StrokeCap = (typeof StrokeCap)[keyof typeof StrokeCap];

/** The shape at the corner of a stroked contour. */
export const StrokeJoin = {
  /** Corners are rounded. */
  Round: 0,
  /** Corners are cut off flat. */
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
  /** The image of the filled glyph. */
  Fill: 0,
  /** The image of the stroked outline of the glyph. */
  Stroke: 1,
} as const;

export type GlyphImageKind = (typeof GlyphImageKind)[keyof typeof GlyphImageKind];
