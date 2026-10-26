import { fromByteArray } from 'base64-js';
import { PixelRatio } from 'react-native';
import { GlyphImageFormat, Renderer } from 'tehreer-react-native';
import type { GlyphImage, Typeface } from 'tehreer-react-native';
import UPNG from 'upng-js';

/*
 * React Native has no canvas, and the library draws lines and not single glyphs. To show a glyph
 * by its ID, the demo takes the image that a `Renderer` makes of it (public API: `getGlyphImage`,
 * `getStrokeImage`, `computeGlyphInkBox`), encodes its pixels as a PNG with `upng-js`, and shows
 * that with an `Image` through a `data:` URI made with `base64-js`.
 */

/** A `data:` URI of the PNG that `UPNG` encodes from straight RGBA pixels. */
function pngUri(width: number, height: number, rgba: Uint8Array): string {
  // A cnum of 0 keeps every color, which is what a glyph needs.
  const png = UPNG.encode([rgba.buffer as ArrayBuffer], width, height, 0);
  return `data:image/png;base64,${fromByteArray(new Uint8Array(png))}`;
}

/** A PNG of an `Alpha` image in one color. */
function alphaPng(image: GlyphImage, red: number, green: number, blue: number): string {
  const source = image.pixels;
  const rgba = new Uint8Array(source.length * 4);
  for (let i = 0; i < source.length; i++) {
    rgba[i * 4] = red;
    rgba[i * 4 + 1] = green;
    rgba[i * 4 + 2] = blue;
    rgba[i * 4 + 3] = source[i]!;
  }
  return pngUri(image.width, image.height, rgba);
}

/** A PNG of an `ARGB` image (a color glyph), whose premultiplied channels are converted to straight ones. */
function argbPng(image: GlyphImage): string {
  const source = image.pixels;
  const rgba = new Uint8Array(source.length);
  for (let i = 0; i + 3 < source.length; i += 4) {
    const alpha = source[i]!;
    const unmultiply = (value: number) => (alpha === 0 ? 0 : Math.min(255, Math.round((value * 255) / alpha)));
    rgba[i] = unmultiply(source[i + 1]!);
    rgba[i + 1] = unmultiply(source[i + 2]!);
    rgba[i + 2] = unmultiply(source[i + 3]!);
    rgba[i + 3] = alpha;
  }
  return pngUri(image.width, image.height, rgba);
}

/** The image of a glyph and where to put it, in points, from the pen position on the baseline. */
export interface GlyphBitmap {
  readonly uri: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Parses `#RRGGBB`. */
function parseRgb(color: string): [number, number, number] {
  const value = Number.parseInt(color.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** The renderer that the demo draws glyphs with, which the caller owns and disposes. */
export function makeGlyphRenderer(typeface: Typeface): Renderer {
  const renderer = new Renderer();
  try {
    renderer.typeface = typeface;
    return renderer;
  } catch (error) {
    renderer.dispose();
    throw error;
  }
}

/**
 * Makes the bitmap of a glyph at a size in points, for the density of the screen, in one color
 * (a color glyph keeps its own). The image of Core is disposed before this returns, as the PNG
 * holds a copy of its pixels.
 *
 * @param stroke True for the image of the outline, for the stroke radius given in points.
 * @returns `undefined` for a glyph with nothing to draw, such as a space.
 */
export function makeGlyphBitmap(renderer: Renderer, glyphId: number, typeSize: number, color: string, stroke?: number): GlyphBitmap | undefined {
  const density = PixelRatio.get();
  renderer.typeSize = typeSize * density;
  if (stroke !== undefined) {
    renderer.strokeRadius = stroke * density;
  }
  const image = stroke === undefined ? renderer.getGlyphImage(glyphId) : renderer.getStrokeImage(glyphId);
  if (image === undefined) {
    return undefined;
  }
  try {
    if (image.width === 0 || image.height === 0) {
      return undefined;
    }
    const [red, green, blue] = parseRgb(color);
    return {
      uri: image.format === GlyphImageFormat.Alpha ? alphaPng(image, red, green, blue) : argbPng(image),
      x: image.left / density,
      y: -image.top / density,
      width: image.width / density,
      height: image.height / density,
    };
  } finally {
    image.dispose();
  }
}

/** The box around the ink of a glyph at a size in points, in points from the pen position, with y downward. */
export function measureGlyph(renderer: Renderer, glyphId: number, typeSize: number): { x: number; y: number; width: number; height: number } {
  const density = PixelRatio.get();
  renderer.typeSize = typeSize * density;
  const box = renderer.computeGlyphInkBox(glyphId);
  return { x: box.x / density, y: box.y / density, width: box.width / density, height: box.height / density };
}
