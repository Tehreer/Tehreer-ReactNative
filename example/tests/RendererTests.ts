import type { NativeBindings } from '../../src/internal/NativeBindings';
import { FontFile } from '../../src/graphics/FontFile';
import { GlyphCache } from '../../src/graphics/GlyphCache';
import { GlyphImageFormat, GlyphImageKind, DrawStyle, StrokeCap } from '../../src/graphics/enums';
import { Renderer } from '../../src/graphics/Renderer';
import type { GlyphImage } from '../../src/graphics/GlyphImage';
import type { Typeface } from '../../src/graphics/Typeface';
import { SfntTag } from '../../src/sfnt/SfntTag';
import { ShapingEngine } from '../../src/sfnt/ShapingEngine';
import { WritingDirection } from '../../src/sfnt/enums';
import { fontBytes as robotoBytes } from './fontData';
import { colorFontBytes } from './graphicsFontData';

// The suite of issue #18: Renderer, GlyphCache and GlyphImage against the real bindings, on the
// fixtures of Core. The expected values are the ones that Core's own RendererTests.cpp pins for the
// Roboto subset (glyphs 1, 2 and 3 are 'a', 'b' and 'c') at the type size of 32. The native data
// tests use the debug hooks that stand in for a native painter (cpp/runtime/GlyphImageTestHooks.cpp).

export interface TestResult {
  passed: number;
  failures: string[];
}

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function near(a: number, b: number, message: string, tolerance = 0.01): void {
  check(Math.abs(a - b) <= tolerance, `${message}: ${a} is not ${b}`);
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

const GlyphA = 1;
const GlyphB = 2;
const GlyphC = 3;

const noOffsets = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }];
const run = {
  glyphIds: [GlyphA, GlyphB, GlyphC],
  glyphOffsets: noOffsets,
  glyphAdvances: [20, 22, 18],
};

function roboto(): Typeface {
  return FontFile.fromBytes(robotoBytes).typefaces.get(0);
}

interface Fixture {
  typeface: Typeface;
  cache: GlyphCache;
  renderer: Renderer;
}

function fixture(typeface: Typeface = roboto()): Fixture {
  const cache = new GlyphCache(4 * 1024 * 1024);
  const renderer = new Renderer();
  renderer.typeface = typeface;
  renderer.glyphCache = cache;
  renderer.typeSize = 32;
  return { typeface, cache, renderer };
}

function size(image: GlyphImage, left: number, top: number, width: number, height: number): void {
  check(image.left === left && image.top === top && image.width === width && image.height === height,
    `image ${image.left},${image.top} ${image.width}x${image.height}, expected ${left},${top} ${width}x${height}`);
}

function collect(b: NativeBindings): void {
  check(b.testCollectGarbage !== undefined, 'the debug hooks are not in this build');
  b.testCollectGarbage?.();
  b.testCollectGarbage?.();
}

function hooks(b: NativeBindings): {
  attach(image: GlyphImage, race?: boolean): number;
  serial(image: GlyphImage): number;
  counts(): { created: number; destroyed: number };
} {
  const { testAttachNativeData, testGetNativeDataSerial, testGetNativeDataCounts } = b;
  check(testAttachNativeData !== undefined && testGetNativeDataSerial !== undefined && testGetNativeDataCounts !== undefined,
    'the debug hooks of glyph image native data are not in this build');
  return {
    attach: (image, race) => (testAttachNativeData as NonNullable<typeof testAttachNativeData>).call(b, image.nativeHandle, race),
    serial: (image) => (testGetNativeDataSerial as NonNullable<typeof testGetNativeDataSerial>).call(b, image.nativeHandle),
    counts: () => (testGetNativeDataCounts as NonNullable<typeof testGetNativeDataCounts>).call(b),
  };
}

function image(renderer: Renderer, glyph = GlyphA): GlyphImage {
  const made = renderer.getGlyphImage(glyph);
  check(made !== undefined, `no image for glyph ${glyph}`);
  return made as GlyphImage;
}

type Test = [name: string, body: (b: NativeBindings) => void];

const tests: Test[] = [
  ['a new renderer has the defaults of Core and no typeface', () => {
    const renderer = new Renderer();
    check(renderer.typeface === undefined, 'typeface');
    check(renderer.typeSize === 16 && renderer.scaleX === 1 && renderer.scaleY === 1 && renderer.skewX === 0, 'size, scale, skew');
    check(renderer.renderScale === 1 && renderer.writingDirection === WritingDirection.LeftToRight, 'render scale, direction');
    check(renderer.foregroundColor === 0xff000000 && renderer.strokeColor === 0xff000000, 'colors');
    check(renderer.strokeRadius === 0.5 && renderer.strokeMiter === 1 && renderer.strokeCap === 0 && renderer.strokeJoin === 0, 'stroke');
    check(renderer.shadowRadius === 0 && renderer.shadowDx === 0 && renderer.shadowDy === 0 && renderer.shadowColor === 0, 'shadow');
    check(renderer.drawStyle === DrawStyle.Fill, 'draw style');
    check(renderer.isRenderable, 'renderable by size even without a typeface');

    const cache = renderer.glyphCache;
    check(cache !== undefined && cache.equals(GlyphCache.default), 'the default cache');
    cache?.dispose();
    renderer.dispose();
  }],

  ['without a typeface nothing is made and the boxes are empty', () => {
    const renderer = new Renderer();
    check(renderer.getGlyphImage(GlyphA) === undefined && renderer.getStrokeImage(GlyphA) === undefined, 'images');
    check(renderer.getGlyphPath(GlyphA) === undefined, 'path');
    const box = renderer.computeGlyphInkBox(GlyphA);
    check(box.width === 0 && box.height === 0, 'glyph box');
    check(renderer.computeRunInkBox(run).width === 0, 'run box');
    check(renderer.getGlyphPlacements(GlyphImageKind.Fill, run).length === 0, 'placements');
    check(renderer.generatePath(run).isEmpty, 'generated path');
    renderer.dispose();
  }],

  ['every setting is stored in Core and read back, colors as unsigned numbers', () => {
    const renderer = new Renderer();
    renderer.typeSize = 20;
    renderer.scaleX = 2;
    renderer.scaleY = 3;
    renderer.skewX = 0.5;
    renderer.renderScale = 4;
    renderer.writingDirection = WritingDirection.RightToLeft;
    renderer.foregroundColor = 0xf2345678;
    renderer.strokeRadius = 3.5;
    renderer.strokeCap = StrokeCap.Square;
    renderer.strokeJoin = 1;
    renderer.strokeMiter = 9;
    renderer.strokeColor = 0x87654321;
    renderer.shadowRadius = 2.5;
    renderer.shadowDx = 1.5;
    renderer.shadowDy = -3;
    renderer.shadowColor = 0x80102030;
    renderer.drawStyle = DrawStyle.FillStroke;

    check(renderer.typeSize === 20 && renderer.scaleX === 2 && renderer.scaleY === 3 && renderer.skewX === 0.5, 'size, scale, skew');
    check(renderer.renderScale === 4 && renderer.writingDirection === WritingDirection.RightToLeft, 'render scale, direction');
    check(renderer.foregroundColor === 0xf2345678, `foreground ${renderer.foregroundColor.toString(16)}`);
    check(renderer.strokeColor === 0x87654321 && renderer.shadowColor === 0x80102030, 'colors above 0x7fffffff stay unsigned');
    check(renderer.strokeRadius === 3.5 && renderer.strokeCap === 2 && renderer.strokeJoin === 1 && renderer.strokeMiter === 9, 'stroke');
    check(renderer.shadowRadius === 2.5 && renderer.shadowDx === 1.5 && renderer.shadowDy === -3, 'shadow');
    check(renderer.drawStyle === DrawStyle.FillStroke, 'draw style');

    // Core keeps a value it does not know as it was given.
    renderer.strokeCap = 99 as StrokeCap;
    renderer.drawStyle = 77 as DrawStyle;
    check(Number(renderer.strokeCap) === 99 && Number(renderer.drawStyle) === 77, 'unknown enum values are kept');
    renderer.dispose();
  }],

  ['the typeface and the cache are retained by Core, so parents can be disposed first', () => {
    const file = FontFile.fromBytes(robotoBytes);
    const typeface = file.typefaces.get(0);
    const cache = new GlyphCache(1024 * 1024);
    const renderer = new Renderer();
    renderer.typeface = typeface;
    renderer.glyphCache = cache;
    renderer.typeSize = 32;

    const back = renderer.typeface;
    check(back !== undefined && back.equals(typeface) && back !== typeface, 'a reference of its own');
    const cacheBack = renderer.glyphCache;
    check(cacheBack !== undefined && cacheBack.equals(cache), 'the cache that was set');

    // Typeface before renderer, then the file, then the cache: the renderer still renders.
    back?.dispose();
    typeface.dispose();
    file.dispose();
    cache.dispose();
    cacheBack?.dispose();
    check(renderer.isRenderable, 'still renderable');
    const made = image(renderer);
    size(made, 1, 17, 15, 17);
    const again = renderer.typeface;
    check(again !== undefined && again.familyName === 'Roboto', 'the typeface lives in the renderer');
    again?.dispose();

    renderer.typeface = undefined;
    check(renderer.typeface === undefined && renderer.isRenderable, 'undefined clears the typeface, the size still renders');
    check(renderer.getGlyphImage(GlyphA) === undefined, 'nothing is made without a typeface');
    renderer.glyphCache = undefined;
    // Read through a function: after the assignment above, TypeScript narrows the property to undefined.
    const fallback = ((r: Renderer) => r.glyphCache)(renderer);
    check(fallback !== undefined && fallback.equals(GlyphCache.default), 'undefined selects the default cache');
    fallback?.dispose();
    made.dispose();
    renderer.dispose();
  }],

  ['images of the three glyphs have the sizes of Core and ink, and the stroke is bigger', () => {
    const { renderer, cache, typeface } = fixture();
    const a = image(renderer, GlyphA);
    const b = image(renderer, GlyphB);
    const c = image(renderer, GlyphC);
    size(a, 1, 17, 15, 17);
    size(b, 2, 24, 15, 24);
    size(c, 1, 17, 15, 17);
    check(a.format === GlyphImageFormat.Alpha, 'alpha image');
    check(a.byteCount === 15 * 17, 'one byte for each pixel');

    const pixels = a.pixels;
    check(pixels.length === a.byteCount, 'pixels');
    check(pixels.some((value) => value !== 0), 'the image has ink');
    pixels.fill(0);
    check(a.pixels.some((value) => value !== 0), 'the array is a copy');

    const stroke = renderer.getStrokeImage(GlyphA);
    check(stroke !== undefined, 'stroke image');
    size(stroke as GlyphImage, 1, 18, 16, 19);
    check(renderer.getGlyphImage(0) === undefined, 'the notdef glyph has nothing to show');

    const second = image(renderer, GlyphA);
    check(second.equals(a) && second !== a, 'the cache shares the image, each wrapper has a reference of its own');
    check(cache.size > 0, 'the cache holds the images');

    [a, b, c, stroke as GlyphImage, second, renderer, cache, typeface].forEach((object) => object.dispose());
  }],

  ['an image stays valid after the renderer, the cache and the typeface are disposed', () => {
    const { renderer, cache, typeface } = fixture();
    const made = image(renderer);
    const before = made.pixels;
    renderer.dispose();
    cache.dispose();
    typeface.dispose();
    check(made.width === 15 && made.height === 17, 'properties');
    check(made.pixels.length === before.length && made.pixels.every((value, index) => value === before[index]), 'pixels');
    made.dispose();
    expectThrows(() => made.pixels, /already disposed/);
  }],

  ['render scale, scales and skew change the images as in Core', () => {
    const { renderer, cache, typeface } = fixture();
    const base = image(renderer);

    renderer.typeSize = 16;
    renderer.renderScale = 2;
    const scaled = image(renderer);
    check(scaled.equals(base), 'half the size at twice the scale is the same image');
    renderer.renderScale = 1;
    const smaller = image(renderer);
    check(!smaller.equals(base) && smaller.width < base.width, 'a smaller image');
    renderer.typeSize = 32;

    renderer.scaleX = 2;
    const wide = image(renderer);
    check(wide.width > (base.width * 3) / 2 && wide.height === base.height, 'wide');
    renderer.scaleX = 1;
    renderer.scaleY = 2;
    const tall = image(renderer);
    check(tall.height > (base.height * 3) / 2 && tall.width === base.width, 'tall');
    renderer.scaleY = 1;

    renderer.skewX = 0.25;
    const skewed = image(renderer);
    size(skewed, -2, 17, 18, 17);

    [base, scaled, smaller, wide, tall, skewed, renderer, cache, typeface].forEach((object) => object.dispose());
  }],

  ['isRenderable follows the size and the scales, not the typeface', () => {
    const { renderer, cache, typeface } = fixture();
    check(renderer.isRenderable, 'renderable');
    renderer.typeSize = 1;
    check(renderer.isRenderable, 'the least size is one pixel');
    renderer.typeSize = 0.9;
    check(!renderer.isRenderable && renderer.getGlyphImage(GlyphA) === undefined && renderer.getGlyphPath(GlyphA) === undefined,
      'less than a pixel renders nothing');
    renderer.renderScale = 2;
    check(renderer.isRenderable, 'the render scale makes up for a small size');
    renderer.renderScale = 1;
    renderer.typeSize = 32;
    renderer.scaleX = 0;
    check(!renderer.isRenderable, 'a scale of zero removes the size');
    renderer.scaleX = 1;
    renderer.scaleY = -1;
    check(!renderer.isRenderable && renderer.getGlyphImage(GlyphA) === undefined, 'a negative scale renders nothing');
    renderer.scaleY = 1;
    check(renderer.isRenderable, 'renderable again');
    [renderer, cache, typeface].forEach((object) => object.dispose());
  }],

  ['ink boxes of a glyph and of a run', () => {
    const { renderer, cache, typeface } = fixture();
    let box = renderer.computeGlyphInkBox(GlyphA);
    near(box.x, 1, 'a.x'); near(box.y, -17, 'a.y'); near(box.width, 15, 'a.width'); near(box.height, 17, 'a.height');
    box = renderer.computeGlyphInkBox(GlyphB);
    near(box.x, 2, 'b.x'); near(box.y, -24, 'b.y'); near(box.height, 24, 'b.height');
    box = renderer.computeGlyphInkBox(0);
    check(box.width === 0 && box.height === 0, 'an empty box for a glyph without an image');

    box = renderer.computeRunInkBox(run);
    near(box.x, 1, 'run.x'); near(box.y, -24, 'run.y'); near(box.width, 57, 'run.width'); near(box.height, 24, 'run.height');
    box = renderer.computeRunInkBox({ ...run, glyphOffsets: [{ x: 0, y: 10 }, noOffsets[1], noOffsets[2]] as never });
    near(box.y, -27, 'offset run.y'); near(box.height, 27, 'offset run.height');
    check(renderer.computeRunInkBox({ glyphIds: [], glyphOffsets: [], glyphAdvances: [] }).width === 0, 'an empty run');
    [renderer, cache, typeface].forEach((object) => object.dispose());
  }],

  ['placements go left to right and right to left, and the caller owns the images', () => {
    const { renderer, cache, typeface } = fixture();
    let placements = renderer.getGlyphPlacements(GlyphImageKind.Fill, run);
    check(placements.length === 3, 'three placements');
    check(placements[0]?.x === 1 && placements[0].y === -17, 'first');
    check(placements[1]?.x === 22 && placements[1].y === -24, 'second');
    check(placements[2]?.x === 43 && placements[2].y === -17, 'third');
    check(placements.every((p, index) => p.glyphIndex === index && p.scaleX === 1 && p.scaleY === 1), 'indices and scales');
    size(placements[0]?.image as GlyphImage, 1, 17, 15, 17);
    placements.forEach((p) => p.image.dispose());

    renderer.writingDirection = WritingDirection.RightToLeft;
    placements = renderer.getGlyphPlacements(GlyphImageKind.Fill, run);
    check(placements[0]?.x === -19 && placements[1]?.x === -40 && placements[2]?.x === -59, 'right to left');
    placements.forEach((p) => p.image.dispose());
    renderer.writingDirection = WritingDirection.LeftToRight;

    const fill = renderer.getGlyphPlacements(GlyphImageKind.Fill, { ...run, glyphIds: [GlyphA] });
    const stroke = renderer.getGlyphPlacements(GlyphImageKind.Stroke, { ...run, glyphIds: [GlyphA] });
    check(!(fill[0]?.image as GlyphImage).equals(stroke[0]?.image as GlyphImage), 'stroke images are other ones');
    size(stroke[0]?.image as GlyphImage, 1, 18, 16, 19);
    check(stroke[0]?.x === 1 && stroke[0].y === -18, 'stroke origin');
    [...fill, ...stroke].forEach((p) => p.image.dispose());

    const skipped = renderer.getGlyphPlacements(GlyphImageKind.Fill, { ...run, glyphIds: [GlyphA, 0, GlyphC] });
    check(skipped.length === 2 && skipped[0]?.glyphIndex === 0 && skipped[1]?.glyphIndex === 2, 'glyphs without an image are skipped');
    skipped.forEach((p) => p.image.dispose());

    const offsets = [{ x: 3, y: 4 }, { x: 0, y: 2 }, { x: -5, y: 0 }];
    placements = renderer.getGlyphPlacements(GlyphImageKind.Fill, { ...run, glyphOffsets: offsets });
    check(placements[0]?.x === 4 && placements[0].y === -21, 'offsets move the glyphs');
    placements.forEach((p) => p.image.dispose());
    [renderer, cache, typeface].forEach((object) => object.dispose());
  }],

  ['the run can come from a shaping result, whose lists are Core memory', () => {
    const { renderer, cache, typeface } = fixture();
    const engine = new ShapingEngine();
    engine.typeface = typeface;
    engine.typeSize = 32;
    engine.scriptTag = SfntTag.make('latn');
    const result = engine.shapeText('abc');
    check(result.glyphCount === 3, 'three glyphs');

    const placements = renderer.getGlyphPlacements(GlyphImageKind.Fill, result);
    check(placements.length === 3, 'three placements');
    check(placements[0]?.x === 1, 'the first one starts at its left edge');
    placements.forEach((p) => p.image.dispose());
    const box = renderer.computeRunInkBox(result);
    check(box.width > 40, 'the run box');
    near(box.height, 24, 'the run box height');
    check(!renderer.generatePath(result).isEmpty, 'the path');

    result.dispose();
    expectThrows(() => renderer.computeRunInkBox(result), /already disposed/);
    engine.dispose();
    [renderer, cache].forEach((object) => object.dispose());
  }],

  ['glyph paths are in pixels with y down, and a generated path places the glyphs', () => {
    const { renderer, cache, typeface } = fixture();
    const single = renderer.getGlyphPath(GlyphA);
    check(single !== undefined && !single.isEmpty, 'a path for a');
    check(single?.toSvgPathData().startsWith('M') === true, 'svg data');
    check(Math.min(...(single?.coordinates.filter((_, i) => i % 2 === 1) ?? [0])) < -10, 'y points down, so the glyph is above the baseline at negative y');

    const generated = renderer.generatePath({ ...run, glyphIds: [GlyphA], glyphOffsets: [{ x: 0, y: 0 }], glyphAdvances: [20] });
    check(generated.coordinates.length === single?.coordinates.length, 'the same segments');
    check(generated.coordinates.every((value, i) => Math.abs(value - (single?.coordinates[i] ?? NaN)) < 1e-3), 'the same coordinates');

    const all = renderer.generatePath(run);
    check(all.verbs.length > generated.verbs.length, 'three glyphs have more segments');
    const missing = renderer.generatePath({ ...run, glyphIds: [GlyphA, 500, GlyphC] });
    check(missing.verbs.length < all.verbs.length && !missing.isEmpty, 'a glyph without an outline does not break the run');
    [renderer, cache, typeface].forEach((object) => object.dispose());
  }],

  ['a cache is made with a capacity, resized, cleared and shared by renderers', () => {
    const cache = new GlyphCache(2 * 1024 * 1024);
    check(cache.capacity === 2 * 1024 * 1024 && cache.size === 0, 'a new cache is empty');
    const typeface = roboto();
    const first = new Renderer();
    const second = new Renderer();
    for (const renderer of [first, second]) {
      renderer.typeface = typeface;
      renderer.glyphCache = cache;
      renderer.typeSize = 32;
    }
    const a = image(first);
    const b = image(second);
    check(a.equals(b), 'renderers that share a cache share its images');
    check(cache.size >= a.byteCount, 'size counts bytes');

    cache.capacity = 1024;
    check(cache.capacity === 1024, 'capacity');
    cache.capacity = 0;
    check(cache.size === 0, 'a capacity of zero drops every image');
    check(a.width === 15, 'an image that someone holds stays valid');

    cache.capacity = 1024 * 1024;
    image(first).dispose();
    check(cache.size > 0, 'filled again');
    cache.clear();
    check(cache.size === 0, 'clear');

    const defaults = GlyphCache.default;
    check(defaults.capacity === 8 * 1024 * 1024, 'the default cache has 8 MB');
    const defaultsAgain = GlyphCache.default;
    check(defaults.equals(defaultsAgain) && defaults !== defaultsAgain, 'one cache, a reference for each read');
    defaults.dispose();
    check(defaultsAgain.capacity === 8 * 1024 * 1024, 'disposing a reference leaves the cache');

    [a, b, first, second, cache, typeface, defaultsAgain].forEach((object) => object.dispose());
  }],

  ['native data is attached once, shared by every wrapper and destroyed with the image', (b) => {
    const h = hooks(b);
    const { renderer, cache, typeface } = fixture();
    const start = h.counts();

    const first = image(renderer);
    check(h.serial(first) === -1, 'a new image has no native data');
    const serial = h.attach(first);
    check(serial > 0 && h.serial(first) === serial, 'attached');
    check(h.attach(first) === serial, 'a second attach finds the first data');
    const second = image(renderer);
    check(h.serial(second) === serial, 'every wrapper of the image sees the data');
    let now = h.counts();
    check(now.created === start.created + 1 && now.destroyed === start.destroyed, 'one made, none destroyed');

    first.dispose();
    second.dispose();
    now = h.counts();
    check(now.destroyed === start.destroyed, 'the cache keeps the image, so the data lives');
    cache.clear();
    now = h.counts();
    check(now.destroyed === start.destroyed + 1, 'the data goes with the image once nobody holds it');
    [renderer, cache, typeface].forEach((object) => object.dispose());
  }],

  ['native data lives as long as one wrapper holds the image, whatever the cache does', (b) => {
    const h = hooks(b);
    const { renderer, cache, typeface } = fixture();
    const start = h.counts();
    const held = image(renderer, GlyphB);
    h.attach(held);
    cache.clear();
    cache.capacity = 0;
    check(h.counts().destroyed === start.destroyed, 'the cache let go, the wrapper did not');
    check(h.serial(held) > 0, 'the data is still there');
    held.dispose();
    check(h.counts().destroyed === start.destroyed + 1, 'destroyed when the last reference goes');
    [renderer, cache, typeface].forEach((object) => object.dispose());
  }],

  ['native data is destroyed when the cache is shrunk or disposed', (b) => {
    const h = hooks(b);
    const typeface = roboto();
    const start = h.counts();

    const shrink = fixture(typeface);
    const one = image(shrink.renderer);
    h.attach(one);
    one.dispose();
    shrink.cache.capacity = 0;
    check(h.counts().destroyed === start.destroyed + 1, 'dropped by a smaller capacity');

    const dispose = fixture(typeface);
    const two = image(dispose.renderer, GlyphC);
    h.attach(two);
    two.dispose();
    dispose.renderer.dispose();
    check(h.counts().destroyed === start.destroyed + 1, 'the cache is still alive, so is the data');
    dispose.cache.dispose();
    check(h.counts().destroyed === start.destroyed + 2, 'the cache is gone, and its images with it');

    [shrink.renderer, shrink.cache, typeface].forEach((object) => object.dispose());
  }],

  ['a painter that loses the race destroys its own data and uses the winner\'s', (b) => {
    const h = hooks(b);
    const { renderer, cache, typeface } = fixture();
    const start = h.counts();
    const made = image(renderer);

    const serial = h.attach(made, true);
    const now = h.counts();
    check(now.created === start.created + 2, 'two were made');
    check(now.destroyed === start.destroyed + 1, 'the loser was destroyed at once');
    check(h.serial(made) === serial, 'the image holds the winner, and that is what was returned');

    made.dispose();
    cache.clear();
    check(h.counts().destroyed === start.destroyed + 2, 'the winner goes with the image');
    [renderer, cache, typeface].forEach((object) => object.dispose());
  }],

  ['an image that was never disposed releases its native data when the engine collects it', (b) => {
    const h = hooks(b);
    const { renderer, cache, typeface } = fixture();
    const start = h.counts();

    (() => {
      const abandoned = image(renderer);
      h.attach(abandoned);
    })();
    cache.clear();
    check(h.counts().destroyed === start.destroyed, 'a wrapper still holds the image until it is collected');
    collect(b);
    check(h.counts().destroyed === start.destroyed + 1, 'the finalizer gave the reference back');
    [renderer, cache, typeface].forEach((object) => object.dispose());
  }],

  ['placements that are dropped without disposing give their images back when collected', (b) => {
    const h = hooks(b);
    const { renderer, cache, typeface } = fixture();
    const start = h.counts();

    (() => {
      const placements = renderer.getGlyphPlacements(GlyphImageKind.Fill, run);
      placements.forEach((p) => h.attach(p.image));
    })();
    cache.clear();
    collect(b);
    check(h.counts().destroyed === start.destroyed + 3, 'three images, three destroyed');
    [renderer, cache, typeface].forEach((object) => object.dispose());
  }],

  ['color glyphs come as premultiplied ARGB images and mask glyphs as alpha images', () => {
    const typeface = FontFile.fromBytes(colorFontBytes).typefaces.get(0);
    const { renderer, cache } = fixture(typeface);
    renderer.typeSize = 48;

    const color = renderer.getGlyphImage(0);
    check(color !== undefined, 'a color glyph has an image');
    const argb = color as GlyphImage;
    check(argb.format === GlyphImageFormat.ARGB, `format ${argb.format}`);
    check(argb.byteCount === argb.width * argb.height * 4, 'four bytes for each pixel');
    const pixels = argb.pixels;
    let covered = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index] as number;
      check((pixels[index + 1] as number) <= alpha && (pixels[index + 2] as number) <= alpha && (pixels[index + 3] as number) <= alpha,
        'the color channels are premultiplied by alpha');
      covered += alpha > 0 ? 1 : 0;
    }
    check(covered > 0, 'the image has ink');

    const mask = renderer.getGlyphImage(4);
    check(mask !== undefined && mask.format === GlyphImageFormat.Alpha, 'a mask glyph');
    [argb, mask as GlyphImage, renderer, cache, typeface].forEach((object) => object.dispose());
  }],

  ['a disposed renderer, cache or image fails every member with already disposed', () => {
    const { renderer, cache, typeface } = fixture();
    const made = image(renderer);
    renderer.dispose();
    cache.dispose();
    made.dispose();
    renderer.dispose();
    cache.dispose();
    made.dispose();
    check(renderer.isDisposed && cache.isDisposed && made.isDisposed, 'disposed');

    for (const use of [
      () => renderer.typeSize, () => { renderer.typeSize = 1; }, () => renderer.typeface, () => renderer.glyphCache,
      () => renderer.isRenderable, () => renderer.getGlyphImage(GlyphA), () => renderer.getStrokeImage(GlyphA),
      () => renderer.getGlyphPath(GlyphA), () => renderer.computeGlyphInkBox(GlyphA), () => renderer.computeRunInkBox(run),
      () => renderer.getGlyphPlacements(GlyphImageKind.Fill, run), () => renderer.generatePath(run),
      () => cache.capacity, () => { cache.capacity = 1; }, () => cache.size, () => cache.clear(),
      () => made.format, () => made.left, () => made.top, () => made.width, () => made.height, () => made.byteCount, () => made.pixels,
    ]) {
      expectThrows(use, /already disposed/);
    }
    typeface.dispose();

    const live = fixture();
    const disposedCache = new GlyphCache(10);
    disposedCache.dispose();
    expectThrows(() => { live.renderer.glyphCache = disposedCache; }, /already disposed/);
    const disposedFace = roboto();
    disposedFace.dispose();
    expectThrows(() => { live.renderer.typeface = disposedFace; }, /already disposed/);
    check(live.renderer.isRenderable, 'the renderer is unharmed by the refused setters');
    [live.renderer, live.cache, live.typeface].forEach((object) => object.dispose());
  }],

  ['invalid input is mapped to RangeError, TypeError or Error before Core is reached', () => {
    const { renderer, cache, typeface } = fixture();

    for (const bad of [-1, 1.5, 65536, Number.NaN, Number.POSITIVE_INFINITY]) {
      expectThrows(() => renderer.getGlyphImage(bad), /glyph ID/, 'RangeError');
      expectThrows(() => renderer.getStrokeImage(bad), /glyph ID/, 'RangeError');
      expectThrows(() => renderer.getGlyphPath(bad), /glyph ID/, 'RangeError');
      expectThrows(() => renderer.computeGlyphInkBox(bad), /glyph ID/, 'RangeError');
    }
    expectThrows(() => renderer.getGlyphImage('a' as unknown as number), /glyph ID/, 'RangeError');

    expectThrows(() => renderer.computeRunInkBox({ ...run, glyphIds: [1, 70000, 3] }), /glyph ID/, 'RangeError');
    expectThrows(() => renderer.computeRunInkBox({ ...run, glyphAdvances: [1, 2] }), /advances/, 'RangeError');
    expectThrows(() => renderer.generatePath({ ...run, glyphOffsets: [{ x: 0, y: 0 }] }), /offsets/, 'RangeError');
    expectThrows(() => renderer.getGlyphPlacements(2 as GlyphImageKind, run), /GlyphImageKind/, 'RangeError');
    expectThrows(() => renderer.getGlyphPlacements(-1 as GlyphImageKind, run), /GlyphImageKind/, 'RangeError');
    expectThrows(() => renderer.computeRunInkBox({ ...run, glyphOffsets: [{ x: 'a', y: 0 }, noOffsets[1], noOffsets[2]] as never }), /glyphOffsets\[0\].*finite/, 'RangeError');

    expectThrows(() => { renderer.typeface = {} as unknown as Typeface; }, /typeface must be a Typeface/, 'TypeError');
    expectThrows(() => { renderer.glyphCache = 5 as unknown as GlyphCache; }, /glyphCache must be a GlyphCache/, 'TypeError');
    check(renderer.typeface !== undefined, 'a refused typeface does not clear the old one');
    expectThrows(() => renderer.computeRunInkBox(null as never), /run must be an object/, 'TypeError');
    expectThrows(() => renderer.computeRunInkBox({ ...run, glyphAdvances: [1, Number.NaN, 3] }), /glyphAdvances\[1\].*finite/, 'RangeError');
    expectThrows(() => renderer.computeRunInkBox({ ...run, glyphOffsets: [{ x: Number.POSITIVE_INFINITY, y: 0 }, noOffsets[1], noOffsets[2]] as never }), /glyphOffsets\[0\].*finite/, 'RangeError');
    expectThrows(() => { renderer.typeSize = Number.NaN; }, /NaN/, 'RangeError');
    expectThrows(() => { renderer.strokeRadius = Number.NaN; }, /NaN/, 'RangeError');
    expectThrows(() => { renderer.typeSize = '12' as unknown as number; }, /must be a number/);
    expectThrows(() => { renderer.foregroundColor = -1; }, /out of range/, 'RangeError');
    expectThrows(() => { renderer.strokeColor = 0x100000000; }, /out of range/, 'RangeError');
    expectThrows(() => { renderer.shadowColor = 1.5; }, /integer/, 'RangeError');
    check(renderer.typeSize === 32 && renderer.foregroundColor === 0xff000000, 'a refused value changes nothing');

    // -1 would be read as "no limit" by the index conversion of the binding.
    for (const bad of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expectThrows(() => new GlyphCache(bad), /capacity/, 'RangeError');
      expectThrows(() => { cache.capacity = bad; }, /capacity/, 'RangeError');
    }
    check(cache.capacity === 4 * 1024 * 1024, 'the capacity is unchanged');

    [renderer, cache, typeface].forEach((object) => object.dispose());
  }],

  ['repeated placements that are disposed do not grow the cache', () => {
    const { renderer, cache, typeface } = fixture();
    renderer.getGlyphPlacements(GlyphImageKind.Fill, run).forEach((p) => p.image.dispose());
    const size0 = cache.size;
    for (let round = 0; round < 50; round++) {
      renderer.getGlyphPlacements(GlyphImageKind.Fill, run).forEach((p) => p.image.dispose());
    }
    check(cache.size === size0, 'the cache holds the same three images');
    [renderer, cache, typeface].forEach((object) => object.dispose());
  }],

];

export function runRendererTests(bindings: NativeBindings): TestResult {
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

export const rendererTestCount = tests.length;
