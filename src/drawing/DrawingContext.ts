import type { Color } from "../Color.js";
import type { Rect } from "../geometry.js";
import type { GlyphImage } from "../graphics/GlyphImage.js";

/**
 * A surface that `GlyphRun.draw`, `ComposedLine.draw` and `ComposedFrame.draw` draw into. Core does
 * the math and calls these members in the order of the text: for each run its background, its
 * glyphs (or its replacement) and its underline and strikethrough.
 *
 * Every position and distance is in pixels with the y axis pointing downward. Core has multiplied
 * them by the render scale of the renderer already, and whatever transform the surface has applies
 * after that, so use a render scale of 1 with a surface that is scaled for the pixel ratio, or the
 * pixel ratio with one that is not.
 *
 * **This is the slow path.** Each call crosses from native code into JavaScript, for every glyph,
 * so it suits custom surfaces, tests and small amounts of text. `TLabel` and `TTextView` do not
 * use it: they draw with native painters (`Canvas` on Android, `CGContext` on iOS) that implement
 * these same callbacks without leaving native code.
 *
 * The members are read once when a draw starts, and called as methods of the context. An error that
 * one throws stops the drawing (no member is called again) and is thrown from the `draw` call after
 * Core has returned.
 *
 * The renderer must not be modified from a member.
 */
export interface DrawingContext {
  /**
   * Draws the image of a glyph.
   *
   * @param image The image of the glyph. It is lent for the call: the library disposes it when this
   *   returns, so read what is needed (`pixels`, `width`, ...) now and do not keep the wrapper, which
   *   throws "already disposed" afterwards. The same image is given again for the same glyph, so
   *   cache what is made from it by the pixels and not by the wrapper.
   * @param x The position of the left edge of the image, in whole pixels.
   * @param y The position of the top edge of the image, in whole pixels.
   * @param scaleX How much to scale the image horizontally to match the size that was asked for.
   * @param scaleY How much to scale the image vertically.
   * @param color The foreground color for a glyph that is filled, and the stroke color for one that
   *   is stroked. An alpha image is tinted with it, an ARGB image keeps its own colors.
   * @param clip The rectangle that drawing has to be limited to, or `undefined`. It is given for the
   *   glyphs of a cluster that a line splits.
   */
  drawGlyphImage(image: GlyphImage, x: number, y: number, scaleX: number, scaleY: number, color: Color, clip: Rect | undefined): void;

  /** Fills a rectangle with a color, for backgrounds, underlines and strikethroughs. Its edges are whole pixels. */
  fillRect(rect: Rect, color: Color): void;

  /**
   * Begins a shadow scope: every glyph given to `drawGlyphImage` until `endShadow` is to be drawn
   * with a shadow. It is opened once for each run that has glyphs, only when the shadow radius of
   * the renderer is above zero; the fill and the stroke of a run share one scope. Backgrounds and
   * decorations are outside of it. A replacement gets no scope.
   *
   * Core calls it only if the context has `endShadow` too; with only one of the two, neither is
   * called and no shadow is drawn.
   *
   * @param radius The blur radius, in pixels.
   * @param dx The horizontal offset, in pixels.
   * @param dy The vertical offset, in pixels, positive downward.
   * @param color The color of the shadow.
   */
  beginShadow?(radius: number, dx: number, dy: number, color: Color): void;

  /** Ends the scope that `beginShadow` began. */
  endShadow?(): void;
}
