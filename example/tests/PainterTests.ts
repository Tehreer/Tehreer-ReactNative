import type { NativeBindings } from '../../src/internal/NativeBindings';
import { adopt } from '../../src/internal/Adopt';
import type { DrawingContext } from '../../src/drawing/DrawingContext';
import type { ReplacementBounds } from '../../src/drawing/ReplacementDelegate';
import { GlyphImageFormat } from '../../src/graphics/enums';
import { GlyphCache } from '../../src/graphics/GlyphCache';
import type { GlyphImage } from '../../src/graphics/GlyphImage';
import type { Rect } from '../../src/geometry';
import { Replacement } from '../../src/layout/Replacement';
import { buildScene, findClippedScene, loadFaces, scenes } from './paintFixtures';
import type { BuiltScene, Faces, Scene } from './paintFixtures';

// The suite of issues #24 and #25: the native painters (an Android Canvas, a UIKit CGContext) draw
// frames of Core onto an offscreen canvas of the platform (the debug hook `testPaintFrame`), and the
// pixels are compared with what the draw callbacks say. The reference is made here: the same frame
// is drawn into a recording `DrawingContext` (the JavaScript surface of #22) and the images and
// rectangles it receives are composited onto white in plain TypeScript, so a wrong tint, byte
// order, premultiplication, origin, clip or flip shows as a pixel difference on either platform.

export interface TestResult {
  passed: number;
  failures: string[];
}

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const WHITE = 0xffffffff;

interface Paint {
  width: number;
  height: number;
  data: Uint8Array;
}

function paint(b: NativeBindings, built: BuiltScene, scene: Scene, background = WHITE, replacement?: (context: Record<string, unknown>, run: never, x: number, y: number) => void): Paint {
  const result = b.testPaintFrame!(built.frame.nativeHandle, built.renderer.nativeHandle, {
    width: scene.width, height: scene.height, background, replacement,
  });
  return { width: result.width, height: result.height, data: new Uint8Array(result.pixels) };
}

/** What the replacement of a run does in the views' JavaScript adapter, with the context of the painter. */
function replacementDrawer(b: NativeBindings, renderScale: number) {
  return (context: Record<string, unknown>, run: never, x: number, y: number): void => {
    try {
      const handle = b.TRGlyphRunGetReplacement(run);
      if (handle === undefined) {
        return;
      }
      const bounds: ReplacementBounds = {
        x, y, ascent: b.TRGlyphRunGetAscent(run) * renderScale, descent: b.TRGlyphRunGetDescent(run) * renderScale,
        width: b.TRGlyphRunGetWidth(run) * renderScale,
      };
      const replacement = new Replacement(adopt, handle);
      try {
        replacement.draw(context as unknown as DrawingContext, bounds);
      } finally {
        replacement.dispose();
      }
    } finally {
      b.disposeHandle(run);
    }
  };
}

interface Recorded {
  images: { pixels: Uint8Array; width: number; height: number; format: number; x: number; y: number; scaleX: number; scaleY: number; color: number; clip: Rect | undefined }[];
  /** Everything in drawing order: an image index or a rectangle. */
  order: ({ image: number } | { rect: Rect; color: number })[];
  shadows: number;
}

/** Draws into the JavaScript surface and keeps what it receives. */
function record(built: BuiltScene): Recorded {
  const recorded: Recorded = { images: [], order: [], shadows: 0 };
  const context: DrawingContext = {
    drawGlyphImage(image: GlyphImage, x, y, scaleX, scaleY, color, clip) {
      recorded.order.push({ image: recorded.images.length });
      recorded.images.push({ pixels: new Uint8Array(image.pixels), width: image.width, height: image.height, format: image.format, x, y, scaleX, scaleY, color, clip });
    },
    fillRect(rect, color) {
      recorded.order.push({ rect, color });
    },
    beginShadow() {
      recorded.shadows++;
    },
    endShadow() {},
  };
  built.frame.draw(built.renderer, context, 0, 0);
  return recorded;
}

/** Composites the recording onto an opaque white canvas, source over, at a scale of 1. */
function composite(recorded: Recorded, width: number, height: number): Float64Array {
  const canvas = new Float64Array(width * height * 3).fill(255);
  const blend = (x: number, y: number, r: number, g: number, bl: number, alpha: number) => {
    const at = (y * width + x) * 3;
    canvas[at] = canvas[at]! * (1 - alpha) + r * alpha;
    canvas[at + 1] = canvas[at + 1]! * (1 - alpha) + g * alpha;
    canvas[at + 2] = canvas[at + 2]! * (1 - alpha) + bl * alpha;
  };
  for (const item of recorded.order) {
    if ('rect' in item) {
      const { rect, color } = item;
      for (let y = Math.max(0, Math.round(rect.y)); y < Math.min(height, Math.round(rect.y + rect.height)); y++) {
        for (let x = Math.max(0, Math.round(rect.x)); x < Math.min(width, Math.round(rect.x + rect.width)); x++) {
          blend(x, y, (color >>> 16) & 255, (color >>> 8) & 255, color & 255, (color >>> 24) / 255);
        }
      }
      continue;
    }

    const image = recorded.images[item.image]!;
    const left = image.clip === undefined ? 0 : Math.round(image.clip.x);
    const top = image.clip === undefined ? 0 : Math.round(image.clip.y);
    const right = image.clip === undefined ? width : Math.round(image.clip.x + image.clip.width);
    const bottom = image.clip === undefined ? height : Math.round(image.clip.y + image.clip.height);
    for (let row = 0; row < image.height; row++) {
      for (let column = 0; column < image.width; column++) {
        const x = image.x + column;
        const y = image.y + row;
        if (x < Math.max(0, left) || x >= Math.min(width, right) || y < Math.max(0, top) || y >= Math.min(height, bottom)) {
          continue;
        }
        if (image.format === GlyphImageFormat.Alpha) {
          const coverage = (image.pixels[row * image.width + column]! / 255) * ((image.color >>> 24) / 255);
          blend(x, y, (image.color >>> 16) & 255, (image.color >>> 8) & 255, image.color & 255, coverage);
        } else {
          // Premultiplied, alpha first: the color is already scaled by the alpha.
          const at = (row * image.width + column) * 4;
          const alpha = image.pixels[at]! / 255;
          const target = (y * width + x) * 3;
          for (let channel = 0; channel < 3; channel++) {
            canvas[target + channel] = image.pixels[at + 1 + channel]! + canvas[target + channel]! * (1 - alpha);
          }
        }
      }
    }
  }
  return canvas;
}

/** The largest channel difference, and how many pixels differ by more than the tolerance. */
function compare(painted: Paint, expected: Float64Array): { max: number; over: number; first: string } {
  let max = 0;
  let over = 0;
  let first = '';
  for (let pixel = 0; pixel < painted.width * painted.height; pixel++) {
    for (let channel = 0; channel < 3; channel++) {
      const difference = Math.abs(painted.data[pixel * 4 + channel]! - expected[pixel * 3 + channel]!);
      max = Math.max(max, difference);
      if (difference > 3) {
        over++;
        first = first || `(${pixel % painted.width}, ${Math.floor(pixel / painted.width)}) channel ${channel}: painted ${painted.data[pixel * 4 + channel]}, expected ${Math.round(expected[pixel * 3 + channel]!)}`;
      }
    }
  }
  return { max, over, first };
}

function ink(painted: Paint, test: (r: number, g: number, bl: number) => number): { weight: number; x: number; y: number } {
  let weight = 0;
  let x = 0;
  let y = 0;
  for (let pixel = 0; pixel < painted.width * painted.height; pixel++) {
    const w = test(painted.data[pixel * 4]!, painted.data[pixel * 4 + 1]!, painted.data[pixel * 4 + 2]!);
    weight += w;
    x += w * (pixel % painted.width);
    y += w * Math.floor(pixel / painted.width);
  }
  return { weight, x: weight === 0 ? 0 : x / weight, y: weight === 0 ? 0 : y / weight };
}

type Test = [name: string, body: (b: NativeBindings, faces: Faces) => void];

function hooks(b: NativeBindings): void {
  check(typeof b.testPaintFrame === 'function' && typeof b.testGetPaintCounts === 'function', 'the paint hooks are missing: this needs a debug build');
}

const exact: Test[] = scenes.map((scene): Test => [
  `${scene.name}: the pixels equal the callbacks of Core composited in TypeScript`,
  (b, faces) => {
    hooks(b);
    const built = buildScene(scene, faces);
    const recorded = record(built);
    check(recorded.images.length > 0, 'the scene draws glyph images');
    check(recorded.images.every((image) => image.scaleX === 1 && image.scaleY === 1), 'the reference composites at a scale of 1');
    if (scene.name === 'shadow') {
      // The shadow is a blur of the platform, which has no reference here; it is checked below.
      check(recorded.shadows > 0, 'Core opens a shadow scope');
      built.dispose();
      return;
    }
    if (scene.name === 'argb') {
      check(recorded.images.some((image) => image.format === GlyphImageFormat.ARGB), 'the color font gives ARGB images');
    }
    const painted = paint(b, built, scene, WHITE, scene.replacement ? replacementDrawer(b, 1) : undefined);
    check(painted.width === scene.width && painted.height === scene.height, `canvas ${painted.width}x${painted.height}`);
    const difference = compare(painted, composite(recorded, painted.width, painted.height));
    built.dispose();
    check(difference.over === 0, `${difference.over} channels differ by more than 3 (largest ${difference.max}); first ${difference.first}`);
  },
]);

const tests: Test[] = [
  ...exact,

  ['a frame cut through a cluster is drawn clipped, like the callbacks say', (b, faces) => {
    hooks(b);
    // A range that starts or ends inside a cluster (a letter and its marks) makes Core pass the clip
    // of the line with the glyphs of that cluster.
    const found = findClippedScene(faces);
    check(found !== undefined, 'no range of the Urdu text with marks gives a clip');
    const built = buildScene(found!, faces);
    const recorded = record(built);
    check(recorded.images.some((image) => image.clip !== undefined), 'the recording has a clip');
    const painted = paint(b, built, found!);
    const difference = compare(painted, composite(recorded, painted.width, painted.height));
    built.dispose();
    check(difference.over === 0, `${difference.over} channels differ (largest ${difference.max}); first ${difference.first}`);
  }],

  ['the shadow lands where dx and dy say, once for a glyph that is filled and stroked, at both densities', (b, faces) => {
    hooks(b);
    for (const density of [1, 2]) {
      const scene: Scene = { name: 's', caption: '', text: 'abc', face: 'roboto', size: 40, width: 240, height: 110, renderer: { shadowRadius: 3, shadowDx: 80, shadowDy: 30, shadowColor: 0xffff0000 } };
      const lit = buildScene(scene, faces, density);
      const withShadow = paint(b, lit, scene);
      const plain = buildScene({ ...scene, renderer: {} }, faces, density);
      const without = paint(b, plain, scene);
      lit.dispose();
      plain.dispose();

      const reddish = (r: number, g: number, bl: number) => Math.max(0, r - g - 40) * (bl < 200 ? 1 : 0.2);
      check(ink(without, reddish).weight === 0, 'no red without a shadow');
      const shadow = ink(withShadow, reddish);
      const text = ink(withShadow, (r, g, bl) => (r < 90 && g < 90 && bl < 90 ? 1 : 0));
      check(shadow.weight > 500 && text.weight > 100, `both are there: shadow ${shadow.weight}, text ${text.weight}`);
      const shiftX = shadow.x - text.x;
      const shiftY = shadow.y - text.y;
      check(Math.abs(shiftX - 80) < 4 && Math.abs(shiftY - 30) < 4, `density ${density}: the shadow moved by (${shiftX.toFixed(1)}, ${shiftY.toFixed(1)}) instead of (80, 30)`);
      check(shadow.y > text.y, 'a positive dy is downward');
    }
  }],

  ['a translucent color shows the canvas through, and a background keeps the premultiplied result', (b, faces) => {
    hooks(b);
    const scene: Scene = { name: 'a', caption: '', text: 'abc', face: 'roboto', size: 40, width: 150, height: 60, attributes: [[0, 3, { backgroundColor: 0x80ff0000, foregroundColor: 0x800000ff }]] };
    const built = buildScene(scene, faces);
    const recorded = record(built);
    const painted = paint(b, built, scene);
    built.dispose();
    const difference = compare(painted, composite(recorded, painted.width, painted.height));
    check(difference.over === 0, `${difference.over} channels differ (largest ${difference.max}); first ${difference.first}`);
  }],

  ['a larger render scale draws the same frame at that many pixels per unit', (b, faces) => {
    hooks(b);
    const scene = scenes.find((s) => s.name === 'alpha')!;
    const one = buildScene(scene, faces, 1);
    const two = buildScene(scene, faces, 2);
    const small = paint(b, one, scene);
    const big = paint(b, two, scene);
    one.dispose();
    two.dispose();
    check(big.width === small.width * 2 && big.height === small.height * 2, `canvas ${big.width}x${big.height}`);
    const dark = (r: number, g: number, bl: number) => 255 * 3 - (r + g + bl);
    const a = ink(small, dark);
    const c = ink(big, dark);
    check(Math.abs(c.x - a.x * 2) < 2 && Math.abs(c.y - a.y * 2) < 2, `the ink centre (${a.x.toFixed(1)}, ${a.y.toFixed(1)}) becomes (${c.x.toFixed(1)}, ${c.y.toFixed(1)})`);
    check(Math.abs(c.weight / a.weight - 4) < 0.4, `four times the ink: ${c.weight / a.weight}`);
  }],

  ['bitmaps are made once per glyph image, shared by every draw, and destroyed with the images', (b, faces) => {
    hooks(b);
    const counts = () => b.testGetPaintCounts!();
    const start = counts();
    const scene = scenes.find((s) => s.name === 'alpha')!;
    const cache = new GlyphCache(1 << 20);
    const built = buildScene(scene, faces);
    built.renderer.glyphCache = cache;
    paint(b, built, scene);
    const afterFirst = counts();
    const made = afterFirst.created - start.created;
    check(made > 0 && made <= 3, `a, b and c, once each: ${made} made`);
    check(afterFirst.destroyed === start.destroyed, 'nothing is destroyed while the cache keeps the images');
    paint(b, built, scene);
    paint(b, built, scene);
    check(counts().created === afterFirst.created, 'later draws reuse the bitmaps');

    built.dispose();
    cache.dispose();
    b.testDrainHandlers?.();
    const end = counts();
    check(end.destroyed - start.destroyed === made, `every bitmap goes with its image: ${end.destroyed - start.destroyed} of ${made}`);
  }],

  ['the same image drawn by two renderers of one cache keeps one bitmap', (b, faces) => {
    hooks(b);
    const start = b.testGetPaintCounts!();
    const scene = scenes.find((s) => s.name === 'alpha')!;
    const cache = new GlyphCache(1 << 20);
    const first = buildScene(scene, faces);
    const second = buildScene(scene, faces);
    first.renderer.glyphCache = cache;
    second.renderer.glyphCache = cache;
    paint(b, first, scene);
    const made = b.testGetPaintCounts!().created - start.created;
    paint(b, second, scene);
    check(b.testGetPaintCounts!().created - start.created === made, 'the second renderer found the first one\'s bitmaps');
    first.dispose();
    second.dispose();
    cache.dispose();
    check(b.testGetPaintCounts!().destroyed - start.destroyed === made, 'and they are released with the cache');
  }],

  ['the callbacks the renderer had are back after a paint, also after a failure in the replacement', (b, faces) => {
    hooks(b);
    const scene = scenes.find((s) => s.name === 'replacement')!;
    const built = buildScene(scene, faces);
    const handle = built.renderer.nativeHandle;
    b.testSetNativeDrawCallbacks!(handle, true);
    check(b.testGetDrawCallbacks!(handle).isNativePainter, 'the stand-in is installed');
    paint(b, built, scene);
    check(b.testGetDrawCallbacks!(handle).isNativePainter, 'back after a paint');
    const boom = new RangeError('replacement failed');
    try {
      paint(b, built, scene, WHITE, () => {
        throw boom;
      });
      throw new Error('nothing was thrown');
    } catch (e) {
      check(e === boom, `the value the function threw, got ${String(e)}`);
    }
    check(b.testGetDrawCallbacks!(handle).isNativePainter, 'back after the failure');
    b.testSetNativeDrawCallbacks!(handle, false);
    built.dispose();
  }],

  ['a frame with a replacement but no drawing function draws everything else', (b, faces) => {
    hooks(b);
    const scene = scenes.find((s) => s.name === 'replacement')!;
    const built = buildScene(scene, faces);
    const painted = paint(b, built, scene);
    built.dispose();
    const orange = ink(painted, (r, g, bl) => (r > 200 && g > 140 && g < 190 && bl < 80 ? 1 : 0));
    check(orange.weight === 0, 'the box is only drawn by the delegate through the painter');
    check(ink(painted, (r) => 255 - r).weight > 1000, 'the text is there');
  }],

  ['bad arguments are refused and leave the renderer alone', (b, faces) => {
    hooks(b);
    const scene = scenes.find((s) => s.name === 'alpha')!;
    const built = buildScene(scene, faces);
    const frame = built.frame.nativeHandle;
    const renderer = built.renderer.nativeHandle;
    const thrown = (action: () => unknown): string => {
      try {
        action();
      } catch (e) {
        return `${(e as Error).name}: ${(e as Error).message}`;
      }
      return 'nothing';
    };
    for (const options of [{ width: 0, height: 10 }, { width: 10, height: -1 }, { width: NaN, height: 10 }, { width: 5000, height: 10 }]) {
      const message = thrown(() => b.testPaintFrame!(frame, renderer, { ...options, background: WHITE }));
      check(/RangeError|Error/.test(message) && message !== 'nothing', `${JSON.stringify(options)}: ${message}`);
    }
    check(thrown(() => b.testPaintFrame!(renderer as never, renderer, { width: 10, height: 10, background: WHITE })) !== 'nothing', 'a renderer is not a frame');
    built.dispose();
    check(/disposed/.test(thrown(() => b.testPaintFrame!(frame, renderer, { width: 10, height: 10, background: WHITE }))), 'a disposed frame');
  }],
];

export const painterTestCount = tests.length;

export function runPainterTests(b: NativeBindings): TestResult {
  const failures: string[] = [];
  let passed = 0;
  let faces: Faces | undefined;
  for (const [name, body] of tests) {
    try {
      faces ??= loadFaces();
      body(b, faces);
      passed++;
    } catch (e) {
      failures.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { passed, failures };
}
