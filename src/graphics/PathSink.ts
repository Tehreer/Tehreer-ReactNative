/**
 * Receives the elements of an outline in the order that they are made. A contour starts with
 * `moveTo` and ends with `close`.
 *
 * An error that a method throws ends the enumeration and reaches the caller of `enumerate()`.
 */
export interface PathSink {
  /** Starts a new contour at a point. */
  moveTo(x: number, y: number): void;
  /** Adds a straight line from the current point. */
  lineTo(x: number, y: number): void;
  /** Adds a quadratic curve from the current point. */
  quadTo(controlX: number, controlY: number, x: number, y: number): void;
  /** Adds a cubic curve from the current point. */
  cubicTo(control1X: number, control1Y: number, control2X: number, control2Y: number, x: number, y: number): void;
  /** Closes the current contour. */
  close(): void;
}
