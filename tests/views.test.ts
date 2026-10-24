import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, before, test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";

// The queries that TLabel and TTextView make of the frame their native view paints, over a duck
// typed frame. What is checked is what the TypeScript layer decides: which line a position falls on,
// the edges where "no character" begins, the clamp of the end boundary, the caret of a boundary
// inside a right-to-left line, and that every line wrapper that is read is disposed. The numbers
// themselves are Core's and are checked on a device (example/tests/ViewTests.tsx).

interface FakeLine {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly origin: { x: number; y: number };
  readonly width: number;
  readonly ascent: number;
  readonly height: number;
  isRtl?: boolean;
  disposed: number;
}

function makeFrame(lines: FakeLine[]) {
  const frame = {
    startIndex: lines[0]?.startIndex ?? 0,
    endIndex: lines[lines.length - 1]?.endIndex ?? 0,
    height: lines.length * 20,
    lines: {
      length: lines.length,
      get(index: number) {
        const line = lines[index];
        assert.ok(line, `no line ${index}`);
        return {
          startIndex: line.startIndex,
          endIndex: line.endIndex,
          origin: line.origin,
          width: line.width,
          ascent: line.ascent,
          height: line.height,
          // Ten units per code unit; a right-to-left line has its first code unit at the right end.
          getCodeUnitIndexAtDistance: (distance: number) => {
            const count = line.endIndex - line.startIndex;
            const slot = Math.min(count, Math.max(0, Math.round(distance / 10)));
            return line.isRtl ? line.endIndex - slot : line.startIndex + slot;
          },
          getVisualEdges: (from: number, to: number) => {
            const slotOf = (index: number) => (line.isRtl ? line.endIndex - 1 - index : index - line.startIndex);
            return [{ left: slotOf(from) * 10, right: slotOf(from) * 10 + (to - from) * 10 }];
          },
          getCodeUnitDistance: (index: number) => {
            return line.isRtl ? (line.endIndex - index) * 10 : (index - line.startIndex) * 10;
          },
          dispose: () => { line.disposed += 1; },
        };
      },
    },
    getLineIndexAtPosition: (_x: number, y: number) => Math.min(lines.length - 1, Math.max(0, Math.floor(y / 20))),
    getLineIndexForCodeUnit: (index: number) => lines.findIndex((line) => index >= line.startIndex && index < line.endIndex || (index === frame.endIndex && line === lines[lines.length - 1])),
  };
  return frame;
}

const line = (startIndex: number, endIndex: number, top: number, extra: Partial<FakeLine> = {}): FakeLine => ({
  startIndex, endIndex, origin: { x: 0, y: top + 15 }, width: (endIndex - startIndex) * 10, ascent: 15, height: 20, disposed: 0, ...extra,
});

let out = "";
let queries: typeof import("../src/views/FrameQueries.ts");
before(async () => {
  out = compileModules(["src/views/FrameQueries.ts"]);
  queries = (await importModule(out, "views/FrameQueries.js")) as typeof queries;
});
after(() => rmSync(out, { recursive: true, force: true }));

test("a position finds the code unit of its line, and no character outside the text", () => {
  const lines = [line(0, 5, 0), line(5, 9, 20)];
  const frame = makeFrame(lines) as never;
  assert.equal(queries.indexOfCodeUnit(frame, 12, 5), 1);
  assert.equal(queries.indexOfCodeUnit(frame, 12, 25), 6);
  // The boundary after the last code unit of a line is not a character: it clamps to the last one.
  assert.equal(queries.indexOfCodeUnit(frame, 50, 5), 4);
  assert.equal(queries.indexOfCodeUnit(frame, 40, 25), 8);
  assert.equal(queries.indexOfCodeUnit(frame, 45, 25), undefined, "beyond the width of the shorter line");
  assert.equal(queries.indexOfCodeUnit(frame, -1, 5), undefined);
  assert.equal(queries.indexOfCodeUnit(frame, 5, -1), undefined, "above the frame");
  assert.equal(queries.indexOfCodeUnit(frame, 5, 41), undefined, "below the frame");
  // Both lines that were read (the hits, and the miss on the shorter line) were given back.
  assert.deepEqual(lines.map((l) => l.disposed), [3, 3]);
});

test("a frame without lines has no character and no caret", () => {
  const frame = makeFrame([]) as never;
  assert.equal(queries.indexOfCodeUnit(frame, 0, 0), undefined);
  assert.equal(queries.getCodeUnitAtOffset(frame, 0), undefined);
});

test("every line wrapper that a query reads is disposed, also when the position misses", () => {
  const lines = [line(0, 5, 0)];
  const frame = makeFrame(lines) as never;
  queries.indexOfCodeUnit(frame, 3, 3);
  queries.indexOfCodeUnit(frame, 500, 3);
  queries.getCaretPosition(frame, 2);
  queries.getCodeUnitAtOffset(frame, 0);
  assert.equal(lines[0]?.disposed, 4);
});

test("the caret of a boundary follows the screen, in a right-to-left line too", () => {
  const ltr = line(0, 4, 0);
  const rtl = line(4, 8, 20, { isRtl: true });
  const frame = makeFrame([ltr, rtl]) as never;
  assert.deepEqual(queries.getCaretPosition(frame, 1), { x: 10, y: 0, height: 20, lineIndex: 0 });
  // The first code unit of a right-to-left line starts at its right end, so its boundary is there.
  assert.deepEqual(queries.getCaretPosition(frame, 4), { x: 40, y: 20, height: 20, lineIndex: 1 });
  assert.deepEqual(queries.getCaretPosition(frame, 7), { x: 10, y: 20, height: 20, lineIndex: 1 });
});

test("a caret outside the frame is undefined, not an error", () => {
  const frame = makeFrame([line(0, 4, 0)]) as never;
  assert.equal(queries.getCaretPosition(frame, -1), undefined);
  assert.equal(queries.getCaretPosition(frame, 5), undefined);
  assert.equal(queries.getCaretPosition(frame, 1.5), undefined);
  assert.equal(queries.getLineTop(frame, 99), undefined);
});

test("the first visible code unit is the start of the line at the offset, and a scroll goes to a line top", () => {
  const frame = makeFrame([line(0, 5, 0), line(5, 9, 20)]) as never;
  assert.equal(queries.getCodeUnitAtOffset(frame, 0), 0);
  assert.equal(queries.getCodeUnitAtOffset(frame, 25), 5);
  assert.equal(queries.getLineTop(frame, 6), 20);
});

test("a point inside a character finds that character, not the nearest boundary, in both directions", () => {
  const frame = makeFrame([line(0, 4, 0), line(4, 8, 20, { isRtl: true })]) as never;
  // Inside the character the boundary rounds to either end; the visual edges decide.
  assert.equal(queries.indexOfCodeUnit(frame, 14, 5), 1);
  assert.equal(queries.indexOfCodeUnit(frame, 16, 5), 1);
  // The first code unit of a right-to-left line is at its right end.
  assert.equal(queries.indexOfCodeUnit(frame, 36, 25), 4);
  assert.equal(queries.indexOfCodeUnit(frame, 34, 25), 4);
  assert.equal(queries.indexOfCodeUnit(frame, 4, 25), 7);
  assert.equal(queries.indexOfCodeUnit(frame, 6, 25), 7);
});

test("a NaN position is a RangeError, an infinite one is outside the text", () => {
  const frame = makeFrame([line(0, 4, 0)]) as never;
  assert.throws(() => queries.indexOfCodeUnit(frame, Number.NaN, 5), RangeError);
  assert.throws(() => queries.indexOfCodeUnit(frame, 5, Number.NaN), RangeError);
  assert.equal(queries.indexOfCodeUnit(frame, Number.POSITIVE_INFINITY, 5), undefined);
  assert.equal(queries.indexOfCodeUnit(frame, 5, Number.NEGATIVE_INFINITY), undefined);
});

test("scroll requests that would reach a native view as NaN or infinity are refused", () => {
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.throws(() => queries.checkScrollOffset(bad), RangeError);
  }
  assert.equal(queries.checkScrollOffset(-5), -5, "a negative offset is clamped later, not refused");
  for (const bad of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
    assert.throws(() => queries.checkScrollCodeUnit(bad), RangeError);
  }
  assert.equal(queries.checkScrollCodeUnit(0), 0);
});
