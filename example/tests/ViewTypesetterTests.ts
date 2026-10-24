import type { NativeBindings } from '../../src/internal/NativeBindings';
import type { Handle } from '../../src/internal/NativeFunctions';
import type { DrawingContext } from '../../src/drawing/DrawingContext';
import { DrawStyle, StrokeCap, StrokeJoin } from '../../src/graphics/enums';
import { Renderer } from '../../src/graphics/Renderer';
import { Typeface } from '../../src/graphics/Typeface';
import { toNativeRenderer } from '../../src/views/shared';
import { FrameResolver } from '../../src/layout/FrameResolver';
import { Replacement } from '../../src/layout/Replacement';
import { ReplacementKind } from '../../src/layout/enums';
import { TMutableText } from '../../src/layout/TMutableText';
import { Typesetter } from '../../src/layout/Typesetter';
import { ViewTypesetter } from '../../src/views/ViewTypesetter';
import { fontBytes, nastaliqFontBytes } from './fontData';

// The typesetter of the views (issues #27 and #29) against the real bindings: what is registered for
// the native side, the replacements that become holders so that Core can lay them out on a thread
// that cannot run JavaScript, and that every native object goes with its owner. Rendering is in
// LabelTests.tsx.

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

function makeTypeface(b: NativeBindings, bytes: Uint8Array): Typeface {
  const file = b.TRFontFileCreateFromMemory(bytes, bytes.byteLength);
  check(file !== undefined, 'the font cannot be loaded');
  const typeface = b.TRFontFileGetTypeface(file as Handle<'TRFontFile'>, 0);
  b.disposeHandle(file as Handle<'TRFontFile'>);
  check(typeface !== undefined, 'the font has no typeface');
  return Typeface.adopting(typeface as Handle<'TRTypeface'>);
}

function counts(b: NativeBindings): { typesetters: number; replacements: number } {
  check(typeof b.testGetViewCounts === 'function', 'testGetViewCounts is missing: this needs a debug build');
  // Release what only the garbage collector still holds before counting.
  b.testCollectGarbage?.();
  return b.testGetViewCounts!();
}

/** A view typesetter that has to exist. */
function create(source: Parameters<typeof ViewTypesetter.create>[0], layoutWidth: number): ViewTypesetter {
  const made = ViewTypesetter.create(source, layoutWidth);
  check(made !== undefined, 'a typesetter was expected');
  return made as ViewTypesetter;
}

const URDU = 'تحریر ایک متنی انجن ہے';

/** A delegate with a fixed room whose drawing is two filled rectangles, and which records how it was asked. */
function chip(extent: number, log: number[] = []) {
  return {
    log,
    computeRoom(layoutWidth: number) {
      log.push(layoutWidth);
      return { ascent: 12, descent: 4, extent };
    },
    draw(context: DrawingContext) {
      context.fillRect({ x: 0, y: -12, width: extent, height: 16 }, 0xff3366cc);
      context.fillRect({ x: 2, y: -10, width: extent - 4, height: 12 }, 0x80ffffff);
    },
  };
}

type Test = [name: string, body: (b: NativeBindings) => void];

const tests: Test[] = [
  ['a typesetter is registered for the native side and released with its owner', (b) => {
    const before = counts(b);
    const typeface = makeTypeface(b, fontBytes);
    const plain = create({ text: 'hello', typeface, textSize: 16 }, 0);
    check(plain.id > 0 && !plain.hasReplacements, 'plain text has an id and no replacement');
    const attributed = new TMutableText('abc');
    attributed.setAttributes(0, 1, { typeSize: 30 });
    const second = create({ attributedText: attributed, typeface, textSize: 16 }, 0);
    check(second.id !== plain.id, 'ids differ');
    check(counts(b).typesetters === before.typesetters + 2, 'both are registered');
    // The typesetter copied the text, so editing the original later changes nothing.
    attributed.append('d');
    check(second.typesetter.codeUnitCount === 3, 'the typesetter has the text it was made from');
    attributed.dispose();
    plain.dispose();
    plain.dispose();
    second.dispose();
    check(counts(b).typesetters === before.typesetters, 'disposing releases the table share, once');
    typeface.dispose();
  }],

  ['an empty text and a text without a typeface give a typesetter that lays out nothing', (b) => {
    const face = makeTypeface(b, fontBytes);
    const empty = create({ text: '', typeface: face, textSize: 16 }, 0);
    check(empty.typesetter.codeUnitCount === 0, 'empty text');
    empty.dispose();
    face.dispose();
    check(ViewTypesetter.create({ text: 'x', textSize: 16 }, 0) === undefined, 'a plain text without a typeface shows nothing, as in the other wrappers');
    check(counts(b).typesetters >= 0, 'counts still readable');
  }],

  ['a replacement becomes a holder: its room is asked once and its drawing is recorded', (b) => {
    const typeface = makeTypeface(b, fontBytes);
    const delegate = chip(40);
    const original = new Replacement(delegate, ReplacementKind.Inline);
    const text = new TMutableText('a￼b');
    text.setAttributes(1, 2, { replacement: original });
    const before = counts(b);

    const made = create({ attributedText: text, typeface, textSize: 16 }, 123);
    check(made.hasReplacements, 'it knows about the replacement');
    check(delegate.log.length === 1 && delegate.log[0] === 123, `computeRoom is asked once with the layout width, got ${JSON.stringify(delegate.log)}`);
    check(counts(b).replacements === before.replacements + 1, 'one holder is alive');
    check(!made.roomsDifferAt(200) && delegate.log[delegate.log.length - 1] === 200, 'rooms are compared by asking again');

    made.dispose();
    text.dispose();
    original.dispose();
    typeface.dispose();
    check(counts(b).replacements === before.replacements, 'the holder is released with the typesetter');
  }],

  ['a delegate whose room depends on the width makes roomsDifferAt true', (b) => {
    const typeface = makeTypeface(b, fontBytes);
    const original = new Replacement({ computeRoom: (w) => ({ ascent: 5, descent: 1, extent: w / 2 }) }, ReplacementKind.Block);
    const text = new TMutableText('￼');
    text.setAttributes(0, 1, { replacement: original });
    const made = create({ attributedText: text, typeface, textSize: 16 }, 100);
    check(made.roomsDifferAt(300), 'a block that takes half the width differs at another width');
    check(!made.roomsDifferAt(100), 'and not at the same one');
    made.dispose();
    text.dispose();
    original.dispose();
    typeface.dispose();
  }],

  ['a holder is laid out by Core with its fixed room, also on another thread, and frees nothing early', (b) => {
    const typeface = makeTypeface(b, fontBytes);
    const before = counts(b);
    const handle = b.createReplacementHolder(ReplacementKind.Inline, 12, 4, 40, [0, -12, 40, 16, 0xff3366cc]);
    check(handle !== undefined, 'created');
    const replacement = Replacement.adopting(handle as Handle<'TRReplacement'>);
    const room = replacement.computeRoom(500);
    check(room.ascent === 12 && room.descent === 4 && room.extent === 40, `room ${JSON.stringify(room)}`);
    // A JavaScript replacement gets zero there; a holder has no JavaScript to wait for.
    if (typeof b.testComputeRoomOnOtherThread === 'function') {
      const other = b.testComputeRoomOnOtherThread(replacement.nativeHandle, 500);
      check(other.extent === 40 && other.ascent === 12, `off-thread room ${JSON.stringify(other)}`);
    }

    const text = new TMutableText('ab￼cd');
    text.setAttributes(2, 3, { replacement });
    const typesetter = new Typesetter(text, { typeface, typeSize: 20 });
    const resolver = new FrameResolver();
    resolver.typesetter = typesetter;
    resolver.frameWidth = 1000;
    resolver.frameHeight = Infinity;
    resolver.fitsVertically = true;
    const frame = resolver.createFrame(0, text.length);
    const line = frame.lines.get(0);
    let found = 0;
    for (let i = 0; i < line.runs.length; i++) {
      const run = line.runs.get(i);
      const attached = run.replacement;
      if (attached !== undefined) {
        found++;
        check(Math.abs(run.width - 40) < 1e-3, `the run is as wide as the room: ${run.width}`);
        attached.dispose();
      }
      run.dispose();
    }
    check(found === 1, `one run holds the replacement, got ${found}`);
    line.dispose();
    frame.dispose();
    resolver.dispose();
    typesetter.dispose();
    text.dispose();
    replacement.dispose();
    typeface.dispose();
    check(counts(b).replacements === before.replacements, `a laid out holder leaked: ${JSON.stringify(counts(b))} after ${JSON.stringify(before)}`);
  }],

  ['a delegate that draws a glyph image, or gives a bad room, fails the call and leaks nothing', (b) => {
    const typeface = makeTypeface(b, fontBytes);
    const before = counts(b);

    const drawsImage = new Replacement({
      computeRoom: () => ({ ascent: 1, descent: 1, extent: 10 }),
      draw: (context) => context.drawGlyphImage(undefined as never, 0, 0, 1, 1, 0, undefined),
    });
    const t1 = new TMutableText('￼');
    t1.setAttributes(0, 1, { replacement: drawsImage });
    expectThrows(() => ViewTypesetter.create({ attributedText: t1, typeface, textSize: 16 }, 0), 'Error', /fill rectangles only/);

    const bad = new Replacement({ computeRoom: () => ({ ascent: -1, descent: 1, extent: 10 }) });
    const t2 = new TMutableText('￼');
    t2.setAttributes(0, 1, { replacement: bad });
    expectThrows(() => ViewTypesetter.create({ attributedText: t2, typeface, textSize: 16 }, 0), 'RangeError');

    const throwing = new Replacement({ computeRoom: () => { throw new TypeError('delegate failed'); } });
    const t3 = new TMutableText('￼');
    t3.setAttributes(0, 1, { replacement: throwing });
    expectThrows(() => ViewTypesetter.create({ attributedText: t3, typeface, textSize: 16 }, 0), 'TypeError', /delegate failed/);

    for (const object of [t1, t2, t3, drawsImage, bad, throwing, typeface]) {
      object.dispose();
    }
    const after = counts(b);
    check(after.typesetters === before.typesetters && after.replacements === before.replacements, `leaked ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  }],

  ['Urdu and mixed text get a typesetter with their own typeface attributes', (b) => {
    const roboto = makeTypeface(b, fontBytes);
    const nastaliq = makeTypeface(b, nastaliqFontBytes);
    const text = new TMutableText(`abc ${URDU} def`);
    text.setAttributes(4, 4 + URDU.length, { typeface: nastaliq, typeSize: 24 });
    const made = create({ attributedText: text, typeface: roboto, textSize: 16 }, 0);
    check(made.id > 0 && made.typesetter.codeUnitCount === text.length, 'made');
    made.dispose();
    text.dispose();
    roboto.dispose();
    nastaliq.dispose();
  }],

  ['the renderer props reach Core as given, and what was not given is Core\'s default again', (b) => {
    check(typeof b.testApplyRendererSettings === 'function', 'testApplyRendererSettings is missing: this needs a debug build');
    const apply = (renderer: Renderer, props: Parameters<typeof toNativeRenderer>[0]) => {
      const { ints, floats } = toNativeRenderer(props);
      b.testApplyRendererSettings!(renderer.nativeHandle, ints, floats);
    };
    const near = (a: number, c: number) => Math.abs(a - c) < 1e-4;

    const defaults = new Renderer();
    const renderer = new Renderer();
    apply(renderer, {
      textColor: '#80112233', drawStyle: DrawStyle.FillStroke, strokeColor: 0xff336699, strokeRadius: 1.5, strokeCap: StrokeCap.Round,
      strokeJoin: StrokeJoin.Bevel, strokeMiter: 3, shadowColor: 0x66000000, shadowRadius: 2, shadowDx: 3, shadowDy: -4,
    });
    check(renderer.foregroundColor === 0x80112233, `foreground ${renderer.foregroundColor.toString(16)}`);
    check(renderer.drawStyle === DrawStyle.FillStroke, `draw style ${renderer.drawStyle}`);
    check(renderer.strokeColor === 0xff336699, `stroke color ${renderer.strokeColor.toString(16)}`);
    check(near(renderer.strokeRadius, 1.5) && renderer.strokeCap === StrokeCap.Round && renderer.strokeJoin === StrokeJoin.Bevel && near(renderer.strokeMiter, 3), 'stroke');
    check(renderer.shadowColor === 0x66000000 && near(renderer.shadowRadius, 2) && near(renderer.shadowDx, 3) && near(renderer.shadowDy, -4), 'shadow');

    // The same renderer given less gets Core's defaults, and keeps nothing of what it had.
    apply(renderer, { textColor: 0xff000000, strokeRadius: 2 });
    check(renderer.foregroundColor === 0xff000000, 'foreground again');
    check(renderer.drawStyle === defaults.drawStyle && renderer.strokeColor === defaults.strokeColor && renderer.strokeCap === defaults.strokeCap, 'defaults of draw style and stroke');
    check(near(renderer.strokeRadius, 2) && near(renderer.strokeMiter, defaults.strokeMiter) && renderer.strokeJoin === defaults.strokeJoin, 'only the stroke radius is given');
    check(renderer.shadowColor === defaults.shadowColor && near(renderer.shadowRadius, defaults.shadowRadius) && near(renderer.shadowDx, defaults.shadowDx) && near(renderer.shadowDy, defaults.shadowDy), 'shadow defaults');
    renderer.dispose();
    defaults.dispose();
  }],

  ['an unknown id is ignored by unregister, an invalid one is refused, and a handle that is not a typesetter too', (b) => {
    b.unregisterTypesetter(2000000000);
    expectThrows(() => b.unregisterTypesetter(-1.5), 'RangeError');
    const typeface = makeTypeface(b, fontBytes);
    expectThrows(() => b.registerTypesetter(typeface.nativeHandle as unknown as Handle<'TRTypesetter'>), 'Error');
    typeface.dispose();
  }],
];

export function runViewTypesetterTests(bindings: NativeBindings): { passed: number; failures: string[] } {
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

export const viewTypesetterTestCount = tests.length;
