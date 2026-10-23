import type { Rect } from "../geometry.js";
import type { TRRect } from "./NativeFunctions.js";

/** The `Rect` of a struct that the bindings return. */
export function toRect({ origin, size }: TRRect): Rect {
  return { x: origin.x, y: origin.y, width: size.width, height: size.height };
}

/** The struct that the bindings take, of a `Rect`. */
export function toNativeRect(rect: Rect): TRRect {
  if (typeof rect !== "object" || rect === null) {
    throw new TypeError("bounds must be a Rect.");
  }
  return { origin: { x: rect.x, y: rect.y }, size: { width: rect.width, height: rect.height } };
}
