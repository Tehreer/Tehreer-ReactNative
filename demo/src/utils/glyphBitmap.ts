import { PixelRatio } from 'react-native';
import { GlyphImageFormat, Renderer } from 'tehreer-react-native';
import type { GlyphImage, Typeface } from 'tehreer-react-native';

/*
 * React Native has no canvas, and the library draws lines and not single glyphs. To show a glyph
 * by its ID, the demo takes the image that a `Renderer` makes of it (public API: `getGlyphImage`,
 * `getStrokeImage`, `computeGlyphInkBox`), wraps its pixels in a PNG that it encodes here, and shows
 * that with an `Image` through a `data:` URI. No dependency and no native code are involved.
 */

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes: Uint8Array): string {
  const pieces: string[] = [];
  let chunk = '';
  const length = bytes.length;
  for (let i = 0; i < length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < length ? bytes[i + 1]! : 0;
    const c = i + 2 < length ? bytes[i + 2]! : 0;
    chunk += BASE64[a >> 2]! + BASE64[((a & 3) << 4) | (b >> 4)]!
      + (i + 1 < length ? BASE64[((b & 15) << 2) | (c >> 6)]! : '=')
      + (i + 2 < length ? BASE64[c & 63]! : '=');
    if (chunk.length >= 8192) {
      pieces.push(chunk);
      chunk = '';
    }
  }
  pieces.push(chunk);
  return pieces.join('');
}

let crcTable: Uint32Array | undefined;

function crc32(parts: readonly Uint8Array[]): number {
  if (crcTable === undefined) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const part of parts) {
    for (let i = 0; i < part.length; i++) {
      crc = crcTable[(crc ^ part[i]!) & 0xff]! ^ (crc >>> 8);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) {
    out[4 + i] = type.charCodeAt(i);
  }
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32([out.subarray(4, 8 + data.length)]));
  return out;
}

/**
 * Encodes rows of pixels as a PNG, with the deflate stream stored and not compressed, which any
 * decoder reads and which needs no library. `rows` is `height` rows of `bytesPerRow` bytes, each
 * without the filter byte.
 */
function encodePng(width: number, height: number, colorType: 3 | 6, bytesPerRow: number, pixels: Uint8Array, extra: Uint8Array[]): Uint8Array {
  const stride = bytesPerRow + 1;
  const raw = new Uint8Array(stride * height);
  let adlerA = 1;
  let adlerB = 0;
  for (let y = 0; y < height; y++) {
    const at = y * stride;
    raw[at] = 0;
    raw.set(pixels.subarray(y * bytesPerRow, (y + 1) * bytesPerRow), at + 1);
  }
  // Adler-32 in blocks small enough that the sums do not overflow before the modulo.
  for (let i = 0; i < raw.length;) {
    const end = Math.min(i + 3800, raw.length);
    for (; i < end; i++) {
      adlerA += raw[i]!;
      adlerB += adlerA;
    }
    adlerA %= 65521;
    adlerB %= 65521;
  }

  const blocks = Math.max(1, Math.ceil(raw.length / 65535));
  const zlib = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  zlib[0] = 0x78;
  zlib[1] = 0x01;
  let out = 2;
  for (let block = 0; block < blocks; block++) {
    const start = block * 65535;
    const size = Math.min(65535, raw.length - start);
    zlib[out++] = block === blocks - 1 ? 1 : 0;
    zlib[out++] = size & 0xff;
    zlib[out++] = size >> 8;
    zlib[out++] = ~size & 0xff;
    zlib[out++] = (~size >> 8) & 0xff;
    zlib.set(raw.subarray(start, start + size), out);
    out += size;
  }
  new DataView(zlib.buffer).setUint32(out, ((adlerB << 16) | adlerA) >>> 0);

  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  header[8] = 8;
  header[9] = colorType;

  const pieces = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    ...extra,
    chunk('IDAT', zlib),
    chunk('IEND', new Uint8Array(0)),
  ];
  const file = new Uint8Array(pieces.reduce((sum, piece) => sum + piece.length, 0));
  let offset = 0;
  for (const piece of pieces) {
    file.set(piece, offset);
    offset += piece.length;
  }
  return file;
}

/** A PNG of an `Alpha` image in one color: a palette of 256 entries of that color whose transparency is the index. */
function alphaPng(image: GlyphImage, red: number, green: number, blue: number): string {
  const palette = new Uint8Array(768);
  const transparency = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    palette[i * 3] = red;
    palette[i * 3 + 1] = green;
    palette[i * 3 + 2] = blue;
    transparency[i] = i;
  }
  const png = encodePng(image.width, image.height, 3, image.width, image.pixels, [chunk('PLTE', palette), chunk('tRNS', transparency)]);
  return `data:image/png;base64,${toBase64(png)}`;
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
  return `data:image/png;base64,${toBase64(encodePng(image.width, image.height, 6, image.width * 4, rgba, []))}`;
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
