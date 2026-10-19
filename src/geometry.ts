
/** A point in two dimensions. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/** A size in two dimensions. */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** A rectangle, whose origin is its top-left corner when the y axis points downward. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * An affine transform, which maps `(x, y)` to `(a * x + c * y + tx, b * x + d * y + ty)`. The
 * members have the meaning that they have in `DOMMatrix` and in `CanvasRenderingContext2D`.
 */
export interface AffineTransform {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly tx: number;
  readonly ty: number;
}
