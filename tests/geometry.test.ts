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

test("an affine transform maps (x, y) to (a x + c y + tx, b x + d y + ty)", () => {
  const apply = (t: AffineTransform, p: Point): Point => ({
    x: t.a * p.x + t.c * p.y + t.tx,
    y: t.b * p.x + t.d * p.y + t.ty
  });
  const identity: AffineTransform = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
  assert.deepEqual(apply(identity, { x: 5, y: 6 }), { x: 5, y: 6 });
  assert.deepEqual(apply({ a: 2, b: 0, c: 0, d: 3, tx: 10, ty: 20 }, { x: 1, y: 1 }), { x: 12, y: 23 });
});
