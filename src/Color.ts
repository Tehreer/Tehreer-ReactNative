
/**
 * A color as the unsigned integer `0xAARRGGBB`, which is the layout of `TRColor` in Tehreer Core.
 * The channels are not premultiplied.
 */
export type Color = number;

/** Functions to make colors and to take them apart. */
export const Color = {
  /** Makes a color from channels in the range from 0 to 255. */
  argb(alpha: number, red: number, green: number, blue: number): Color {
    return (((alpha & 0xff) << 24) | ((red & 0xff) << 16) | ((green & 0xff) << 8) | (blue & 0xff)) >>> 0;
  },

  /** Makes an opaque color from channels in the range from 0 to 255. */
  rgb(red: number, green: number, blue: number): Color {
    return Color.argb(255, red, green, blue);
  },

  /** The alpha channel of a color, from 0 to 255. */
  alpha(color: Color): number {
    return (color >>> 24) & 0xff;
  },

  /** The red channel of a color, from 0 to 255. */
  red(color: Color): number {
    return (color >>> 16) & 0xff;
  },

  /** The green channel of a color, from 0 to 255. */
  green(color: Color): number {
    return (color >>> 8) & 0xff;
  },

  /** The blue channel of a color, from 0 to 255. */
  blue(color: Color): number {
    return color & 0xff;
  },

  /**
   * Parses `#rgb`, `#rrggbb` and `#aarrggbb`.
   *
   * @throws {SyntaxError} If the text is not one of these.
   */
  parse(text: string): Color {
    let digits = text.trim().replace(/^#/, "");
    if (digits.length === 3) {
      digits = digits.replace(/./g, (digit) => digit + digit);
    }
    if (!/^[0-9a-fA-F]+$/.test(digits) || (digits.length !== 6 && digits.length !== 8)) {
      throw new SyntaxError(`Unsupported color: ${text}`);
    }
    const value = parseInt(digits, 16);
    return digits.length === 6 ? (0xff000000 | value) >>> 0 : value >>> 0;
  },

  /** Formats a color as a CSS `rgb()` or `rgba()` function, which a canvas understands. */
  toCss(color: Color): string {
    const alpha = Color.alpha(color);
    const channels = `${Color.red(color)}, ${Color.green(color)}, ${Color.blue(color)}`;
    return alpha === 255 ? `rgb(${channels})` : `rgba(${channels}, ${alpha / 255})`;
  },
} as const;
