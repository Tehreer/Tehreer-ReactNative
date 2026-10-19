import assert from "node:assert/strict";
import { test } from "node:test";
import type { AffineTransform, Point, Rect, Size } from "../src/index.js";

// The geometry types are plain data, as in Tehreer-Web. The test pins their members and the meaning
// of the transform members, which the native layer relies on when it passes these through.
test("geometry values are plain objects with the Web members", () => {
  const point: Point = { x: 1, y: 2 };
  const size: Size = { width: 3, height: 4 };
  const rect: Rect = { x: 1, y: 2, width: 3, height: 4 };
  assert.deepEqual(Object.keys(point), ["x", "y"]);
  assert.deepEqual(Object.keys(size), ["width", "height"]);
  assert.deepEqual(Object.keys(rect), ["x", "y", "width", "height"]);
});

// A type-level check: the transform must have exactly the six members of the Web type, so a rename
// or a missing member fails the typecheck. Core's TRAffineTransform is passed through unchanged.
test("an affine transform has the members a, b, c, d, tx and ty", () => {
  const transform = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 } satisfies AffineTransform;
  const members: Record<keyof AffineTransform, true> = { a: true, b: true, c: true, d: true, tx: true, ty: true };
  assert.deepEqual(Object.keys(transform).sort(), Object.keys(members).sort());
});
