
/** A point in two dimensions. */
export interface Point {
  /** The horizontal coordinate. */
  readonly x: number;
  /** The vertical coordinate. */
  readonly y: number;
}

/** A size in two dimensions. */
export interface Size {
  /** The extent along the x axis. */
  readonly width: number;
  /** The extent along the y axis. */
  readonly height: number;
}

/** A rectangle, whose origin is its top-left corner when the y axis points downward. */
export interface Rect {
  /** The horizontal coordinate of the origin. */
  readonly x: number;
  /** The vertical coordinate of the origin. */
  readonly y: number;
  /** The extent along the x axis. */
  readonly width: number;
  /** The extent along the y axis. */
  readonly height: number;
}

/**
 * An affine transform, which maps `(x, y)` to `(a * x + c * y + tx, b * x + d * y + ty)`. The
 * members have the meaning that they have in `DOMMatrix` and in `CanvasRenderingContext2D`.
 */
export interface AffineTransform {
  /** The horizontal scale. */
  readonly a: number;
  /** The vertical shear. */
  readonly b: number;
  /** The horizontal shear. */
  readonly c: number;
  /** The vertical scale. */
  readonly d: number;
  /** The horizontal translation. */
  readonly tx: number;
  /** The vertical translation. */
  readonly ty: number;
}
