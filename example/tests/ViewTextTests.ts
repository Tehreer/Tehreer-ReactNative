import type { NativeBindings } from '../../src/internal/NativeBindings';
import type { Handle } from '../../src/internal/NativeFunctions';
import type { DrawingContext } from '../../src/drawing/DrawingContext';
import { Typeface } from '../../src/graphics/Typeface';
import { FrameResolver } from '../../src/layout/FrameResolver';
import { Replacement } from '../../src/layout/Replacement';
import { ReplacementKind } from '../../src/layout/enums';
import { TMutableText } from '../../src/layout/TMutableText';
import { Typesetter } from '../../src/layout/Typesetter';
import { ViewText } from '../../src/views/ViewText';
import { fontBytes, nastaliqFontBytes } from './fontData';

// The text of the views (issues #27 and #29) against the real bindings: what is registered for the
// shadow node, the replacements that are made static so that Core can measure them on a thread that
// cannot run JavaScript, and that every native object is released when its owner is. Rendering is
// in ViewTests.tsx.

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

function counts(b: NativeBindings): { texts: number; replacements: number } {
  check(typeof b.testGetViewCounts === 'function', 'testGetViewCounts is missing: this needs a debug build');
  // Release what only the garbage collector still holds before counting.
  b.testCollectGarbage?.();
  return b.testGetViewCounts!();
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
  ['plain and attributed text are registered and released', (b) => {
    const before = counts(b);
    const typeface = makeTypeface(b, fontBytes);
    const plain = ViewText.create({ text: 'hello', typeface, textSize: 16 }, 0);
    check(plain.id > 0 && !plain.hasReplacements, 'plain text has an id and no replacement');
    const attributed = new TMutableText('abc');
    attributed.setAttributes(0, 1, { typeSize: 30 });
    const second = ViewText.create({ attributedText: attributed, typeface, textSize: 16 }, 0);
    check(second.id !== plain.id, 'ids differ');
    check(counts(b).texts === before.texts + 2, 'both are registered');
    // The registry copied the text, so editing the original later changes nothing registered.
    attributed.append('d');
    attributed.dispose();
    plain.dispose();
    plain.dispose();
    second.dispose();
    check(counts(b).texts === before.texts, 'disposing releases the registry share, once');
    typeface.dispose();
  }],

  ['an empty text and a text without a typeface are registered; the shadow node decides what they show', (b) => {
    const empty = ViewText.create({ text: '', textSize: 16 }, 0);
    check(empty.id > 0, 'empty text');
    empty.dispose();
    const noFace = ViewText.create({ text: 'x', textSize: 16 }, 0);
    check(noFace.id > 0, 'no typeface');
    noFace.dispose();
    check(counts(b).texts >= 0, 'counts still readable');
  }],

  ['a replacement is made static: its room is asked once and its drawing is recorded', (b) => {
    const typeface = makeTypeface(b, fontBytes);
    const delegate = chip(40);
    const original = new Replacement(delegate, ReplacementKind.Inline);
    const text = new TMutableText('a￼b');
    text.setAttributes(1, 2, { replacement: original });
    const before = counts(b);

    const viewText = ViewText.create({ attributedText: text, typeface, textSize: 16 }, 123);
    check(viewText.hasReplacements, 'it knows about the replacement');
    check(delegate.log.length === 1 && delegate.log[0] === 123, `computeRoom is asked once with the layout width, got ${JSON.stringify(delegate.log)}`);
    check(counts(b).replacements === before.replacements + 1, 'one static replacement is alive');

    // The same width gives the same rooms; another width asks again and notices no change.
    check(!viewText.roomsDifferAt(200) && delegate.log[delegate.log.length - 1] === 200, 'rooms are compared by asking again');

    viewText.dispose();
    text.dispose();
    original.dispose();
    typeface.dispose();
    check(counts(b).replacements === before.replacements, 'the static replacement is released with the text');
  }],

  ['a delegate whose room depends on the width makes roomsDifferAt true', (b) => {
    const typeface = makeTypeface(b, fontBytes);
    const original = new Replacement({ computeRoom: (w) => ({ ascent: 5, descent: 1, extent: w / 2 }) }, ReplacementKind.Block);
    const text = new TMutableText('￼');
    text.setAttributes(0, 1, { replacement: original });
    const viewText = ViewText.create({ attributedText: text, typeface, textSize: 16 }, 100);
    check(viewText.roomsDifferAt(300), 'a block that takes half the width differs at another width');
    check(!viewText.roomsDifferAt(100), 'and not at the same one');
    viewText.dispose();
    text.dispose();
    original.dispose();
    typeface.dispose();
  }],

  ['a static replacement is laid out by Core with its fixed room, also on another thread', (b) => {
    const typeface = makeTypeface(b, fontBytes);
    const handle = b.createStaticReplacement(ReplacementKind.Inline, 12, 4, 40, [0, -12, 40, 16, 0xff3366cc]);
    check(handle !== undefined, 'created');
    const replacement = Replacement.adopting(handle as Handle<'TRReplacement'>);
    const room = replacement.computeRoom(500);
    check(room.ascent === 12 && room.descent === 4 && room.extent === 40, `room ${JSON.stringify(room)}`);
    // A JavaScript replacement gets zero there; a static one has no JavaScript to wait for.
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
  }],

  ['a replacement made in JavaScript is refused by the registry', (b) => {
    const typeface = makeTypeface(b, fontBytes);
    const js = new Replacement({ computeRoom: () => ({ ascent: 1, descent: 1, extent: 10 }) });
    const text = new TMutableText('a￼b');
    text.setAttributes(1, 2, { replacement: js });
    const before = counts(b);
    const copy = text.copy();
    const id = b.registerViewText(copy.nativeHandle, typeface.nativeHandle, 16);
    copy.dispose();
    check(id === 0, 'a JavaScript replacement cannot be measured on the layout thread');
    check(counts(b).texts === before.texts, 'nothing was registered');
    text.dispose();
    js.dispose();
    typeface.dispose();
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
    expectThrows(() => ViewText.create({ attributedText: t1, typeface, textSize: 16 }, 0), 'Error', /fill rectangles only/);

    const bad = new Replacement({ computeRoom: () => ({ ascent: -1, descent: 1, extent: 10 }) });
    const t2 = new TMutableText('￼');
    t2.setAttributes(0, 1, { replacement: bad });
    expectThrows(() => ViewText.create({ attributedText: t2, typeface, textSize: 16 }, 0), 'RangeError');

    const throwing = new Replacement({ computeRoom: () => { throw new TypeError('delegate failed'); } });
    const t3 = new TMutableText('￼');
    t3.setAttributes(0, 1, { replacement: throwing });
    expectThrows(() => ViewText.create({ attributedText: t3, typeface, textSize: 16 }, 0), 'TypeError', /delegate failed/);

    for (const object of [t1, t2, t3, drawsImage, bad, throwing, typeface]) {
      object.dispose();
    }
    const after = counts(b);
    check(after.texts === before.texts && after.replacements === before.replacements, `leaked ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  }],

  ['Urdu and mixed text register with their own typeface attributes', (b) => {
    const roboto = makeTypeface(b, fontBytes);
    const nastaliq = makeTypeface(b, nastaliqFontBytes);
    const text = new TMutableText(`abc ${URDU} def`);
    text.setAttributes(4, 4 + URDU.length, { typeface: nastaliq, typeSize: 24 });
    const viewText = ViewText.create({ attributedText: text, typeface: roboto, textSize: 16 }, 0);
    check(viewText.id > 0, 'registered');
    viewText.dispose();
    text.dispose();
    roboto.dispose();
    nastaliq.dispose();
  }],

  ['an unknown id is ignored by unregister, and a frame id that is gone is undefined', (b) => {
    b.unregisterViewText(4000000000);
    check(b.acquireViewFrame(4000000000) === undefined, 'no frame');
    check(b.acquireViewFrame(0) === undefined, 'no frame for 0');
    expectThrows(() => b.unregisterViewText(-1), 'RangeError');
  }],
];

export function runViewTextTests(bindings: NativeBindings): { passed: number; failures: string[] } {
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

export const viewTextTestCount = tests.length;
