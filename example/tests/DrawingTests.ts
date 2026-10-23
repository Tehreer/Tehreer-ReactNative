import type { NativeBindings } from '../../src/internal/NativeBindings';
import { Color } from '../../src/Color';
import type { Rect } from '../../src/geometry';
import type { DrawingContext } from '../../src/drawing/DrawingContext';
import type { ReplacementBounds } from '../../src/drawing/ReplacementDelegate';
import { FontFile } from '../../src/graphics/FontFile';
import type { GlyphImage } from '../../src/graphics/GlyphImage';
import { DrawStyle } from '../../src/graphics/enums';
import { Renderer } from '../../src/graphics/Renderer';
import { ComposedFrame } from '../../src/layout/ComposedFrame';
import { ReplacementKind } from '../../src/layout/enums';
import { FrameResolver } from '../../src/layout/FrameResolver';
import { Replacement } from '../../src/layout/Replacement';
import { TMutableText } from '../../src/layout/TMutableText';
import { Typesetter } from '../../src/layout/Typesetter';
import { drawScenarios, format, prepare } from './drawingScenarios';
import type { DrawScenario, Faces } from './drawingScenarios';
import { drawingExpected } from './drawingExpected';
import { fontBytes as robotoBytes, nastaliqFontBytes } from './fontData';

// The suite of issue #22: GlyphRun.draw, ComposedLine.draw and ComposedFrame.draw into a JavaScript
// `DrawingContext`, against the real bindings and the fonts of Core. The calls a recording surface
// gets for the scenarios of drawingScenarios.ts are compared with what Tehreer-Web's CanvasPainter
// does for the same frames (drawingExpected.ts); the rest checks that the callbacks are installed
// for the call and put back on every path, that errors propagate, that the lent image is disposed,
// the disposal rules and the replacement's draw hook.

export interface TestResult {
  passed: number;
  failures: string[];
}

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function expectThrows(action: () => unknown, expectedName: string, pattern?: RegExp): void {
  try {
    action();
  } catch (e) {
    const error = e as Error;
    check(error.name === expectedName, `expected ${expectedName}, got ${error.name}: ${error.message}`);
    check(pattern === undefined || pattern.test(error.message), `message "${error.message}" does not match ${pattern}`);
    return;
  }
  throw new Error(`expected ${expectedName}, but nothing was thrown`);
}

function load(): Faces {
  const roboto = new FontFile(robotoBytes);
  const nastaliq = new FontFile(nastaliqFontBytes);
  return { roboto: roboto.typefaces.get(0), nastaliq: nastaliq.typefaces.get(0) };
}

const library = { DrawStyle, FrameResolver, Renderer, Replacement, ReplacementKind, TMutableText, Typesetter };

/**
 * A surface that writes the same normalised events as the `CanvasRecorder` that made
 * `drawingExpected.ts`, expanding a clip and a shadow scope into the calls a canvas would get.
 */
class Surface implements DrawingContext {
  readonly events: string[];
  /** The raw arguments of `drawGlyphImage`, for what the events leave out. */
  readonly images: { color: Color; scaleX: number; scaleY: number; clip: Rect | undefined; format: number; pixels: number }[] = [];
  /** The wrappers that were given, to see that they are disposed afterwards. */
  readonly wrappers: GlyphImage[] = [];

  constructor(events: string[] = []) {
    this.events = events;
  }

  drawGlyphImage(image: GlyphImage, x: number, y: number, scaleX: number, scaleY: number, color: Color, clip: Rect | undefined): void {
    check(!image.isDisposed, 'the image is valid inside the callback');
    this.wrappers.push(image);
    this.images.push({ color, scaleX, scaleY, clip, format: image.format, pixels: image.pixels.length });
    if (clip !== undefined) {
      this.events.push('save', 'beginPath', format('rect', clip.x, clip.y, clip.width, clip.height), 'clip');
    }
    const position = scaleX === 1 && scaleY === 1 ? [x, y] : [x, y, image.width * scaleX, image.height * scaleY];
    this.events.push(format('drawImage', ...position, `${image.width}x${image.height}`));
    if (clip !== undefined) {
      this.events.push('restore');
    }
  }

  fillRect(rect: Rect, color: Color): void {
    this.events.push(format('fillRect', rect.x, rect.y, rect.width, rect.height, Color.toCss(color)));
  }

  beginShadow(radius: number, dx: number, dy: number, color: Color): void {
    this.events.push('save', format('shadowColor', Color.toCss(color)), format('shadowBlur', radius),
      format('shadowOffsetX', dx), format('shadowOffsetY', dy));
  }

  endShadow(): void {
    this.events.push('restore');
  }
}

function drawFrame(scenario: DrawScenario, faces: Faces): { events: string[]; surface: Surface } {
  const events: string[] = [];
  const surface = new Surface(events);
  const prepared = prepare(library, faces, scenario, events);
  prepared.frame.draw(prepared.renderer, surface, scenario.origin[0], scenario.origin[1]);
  prepared.dispose();
  return { events, surface };
}

function makeFrame(faces: Faces, text = 'abc abc', width = 300): { frame: ComposedFrame; renderer: Renderer } {
  const typesetter = new Typesetter(text, { typeface: faces.roboto, typeSize: 20 });
  const resolver = new FrameResolver();
  resolver.typesetter = typesetter;
  resolver.frameWidth = width;
  resolver.frameHeight = 1000;
  const frame = resolver.createFrame(0, text.length);
  resolver.dispose();
  typesetter.dispose();
  const renderer = new Renderer();
  renderer.typeface = faces.roboto;
  renderer.typeSize = 20;
  return { frame, renderer };
}

type Test = [name: string, body: (b: NativeBindings) => void];

function hooks(b: NativeBindings): { state: NonNullable<NativeBindings['testGetDrawCallbacks']>; paint: NonNullable<NativeBindings['testSetNativeDrawCallbacks']>; count: () => number } {
  check(typeof b.testGetDrawCallbacks === 'function' && typeof b.testSetNativeDrawCallbacks === 'function' && typeof b.testGetHandlerCount === 'function',
    'the draw hooks are missing: this needs a debug build');
  return { state: b.testGetDrawCallbacks!, paint: b.testSetNativeDrawCallbacks!, count: () => { b.testDrainHandlers?.(); return b.testGetHandlerCount!(); } };
}

const matrix: Test[] = drawScenarios.map((scenario): Test => [
  `${scenario.name}: the calls equal what Tehreer-Web's canvas painter makes`,
  () => {
    const { events } = drawFrame(scenario, load());
    const expected = drawingExpected[scenario.name] as readonly string[];
    check(events.length === expected.length, `${events.length} calls, Tehreer-Web makes ${expected.length}`);
    const differences: string[] = [];
    expected.forEach((line, index) => {
      if (events[index] !== line && differences.length < 5) {
        differences.push(`#${index}: ${events[index]} is not ${line}`);
      }
    });
    check(differences.length === 0, differences.join('; '));
  },
]);

const tests: Test[] = [
  ...matrix,

  ['colors, scales and the pixels of the lent image are what the run asks for', () => {
    const faces = load();
    const { surface } = drawFrame(drawScenarios.find((s) => s.name === 'decorations')!, faces);
    check(surface.images.length === 3 && surface.images.every((image) => image.pixels > 0), `only a, b and c of the font have outlines: ${surface.images.length} images`);
    check(surface.images[0]!.color === 0xff0000ff && surface.images[1]!.color === 0xff0000ff, 'the foreground color of the run, as an unsigned number');
    check(surface.images.slice(2).length === 1 && surface.images.slice(2).every((image) => image.color === 0xff000000), 'the renderer\'s foreground for the rest');
    check(surface.images.every((image) => image.scaleX === 1 && image.scaleY === 1 && image.clip === undefined), 'no scale, no clip');
    check(surface.wrappers.every((wrapper) => wrapper.isDisposed), 'the wrappers are disposed after the draw');
    expectThrows(() => surface.wrappers[0]!.width, 'Error', /already disposed/);
  }],

  ['a line and a run draw what the frame draws', () => {
    const faces = load();
    const { frame, renderer } = makeFrame(faces);
    const whole = new Surface();
    frame.draw(renderer, whole, 5, 7);

    const line = frame.lines.get(0);
    const viaLine = new Surface();
    line.draw(renderer, viaLine, 5, 7);
    check(viaLine.events.join('|') === whole.events.join('|'), `line: ${viaLine.events.join('|')} vs ${whole.events.join('|')}`);

    const run = line.runs.get(0);
    const viaRun = new Surface();
    run.draw(renderer, viaRun, 5 + line.origin.x, 7 + line.origin.y);
    check(viaRun.events.join('|') === whole.events.join('|'), `run: ${viaRun.events.join('|')} vs ${whole.events.join('|')}`);
    for (const object of [run, line, frame, renderer]) {
      object.dispose();
    }
  }],

  ['the callbacks are on the renderer for the call and the ones from before are back after it', (b) => {
    const { state, paint } = hooks(b);
    const { frame, renderer } = makeFrame(load());
    const handle = renderer.nativeHandle;
    const none = { drawGlyphImage: false, drawGlyphPath: false, fillRect: false, drawReplacement: false, beginShadow: false, endShadow: false, isNativePainter: false, hasUserData: false };
    check(JSON.stringify(state(handle)) === JSON.stringify(none), 'a new renderer has no callbacks');

    const surface = new Surface();
    let whileDrawing = none;
    surface.drawGlyphImage = function (this: Surface, ...args: Parameters<Surface['drawGlyphImage']>) {
      whileDrawing = state(handle);
      Surface.prototype.drawGlyphImage.apply(this, args);
    };
    frame.draw(renderer, surface, 0, 0);
    check(whileDrawing.drawGlyphImage && whileDrawing.fillRect && whileDrawing.drawReplacement && whileDrawing.beginShadow && whileDrawing.endShadow && whileDrawing.hasUserData,
      `all five and the user data inside: ${JSON.stringify(whileDrawing)}`);
    check(!whileDrawing.drawGlyphPath && !whileDrawing.isNativePainter, 'no outlines, and not the native painter');
    check(JSON.stringify(state(handle)) === JSON.stringify(none), 'removed after the call');

    // A native painter's callbacks (as the views will install) are restored, also after an error.
    paint(handle, true);
    check(state(handle).isNativePainter, 'the native painter is installed');
    frame.draw(renderer, new Surface(), 0, 0);
    check(state(handle).isNativePainter && !state(handle).drawGlyphImage, 'back to the native painter after a draw');
    const failing = new Surface();
    failing.drawGlyphImage = () => { throw new Error('boom'); };
    expectThrows(() => frame.draw(renderer, failing, 0, 0), 'Error', /boom/);
    check(state(handle).isNativePainter, 'and after an error');
    expectThrows(() => frame.draw(renderer, {} as DrawingContext, 0, 0), 'TypeError');
    check(state(handle).isNativePainter, 'and after a context that was refused');
    paint(handle, false);

    frame.dispose();
    renderer.dispose();
  }],

  ['a surface with only one of beginShadow and endShadow gets no shadow scope', (b) => {
    const { state } = hooks(b);
    const { frame, renderer } = makeFrame(load(), 'abc');
    renderer.shadowRadius = 4;
    const recorder = new Surface();
    let inside = state(renderer.nativeHandle);
    const half = {
      drawGlyphImage: recorder.drawGlyphImage.bind(recorder),
      fillRect: (rect: Rect, color: Color) => { inside = state(renderer.nativeHandle); recorder.fillRect(rect, color); },
      beginShadow: recorder.beginShadow.bind(recorder),
    };
    // A background makes the fill callback run once, whatever the shadow does.
    const text = new TMutableText('abc');
    text.setAttributes(0, 3, { typeface: load().roboto, typeSize: 20, backgroundColor: 0xff00ff00 });
    const typesetter = new Typesetter(text);
    const resolver = new FrameResolver();
    resolver.typesetter = typesetter;
    resolver.frameWidth = 300;
    const shaded = resolver.createFrame(0, 3);
    shaded.draw(renderer, half, 0, 0);
    check(!inside.beginShadow && !inside.endShadow, `neither is installed: ${JSON.stringify(inside)}`);
    check(!recorder.events.includes('save'), 'and no scope was opened');
    check(recorder.events.filter((e) => e.startsWith('drawImage')).length === 3, 'the glyphs are drawn');

    const whole = new Surface();
    shaded.draw(renderer, whole, 0, 0);
    check(whole.events.includes('save') && whole.events.at(-1) === 'restore', 'with both, the scope is opened');
    for (const object of [shaded, resolver, typesetter, text, frame, renderer]) {
      object.dispose();
    }
  }],

  ['an error in a member stops the drawing, reaches the caller, leaves nothing behind, and drawing works after it', (b) => {
    const { state, count } = hooks(b);
    const { frame, renderer } = makeFrame(load());
    const before = count();

    const boom = new RangeError('canvas is lost');
    const surface = new Surface();
    surface.drawGlyphImage = function (this: Surface, ...args: Parameters<Surface['drawGlyphImage']>) {
      Surface.prototype.drawGlyphImage.apply(this, args);
      throw boom;
    };
    try {
      frame.draw(renderer, surface, 0, 0);
      throw new Error('nothing was thrown');
    } catch (e) {
      check(e === boom, `the very value that was thrown, got ${String(e)}`);
    }
    check(surface.images.length === 1, `no member is called after the failure: ${surface.images.length} images`);
    check(surface.wrappers.every((wrapper) => wrapper.isDisposed), 'the lent image is disposed on the error path');
    check(!state(renderer.nativeHandle).fillRect, 'the callbacks are removed');
    check(count() === before, `the handler is dropped: ${count()} vs ${before}`);

    const second = new Surface();
    frame.draw(renderer, second, 0, 0);
    check(second.events.length === 6, 'a second context draws everything');
    for (let index = 0; index < 5; index++) {
      expectThrows(() => frame.draw(renderer, Object.assign(new Surface(), { drawGlyphImage: () => { throw boom; } }), 0, 0), 'RangeError');
    }
    check(count() === before, 'repeated errors leak no handler');
    frame.dispose();
    renderer.dispose();
  }],

  ['a context that is not one is refused before anything is installed', (b) => {
    const { state } = hooks(b);
    const { frame, renderer } = makeFrame(load());
    const bad: unknown[] = [undefined, null, 5, {}, { fillRect() {} }, { drawGlyphImage() {} }, { drawGlyphImage() {}, fillRect: 1 }];
    for (const context of bad) {
      expectThrows(() => frame.draw(renderer, context as DrawingContext, 0, 0), 'TypeError');
    }
    expectThrows(() => frame.draw({} as Renderer, new Surface(), 0, 0), 'TypeError');
    expectThrows(() => frame.draw(renderer, new Surface(), NaN, 0), 'RangeError');
    check(!state(renderer.nativeHandle).fillRect, 'nothing stays installed after a refusal, also of a NaN origin');
    frame.dispose();
    renderer.dispose();
  }],

  ['a disposed run, line, frame or renderer throws', () => {
    const faces = load();
    const surface = new Surface();
    const { frame, renderer } = makeFrame(faces);
    const line = frame.lines.get(0);
    const run = line.runs.get(0);
    const other = new Renderer();
    other.typeface = faces.roboto;
    other.dispose();
    expectThrows(() => frame.draw(other, surface, 0, 0), 'Error', /already disposed/);
    for (const object of [run, line, frame]) {
      object.dispose();
      expectThrows(() => object.draw(renderer, surface, 0, 0), 'Error', /already disposed/);
    }
    check(surface.events.length === 0, 'nothing was drawn');
    renderer.dispose();
  }],

  ['a member that disposes the objects it is drawing with does not break the draw', () => {
    const { frame, renderer } = makeFrame(load());
    const surface = new Surface();
    surface.drawGlyphImage = function (this: Surface, ...args: Parameters<Surface['drawGlyphImage']>) {
      frame.dispose();
      renderer.dispose();
      Surface.prototype.drawGlyphImage.apply(this, args);
    };
    frame.draw(renderer, surface, 0, 0);
    check(surface.images.length === 6, 'every glyph was still drawn');
    check(frame.isDisposed && renderer.isDisposed, 'and the disposal took effect');
  }],

  ['a draw from a member goes to its own context, and the outer one continues', () => {
    const { frame, renderer } = makeFrame(load(), 'abc');
    const inner = new Surface();
    const outer = new Surface();
    const drawImage = outer.drawGlyphImage.bind(outer);
    let nested = false;
    outer.drawGlyphImage = (...args: Parameters<Surface['drawGlyphImage']>) => {
      if (!nested) {
        nested = true;
        frame.draw(renderer, inner, 0, 0);
      }
      drawImage(...args);
    };
    frame.draw(renderer, outer, 0, 0);
    check(inner.images.length === 3 && outer.images.length === 3, `${inner.images.length} inner and ${outer.images.length} outer glyphs`);
    frame.dispose();
    renderer.dispose();
  }],

  ['the replacement draw hook gets the context and the bounds in pixels, as the delegate', () => {
    const faces = load();
    const seen: { self: boolean; context: boolean; bounds: ReplacementBounds }[] = [];
    let surface = new Surface();
    class Box {
      computeRoom() { return { ascent: 12, descent: 4, extent: 30 }; }
      draw(context: DrawingContext, bounds: ReplacementBounds) { seen.push({ self: this === delegate, context: context === surface, bounds }); }
    }
    const delegate = new Box();
    const replacement = new Replacement(delegate);
    const text = new TMutableText('ab￼ab');
    text.setAttributes(0, 5, { typeface: faces.roboto, typeSize: 20 });
    text.setAttributes(2, 3, { replacement });
    const typesetter = new Typesetter(text);
    const resolver = new FrameResolver();
    resolver.typesetter = typesetter;
    resolver.frameWidth = 300;
    const frame = resolver.createFrame(0, 5);
    const renderer = new Renderer();
    renderer.typeface = faces.roboto;

    frame.draw(renderer, surface, 10, 20);
    renderer.renderScale = 2;
    const unscaled = seen[0]!.bounds;
    surface = new Surface();
    frame.draw(renderer, surface, 10, 20);
    check(seen.length === 2 && seen.every((s) => s.self && s.context), 'called as the delegate with the context that was drawn into');
    const scaled = seen[1]!.bounds;
    check(unscaled.ascent === 12 && unscaled.descent === 4 && unscaled.width === 30, `the room in pixels: ${JSON.stringify(unscaled)}`);
    check(scaled.ascent === 24 && scaled.descent === 8 && scaled.width === 60, `times the render scale: ${JSON.stringify(scaled)}`);
    check(scaled.x > unscaled.x && scaled.y > unscaled.y, 'and the position');

    for (const object of [frame, renderer, resolver, typesetter, text, replacement]) {
      object.dispose();
    }
  }],

  ['a replacement without draw draws nothing, and an error from its draw is thrown from the draw call', (b) => {
    const { count } = hooks(b);
    const faces = load();
    const build = (replacement: Replacement) => {
      const text = new TMutableText('ab￼ab');
      text.setAttributes(0, 5, { typeface: faces.roboto, typeSize: 20 });
      text.setAttributes(2, 3, { replacement });
      const typesetter = new Typesetter(text);
      const resolver = new FrameResolver();
      resolver.typesetter = typesetter;
      resolver.frameWidth = 300;
      const frame = resolver.createFrame(0, 5);
      resolver.dispose();
      typesetter.dispose();
      text.dispose();
      return frame;
    };
    const renderer = new Renderer();
    renderer.typeface = faces.roboto;

    const quiet = new Replacement({ computeRoom: () => ({ ascent: 1, descent: 1, extent: 10 }) });
    const quietFrame = build(quiet);
    const surface = new Surface();
    quietFrame.draw(renderer, surface, 0, 0);
    check(surface.images.length === 4, 'the text around it is drawn');

    const boom = new TypeError('replacement boom');
    const loud = new Replacement({ computeRoom: () => ({ ascent: 1, descent: 1, extent: 10 }), draw() { throw boom; } });
    const loudFrame = build(loud);
    const before = count();
    try {
      loudFrame.draw(renderer, new Surface(), 0, 0);
      throw new Error('nothing was thrown');
    } catch (e) {
      check(e === boom, `the very value that the draw threw, got ${String(e)}`);
    }
    check(count() === before, 'no handler is left behind');
    for (const object of [quietFrame, loudFrame, renderer, quiet, loud]) {
      object.dispose();
    }
  }],

  ['a draw leaves no handler or reference behind', (b) => {
    const { count } = hooks(b);
    const { frame, renderer } = makeFrame(load());
    const before = count();
    for (let index = 0; index < 20; index++) {
      frame.draw(renderer, new Surface(), 0, 0);
    }
    check(count() === before, 'the table is as it was');
    frame.dispose();
    renderer.dispose();
    check(b.smokeTest(), 'Core still works');
  }],
];

export function runDrawingTests(bindings: NativeBindings): TestResult {
  const result = { passed: 0, failures: [] as string[] };
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

export const drawingTestCount = tests.length;
