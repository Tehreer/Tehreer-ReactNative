import type { Handle, TRRect } from "./NativeFunctions.js";

/**
 * What the native draw callbacks of the JavaScript drawing surface call, made by `Drawing.ts` around
 * a `DrawingContext`. Handles arrive owned (the native side retained them), and the adapter disposes
 * them when the call is over.
 */
export interface DrawAdapter {
  drawGlyphImage(image: Handle<"TRGlyphImage">, x: number, y: number, scaleX: number, scaleY: number, color: number, clip: TRRect | undefined): void;
  fillRect(rect: TRRect, color: number): void;
  drawReplacement(run: Handle<"TRGlyphRun">, x: number, y: number): void;
  beginShadow?(radius: number, dx: number, dy: number, color: number): void;
  endShadow?(): void;
}

/** What `installDrawContext` returns: the draw callbacks a renderer had before. Opaque. */
export interface DrawScope {
  readonly __drawScope: never;
}
