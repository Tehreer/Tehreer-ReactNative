import type { NativeBindings } from '../../src/internal/NativeBindings';
import { FontFile } from '../../src/graphics/FontFile';
import { Path, PathVerb } from '../../src/graphics/Path';
import type { PathSink } from '../../src/graphics/PathSink';
import type { Typeface } from '../../src/graphics/Typeface';
import { fontBytes as robotoBytes } from './fontData';

// The suite of Path, PathSink and Typeface.getGlyphPath (issue #17), against the real outlines of
// Core in Hermes, on the glyph of "a" (ID 1) of Roboto-Regular.abc. Coordinates are floats that
// arrive as doubles, so values that went through Core's arithmetic are compared with a tolerance.

export interface TestResult {
  passed: number;
  failures: string[];
}

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function expectThrows(action: () => unknown, pattern: RegExp, expectedName?: string): void {
  try {
    action();
  } catch (e) {
    const error = e as Error;
    check(pattern.test(error.message), `expected ${pattern}, got "${error.message}"`);
    if (expectedName !== undefined) {
      check(error.name === expectedName, `expected ${expectedName}, got ${error.name}`);
    }
    return;
  }
  throw new Error(`expected ${pattern}, but nothing was thrown`);
}

function roboto(): Typeface {
  return FontFile.fromBytes(robotoBytes).typefaces.get(0);
}

function glyphA(face: Typeface, size = 2048): Path {
  const path = face.getGlyphPath(1, size);
  check(path !== undefined, 'the glyph has an outline');
  return path!;
}

// Absolute tolerance, in the unit of the type size. Core scales in 26.6 fixed point (1/64), so
// outlines of two sizes agree to a few hundredths, and float arithmetic to much less.
function near(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) <= tolerance;
}

function nearAll(a: readonly number[], b: readonly number[], tolerance = 0.01): boolean {
  return a.length === b.length && a.every((value, i) => near(value, b[i]!, tolerance));
}

// Reads the SVG path data that the library writes: absolute commands, numbers split by spaces.
function parseSvg(data: string): { verbs: number[]; coordinates: number[] } {
  const verbs: number[] = [];
  const coordinates: number[] = [];
  const counts: Record<string, number> = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };
  const codes: Record<string, number> = { M: PathVerb.MoveTo, L: PathVerb.LineTo, Q: PathVerb.QuadTo, C: PathVerb.CubicTo, Z: PathVerb.Close };
  const pattern = /([MLQCZ])([^MLQCZ]*)/g;
  let consumed = 0;

  for (let match = pattern.exec(data); match !== null; match = pattern.exec(data)) {
    check(match.index === consumed, `unexpected text at ${consumed}`);
    consumed = pattern.lastIndex;
    const text = match[2]!.trim();
    const values = text === '' ? [] : text.split(' ').map(Number);
    check(values.length === counts[match[1]!], `${match[1]} takes ${counts[match[1]!]} numbers: ${text}`);
    check(values.every((value) => Number.isFinite(value)), `finite numbers: ${text}`);
    verbs.push(codes[match[1]!]!);
    coordinates.push(...values);
  }
  check(consumed === data.length, 'all of the text was read');
  return { verbs, coordinates };
}

const tests: [string, (b: NativeBindings) => void][] = [
  ['the outline of a glyph has closed contours, and the y axis points downward', () => {
    const face = roboto();
    const path = glyphA(face);
    check(!path.isEmpty && path.verbs.length > 4, `${path.verbs.length} verbs`);
    check(path.verbs[0] === PathVerb.MoveTo && path.verbs[path.verbs.length - 1] === PathVerb.Close, 'starts with a move and ends with a close');

    const counts = [2, 2, 4, 6, 0];
    const expected = path.verbs.reduce<number>((sum, verb) => sum + counts[verb]!, 0);
    check(path.coordinates.length === expected, `${path.coordinates.length} coordinates for ${expected}`);

    let open = false;
    for (const verb of path.verbs) {
      if (verb === PathVerb.MoveTo) {
        check(!open, 'a contour starts after the previous one was closed');
        open = true;
      } else if (verb === PathVerb.Close) {
        check(open, 'a close ends a contour');
        open = false;
      } else {
        check(open, 'segments are inside a contour');
      }
    }
    check(!open, 'the last contour is closed');

    const ys = path.coordinates.filter((_, i) => i % 2 === 1);
    check(Math.min(...ys) < 0 && Math.max(...ys) <= 25, `a glyph above the baseline has negative y: ${Math.min(...ys)}..${Math.max(...ys)}`);
    face.dispose();
  }],

  ['the outline round-trips through SVG path data', () => {
    const face = roboto();
    const path = glyphA(face);
    const data = path.toSvgPathData();
    check(data.startsWith('M') && data.endsWith('Z'), data.slice(0, 40));

    const parsed = parseSvg(data);
    check(parsed.verbs.length === path.verbs.length && parsed.verbs.every((verb, i) => verb === path.verbs[i]), 'same verbs');
    check(parsed.coordinates.length === path.coordinates.length && parsed.coordinates.every((value, i) => value === path.coordinates[i]), 'same coordinates, exactly');

    const rebuilt = new Path();
    const pieces = data.match(/[MLQCZ][^MLQCZ]*/g)!;
    check(pieces.length === path.verbs.length, 'one command per verb');
    for (const piece of pieces) {
      const n = piece.slice(1).trim() === '' ? [] : piece.slice(1).trim().split(' ').map(Number);
      if (piece[0] === 'M') rebuilt.moveTo(n[0]!, n[1]!);
      else if (piece[0] === 'L') rebuilt.lineTo(n[0]!, n[1]!);
      else if (piece[0] === 'Q') rebuilt.quadTo(n[0]!, n[1]!, n[2]!, n[3]!);
      else if (piece[0] === 'C') rebuilt.cubicTo(n[0]!, n[1]!, n[2]!, n[3]!, n[4]!, n[5]!);
      else rebuilt.close();
    }
    check(rebuilt.toSvgPathData() === data, 'the text of the rebuilt path is the same');
    face.dispose();
  }],

  ['a path outlives the typeface it came from, and a disposed typeface makes none', () => {
    const face = roboto();
    const path = glyphA(face);
    const data = path.toSvgPathData();
    face.dispose();
    check(path.toSvgPathData() === data, 'the path is a copy');
    expectThrows(() => face.getGlyphPath(1, 100), /already disposed/);
  }],

  ['the type size scales the outline, and Core applies a transform like the path does', () => {
    const face = roboto();
    const full = glyphA(face, 2048);
    const half = glyphA(face, 1024);
    check(nearAll(half.coordinates, full.coordinates.map((value) => value / 2), 0.05), 'half the size, half the coordinates');
    check(half.verbs.length === full.verbs.length, 'same shape');

    const transform = { a: 0.5, b: 0.1, c: -0.25, d: 2, tx: 10, ty: -20 };
    const byCore = face.getGlyphPath(1, 2048, transform)!;
    const byPath = full.transformed(transform);
    check(nearAll(byCore.coordinates, byPath.coordinates), 'Core and Path agree on the arithmetic');
    check(byCore.verbs.every((verb, i) => verb === full.verbs[i]), 'a transform changes no verb');

    const moved = face.getGlyphPath(1, 2048, { a: 1, b: 0, c: 0, d: 1, tx: 10, ty: 20 })!;
    check(moved.coordinates.every((value, i) => near(value, full.coordinates[i]! + (i % 2 === 0 ? 10 : 20))), 'translation');
    face.dispose();
  }],

  ['a path is enumerated into a sink in order, with a transform', () => {
    const face = roboto();
    const path = glyphA(face);
    const events: number[] = [];
    const points: number[] = [];
    const sink: PathSink = {
      moveTo: (x, y) => { events.push(PathVerb.MoveTo); points.push(x, y); },
      lineTo: (x, y) => { events.push(PathVerb.LineTo); points.push(x, y); },
      quadTo: (a, b, x, y) => { events.push(PathVerb.QuadTo); points.push(a, b, x, y); },
      cubicTo: (a, b, c, d, x, y) => { events.push(PathVerb.CubicTo); points.push(a, b, c, d, x, y); },
      close: () => { events.push(PathVerb.Close); },
    };
    path.enumerate(sink);
    check(events.length === path.verbs.length && events.every((verb, i) => verb === path.verbs[i]), 'the verbs in order');
    check(points.length === path.coordinates.length && points.every((value, i) => value === path.coordinates[i]), 'the points in order');

    const copy = new Path();
    path.enumerate(copy, { a: 1, b: 0, c: 0, d: 1, tx: 5, ty: 5 });
    check(copy.coordinates[0] === path.coordinates[0]! + 5 && copy.coordinates[1] === path.coordinates[1]! + 5, 'moved');
    const joined = new Path();
    joined.append(path);
    joined.append(path);
    check(joined.verbs.length === 2 * path.verbs.length, 'append');
    face.dispose();
  }],

  ['an error thrown by a sink ends the enumeration and reaches the caller', () => {
    const face = roboto();
    const path = glyphA(face);
    const failure = new Error('sink failed');
    let calls = 0;
    const sink: PathSink = {
      moveTo: () => { calls++; },
      lineTo: () => { calls++; throw failure; },
      quadTo: () => { calls++; throw failure; },
      cubicTo: () => { calls++; throw failure; },
      close: () => { calls++; },
    };
    try {
      path.enumerate(sink);
      throw new Error('nothing was thrown');
    } catch (e) {
      check(e === failure, `the very error: ${String(e)}`);
    }
    check(calls >= 2 && calls < path.verbs.length, `it stopped at the first failure: ${calls} calls`);
    check(!path.isEmpty && path.toSvgPathData().length > 0, 'the path is intact');
    face.dispose();
  }],

  ['the native outline is released after it is copied, on every path', (b) => {
    const face = roboto();

    const handle = b.TRTypefaceCreateGlyphPath(face.nativeHandle, 1, 2048)!;
    check(handle !== undefined && !b.isHandleDisposed(handle), 'a path that the caller owns');
    const path = Path.takeNative(handle);
    check(b.isHandleDisposed(handle), 'released once it is copied');
    check(path.verbs.length > 4, 'and copied');
    expectThrows(() => b.TRPathEnumerate(handle, undefined), /already disposed/);

    const invalid = b.TRTypefaceCreateGlyphPath(face.nativeHandle, 1, 2048)!;
    expectThrows(() => Path.takeNative(invalid, { a: Number.NaN, b: 0, c: 0, d: 1, tx: 0, ty: 0 }), /finite/, 'RangeError');
    check(b.isHandleDisposed(invalid), 'released after an invalid transform');

    const overflow = b.TRTypefaceCreateGlyphPath(face.nativeHandle, 1, 2048)!;
    expectThrows(() => Path.takeNative(overflow, { a: 1e300, b: 0, c: 0, d: 1, tx: 0, ty: 0 }), /out of range/, 'RangeError');
    check(b.isHandleDisposed(overflow), 'released after the binding refused the transform');

    const wrong = b.TRTypefaceCreateGlyphPath(face.nativeHandle, 1, 2048)!;
    expectThrows(() => Path.takeNative(wrong, 5 as unknown as { a: number; b: number; c: number; d: number; tx: number; ty: number }), /finite/, 'RangeError');
    check(b.isHandleDisposed(wrong), 'released after a transform that is no object');
    face.dispose();
  }],

  ['the native elements are what the wrapper copies', (b) => {
    const face = roboto();
    const handle = b.TRTypefaceCreateGlyphPath(face.nativeHandle, 1, 2048)!;
    const elements = b.TRPathEnumerate(handle, undefined)!;
    check(Array.isArray(elements) && elements.length > 4 && elements[0]!.type === 'moveTo', 'moveTo first');
    check(elements[elements.length - 1]!.type === 'close', 'close last');
    const copied = Path.takeNative(handle);
    check(copied.verbs.length === elements.length, 'one verb per element');
    face.dispose();
  }],

  ['a type size that is not positive, and a glyph that does not exist, give no path', () => {
    const face = roboto();
    check(face.getGlyphPath(1, 0) === undefined, 'size 0');
    check(face.getGlyphPath(1, -10) === undefined, 'negative size');
    check(face.getGlyphPath(500, 100) === undefined, 'no such glyph');
    face.dispose();
  }],

  ['invalid glyphs, sizes and transforms are refused', () => {
    const face = roboto();
    expectThrows(() => face.getGlyphPath(-1, 100), /out of range/, 'RangeError');
    expectThrows(() => face.getGlyphPath(70000, 100), /out of range/, 'RangeError');
    expectThrows(() => face.getGlyphPath(1.5, 100), /must be an integer/, 'RangeError');
    expectThrows(() => face.getGlyphPath('a' as unknown as number, 100), /must be a number/);
    expectThrows(() => face.getGlyphPath(1, Number.NaN), /NaN/, 'RangeError');
    expectThrows(() => face.getGlyphPath(1, '100' as unknown as number), /must be a number/);
    expectThrows(() => face.getGlyphPath(1, 100, { a: 1, b: 0, c: 0, d: 1, tx: Number.POSITIVE_INFINITY, ty: 0 }), /finite/, 'RangeError');
    expectThrows(() => face.getGlyphPath(1, 100, { a: 1 } as unknown as { a: number; b: number; c: number; d: number; tx: number; ty: number }), /finite/, 'RangeError');
    expectThrows(() => glyphA(face).toSvgPathData({ a: Number.NaN, b: 0, c: 0, d: 1, tx: 0, ty: 0 }), /finite/, 'RangeError');
    face.dispose();
  }],
];

export function runPathTests(bindings: NativeBindings): TestResult {
  const result: TestResult = { passed: 0, failures: [] };
  for (const [name, body] of tests) {
    try {
      body(bindings);
      result.passed++;
    } catch (e) {
      result.failures.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return result;
}

export const pathTestCount = tests.length;
