import type { AffineTransform } from "../geometry.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import type { PathSink } from "./PathSink.js";

/** The kinds of the segments of a path. */
export const PathVerb = {
  /** Starts a contour at a point (2 coordinates). */
  MoveTo: 0,
  /** Draws a line to a point (2 coordinates). */
  LineTo: 1,
  /** Draws a quadratic curve through a control point to a point (4 coordinates). */
  QuadTo: 2,
  /** Draws a cubic curve through two control points to a point (6 coordinates). */
  CubicTo: 3,
  /** Closes the contour (no coordinates). */
  Close: 4,
} as const;

export type PathVerb = (typeof PathVerb)[keyof typeof PathVerb];

// The number of coordinates of each verb, indexed by the verb.
const COORDINATE_COUNTS = [2, 2, 4, 6, 0] as const;

/** @internal */
export function checkTransform(transform: AffineTransform): void {
  for (const name of ["a", "b", "c", "d", "tx", "ty"] as const) {
    if (!Number.isFinite(transform[name])) {
      throw new RangeError(`transform.${name} (${String(transform[name])}) must be a finite number.`);
    }
  }
}

/**
 * An outline, which is a list of contours made of lines and curves, such as the shape of a glyph.
 *
 * A path has no native counterpart: Core gives outlines to callbacks, and this class is a sink
 * that keeps them as verbs and coordinates. The outline of Core is released once it is copied, so
 * a path owns no reference and needs no disposing. The y axis points downward, with the origin at
 * the pen position of the glyph on its baseline.
 */
export class Path implements PathSink {
  readonly #verbs: PathVerb[] = [];
  readonly #coordinates: number[] = [];

  /** The segments of the path, in order. */
  get verbs(): readonly PathVerb[] {
    return this.#verbs;
  }

  /** The coordinates of all segments, one after another: `x, y` pairs in the order of the verbs. */
  get coordinates(): readonly number[] {
    return this.#coordinates;
  }

  get isEmpty(): boolean {
    return this.#verbs.length === 0;
  }

  moveTo(x: number, y: number): void {
    this.#verbs.push(PathVerb.MoveTo);
    this.#coordinates.push(x, y);
  }

  lineTo(x: number, y: number): void {
    this.#verbs.push(PathVerb.LineTo);
    this.#coordinates.push(x, y);
  }

  quadTo(controlX: number, controlY: number, x: number, y: number): void {
    this.#verbs.push(PathVerb.QuadTo);
    this.#coordinates.push(controlX, controlY, x, y);
  }

  cubicTo(control1X: number, control1Y: number, control2X: number, control2Y: number, x: number, y: number): void {
    this.#verbs.push(PathVerb.CubicTo);
    this.#coordinates.push(control1X, control1Y, control2X, control2Y, x, y);
  }

  close(): void {
    this.#verbs.push(PathVerb.Close);
  }

  /**
   * Passes the segments to a sink, in order, after moving their points by the transform if there
   * is one.
   *
   * @throws RangeError if the transform has a member that is not a finite number.
   * @throws Whatever the sink throws, which ends the enumeration.
   */
  enumerate(sink: PathSink, transform?: AffineTransform): void {
    // The path lives in TypeScript, as in Tehreer-Web, and Core has no path object to transform, so
    // the affine math is applied here while the segments are passed on.
    if (transform !== undefined) {
      checkTransform(transform);
    }

    const coordinates = this.#coordinates;
    const x = (offset: number): number => {
      const value = coordinates[offset] as number;
      return transform === undefined ? value : transform.a * value + transform.c * (coordinates[offset + 1] as number) + transform.tx;
    };
    const y = (offset: number): number => {
      const value = coordinates[offset + 1] as number;
      return transform === undefined ? value : transform.b * (coordinates[offset] as number) + transform.d * value + transform.ty;
    };

    // A sink that adds to this path meanwhile does not extend the enumeration.
    const verbs = this.#verbs;
    const count = verbs.length;
    let offset = 0;
    for (let index = 0; index < count; index++) {
      const verb = verbs[index] as PathVerb;
      switch (verb) {
        case PathVerb.MoveTo:
          sink.moveTo(x(offset), y(offset));
          break;
        case PathVerb.LineTo:
          sink.lineTo(x(offset), y(offset));
          break;
        case PathVerb.QuadTo:
          sink.quadTo(x(offset), y(offset), x(offset + 2), y(offset + 2));
          break;
        case PathVerb.CubicTo:
          sink.cubicTo(x(offset), y(offset), x(offset + 2), y(offset + 2), x(offset + 4), y(offset + 4));
          break;
        case PathVerb.Close:
          sink.close();
          break;
      }
      offset += COORDINATE_COUNTS[verb];
    }
  }

  /** Makes a copy of the path with its points moved by the transform. */
  transformed(transform: AffineTransform): Path {
    const path = new Path();
    this.enumerate(path, transform);
    return path;
  }

  /** Adds the segments of another path to the end of this one. */
  append(path: Path): void {
    // Through a copy, so that appending a path to itself adds each segment once.
    let source = path;
    if (path === this) {
      source = new Path();
      this.enumerate(source);
    }
    source.enumerate(this);
  }

  /**
   * Formats the path as the data of the `d` attribute of an SVG `<path>`, with absolute commands
   * (`M`, `L`, `Q`, `C`, `Z`) and numbers as JavaScript prints them.
   *
   * @throws RangeError if the transform has a member that is not a finite number.
   */
  toSvgPathData(transform?: AffineTransform): string {
    const parts: string[] = [];
    this.enumerate(
      {
        moveTo: (x, y) => parts.push(`M${x} ${y}`),
        lineTo: (x, y) => parts.push(`L${x} ${y}`),
        quadTo: (controlX, controlY, x, y) => parts.push(`Q${controlX} ${controlY} ${x} ${y}`),
        cubicTo: (control1X, control1Y, control2X, control2Y, x, y) =>
          parts.push(`C${control1X} ${control1Y} ${control2X} ${control2Y} ${x} ${y}`),
        close: () => parts.push("Z"),
      },
      transform,
    );
    return parts.join("");
  }

  /**
   * Copies an outline of Core to a path, passing the transform to Core, and releases the outline
   * on every path, including a failure to copy it.
   *
   * @param handle A handle that owns its reference, such as the result of `TRTypefaceCreateGlyphPath`.
   *   It is disposed here and unusable afterwards.
   * @internal
   */
  static takeNative(handle: Handle<"TRPath">, transform?: AffineTransform): Path {
    const bindings = getNativeBindings();
    try {
      if (transform !== undefined) {
        checkTransform(transform);
      }
      const elements = bindings.TRPathEnumerate(handle, transform);
      if (elements === undefined) {
        // Nothing stops the enumeration, so this is a bug in the binding or in Core.
        throw new Error("Core stopped the enumeration of a path.");
      }

      const path = new Path();
      for (const element of elements) {
        switch (element.type) {
          case "moveTo":
            path.moveTo(element.x, element.y);
            break;
          case "lineTo":
            path.lineTo(element.x, element.y);
            break;
          case "quadTo":
            path.quadTo(element.controlX, element.controlY, element.x, element.y);
            break;
          case "cubicTo":
            path.cubicTo(element.control1X, element.control1Y, element.control2X, element.control2Y, element.x, element.y);
            break;
          case "close":
            path.close();
            break;
        }
      }
      return path;
    } finally {
      bindings.disposeHandle(handle);
    }
  }
}
