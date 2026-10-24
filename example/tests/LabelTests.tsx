import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontFile } from '../../src/graphics/FontFile';
import type { Typeface } from '../../src/graphics/Typeface';
import type { ComposedFrame } from '../../src/layout/ComposedFrame';
import { FrameResolver } from '../../src/layout/FrameResolver';
import { Replacement } from '../../src/layout/Replacement';
import { BreakMode, ReplacementKind, TextAlignment, TruncationPlace } from '../../src/layout/enums';
import { TMutableText } from '../../src/layout/TMutableText';
import { Typesetter } from '../../src/layout/Typesetter';
import type { TText } from '../../src/layout/TText';
import { TLabel } from '../../src/views/TLabel';
import type { TLabelHandle } from '../../src/views/TLabel';
import { TTextView } from '../../src/views/TTextView';
import type { TTextViewHandle } from '../../src/views/TTextView';
import { getNativeBindings } from '../../src/internal/NativeBindings';
import type { Rect } from '../../src/geometry';
import { fontBytes, nastaliqFontBytes } from './fontData';
import type { SuiteReport } from './runSuites';

// The suite of issues #27 to #29: TLabel and TTextView rendered. Each label case compares the frame
// that the native view paints (acquired by the id in its onFrameReady) with the frame that the
// JavaScript API makes for the same text and settings, line by line, which is the proof that the
// props reach Core's settings unchanged. The text view is driven through its handle: hit testing and
// carets are checked against selection rectangles, and scrolling must not lay the text out again.

export const labelSuiteName = 'labels';

const URDU = 'تحریر ایک متنی انجن ہے';
const LATIN = 'abc abc abc abc abc abc abc abc';

interface Setup {
  roboto: Typeface;
  nastaliq: Typeface;
}

interface LabelCase {
  name: string;
  width: number;
  size: number;
  face: 'roboto' | 'nastaliq';
  align?: TextAlignment;
  maxLines?: number;
  truncate?: TruncationPlace;
  color?: number;
  text?: string;
  /** Builds attributed text; the host owns and disposes it. */
  attributed?: (setup: Setup) => TText;
  /** The room of the inline replacement in the text, to check its run. */
  replacementExtent?: number;
}

function mixed(setup: Setup): TText {
  const text = new TMutableText(`Hello ${URDU} world 123 ${URDU}`);
  const first = 'Hello '.length;
  text.setAttributes(first, first + URDU.length, { typeface: setup.nastaliq, typeSize: 28 });
  const second = text.length - URDU.length;
  text.setAttributes(second, text.length, { typeface: setup.nastaliq, typeSize: 22, foregroundColor: 0xffaa0000 });
  return text;
}

function withChip(extent: number) {
  return (): TText => {
    const original = new Replacement({
      computeRoom: () => ({ ascent: 14, descent: 4, extent }),
      draw: (context) => context.fillRect({ x: 0, y: -14, width: extent, height: 18 }, 0xff2255cc),
    });
    const text = new TMutableText('ab ￼ cd ef gh ij');
    text.setAttributes(3, 4, { replacement: original });
    // Core keeps the replacement as an attribute, so the wrapper is not needed any more.
    original.dispose();
    return text;
  };
}

const labelCases: readonly LabelCase[] = [
  { name: 'left', text: LATIN, face: 'roboto', size: 20, width: 120, align: TextAlignment.Left },
  { name: 'center', text: LATIN, face: 'roboto', size: 20, width: 120, align: TextAlignment.Center },
  { name: 'right', text: LATIN, face: 'roboto', size: 20, width: 120, align: TextAlignment.Right, color: 0xff1155cc },
  { name: 'urdu-leading', text: URDU, face: 'nastaliq', size: 30, width: 150 },
  { name: 'urdu-left', text: URDU, face: 'nastaliq', size: 30, width: 150, align: TextAlignment.Left },
  { name: 'mixed', attributed: mixed, face: 'roboto', size: 20, width: 170 },
  { name: 'maxlines-truncate-end', text: LATIN, face: 'roboto', size: 20, width: 100, maxLines: 2, truncate: TruncationPlace.End },
  { name: 'truncate-middle', text: LATIN, face: 'roboto', size: 20, width: 100, maxLines: 1, truncate: TruncationPlace.Middle },
  { name: 'urdu-truncate', text: `${URDU} ${URDU} ${URDU}`, face: 'nastaliq', size: 26, width: 140, maxLines: 2, truncate: TruncationPlace.End },
  { name: 'replacement', attributed: withChip(40), face: 'roboto', size: 18, width: 160, replacementExtent: 40 },
];

interface Seen {
  /** The first event was a frame without lines, which is what Android sent before the real one. */
  emptyFirst?: boolean;
  layout?: { width: number; height: number };
  frameId?: number;
  events: number;
}

const near = (a: number, b: number, tolerance = 0.02) => Math.abs(a - b) <= tolerance;

function rectContains(rect: Rect, x: number, y: number): boolean {
  const slack = 0.51;
  return x >= rect.x - slack && x <= rect.x + rect.width + slack && y >= rect.y - slack && y <= rect.y + rect.height + slack;
}

function waitFor(condition: () => boolean, timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    const started = Date.now();
    const timer = setInterval(() => {
      if (condition()) {
        clearInterval(timer);
        resolve(true);
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        resolve(false);
      }
    }, 50);
  });
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Makes the frame with the JavaScript API for the box that the view was laid out in. */
function expectedFrame(testCase: LabelCase, setup: Setup, text: string | TText, box: { width: number; height: number }, scrollable: boolean): ComposedFrame {
  const typeface = testCase.face === 'roboto' ? setup.roboto : setup.nastaliq;
  const typesetter = new Typesetter(text, { typeface, typeSize: testCase.size });
  const resolver = new FrameResolver();
  try {
    resolver.typesetter = typesetter;
    resolver.frameWidth = box.width + 0.01;
    resolver.frameHeight = scrollable ? Infinity : box.height + 0.01;
    resolver.fitsHorizontally = false;
    resolver.fitsVertically = scrollable;
    resolver.textAlignment = testCase.align ?? TextAlignment.Leading;
    if (testCase.maxLines !== undefined) {
      resolver.maxLines = testCase.maxLines;
    }
    if (testCase.truncate !== undefined) {
      resolver.isTruncationEnabled = true;
      resolver.truncationPlace = testCase.truncate;
      resolver.truncationMode = BreakMode.Line;
    }
    const length = typeof text === 'string' ? text.length : text.length;
    return resolver.createFrame(0, length);
  } finally {
    resolver.dispose();
    typesetter.dispose();
  }
}

export function LabelTestHost({ onDone }: { onDone: (report: SuiteReport) => void }) {
  const [setup, setSetup] = useState<Setup | undefined>();
  const [texts, setTexts] = useState<Record<string, TText>>({});
  const [stage, setStage] = useState<'labels' | 'views' | 'cycle' | 'gone'>('labels');
  const [cycling, setCycling] = useState(false);
  const [cyclePlain, setCyclePlain] = useState(false);
  const [width, setWidth] = useState(300);
  const [selection, setSelection] = useState<{ fromIndex: number; toIndex: number } | undefined>();
  const [longText, setLongText] = useState<TText | undefined>();
  const [chipText, setChipText] = useState<TText | undefined>();
  const seen = useRef<Record<string, Seen>>({});
  const handles = useRef<Record<string, TLabelHandle | null>>({});
  const viewHandle = useRef<TTextViewHandle | null>(null);
  const chipHandle = useRef<TTextViewHandle | null>(null);
  const view = useRef<{ events: number; frameId: number; offsets: number[]; lastOffset: number; chipFrame: number }>({ events: 0, frameId: 0, offsets: [], lastOffset: -1, chipFrame: 0 });
  const started = useRef(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (stage !== 'gone') {
      return undefined;
    }
    const timer = setInterval(() => setTick((value) => value + 1), 100);
    return () => clearInterval(timer);
  }, [stage]);
  // Counted before anything of this suite is registered.
  const baselineRef = useRef<{ texts: number; replacements: number } | undefined>(undefined);

  useEffect(() => {
    baselineRef.current = getNativeBindings().testGetViewCounts?.();
    const files = [new FontFile(fontBytes), new FontFile(nastaliqFontBytes)];
    const made: Setup = { roboto: files[0]!.typefaces.get(0), nastaliq: files[1]!.typefaces.get(0) };
    const built: Record<string, TText> = {};
    for (const testCase of labelCases) {
      if (testCase.attributed !== undefined) {
        built[testCase.name] = testCase.attributed(made);
      }
    }
    // Thirty paragraphs of Latin with a run of Urdu in each: long enough to scroll many screens.
    const long = new TMutableText('');
    for (let index = 0; index < 120; index++) {
      const lead = `${index}: ${LATIN} `;
      const at = long.length;
      long.append(`${lead}${URDU}\n`);
      long.setAttributes(at + lead.length, at + lead.length + URDU.length, { typeface: made.nastaliq, typeSize: 20 });
    }
    setSetup(made);
    setTexts(built);
    setLongText(long);
    setChipText(withChip(36)());
    return () => {
      Object.values(built).forEach((text) => text.dispose());
      long.dispose();
    };
  }, []);

  useEffect(() => {
    if (setup === undefined || longText === undefined || chipText === undefined || started.current) {
      return;
    }
    started.current = true;
    const failures: string[] = [];
    let total = 0;
    const ok = (condition: boolean, message: string) => {
      total++;
      if (!condition) {
        failures.push(message);
      }
    };
    const b = getNativeBindings();
    const baseline = baselineRef.current;

    (async () => {
      // Labels: wait until every one has its layout and its frame.
      const ready = await waitFor(() => labelCases.every((c) => seen.current[c.name]?.frameId));
      ok(ready, 'labels: not every label received a frame');

      for (const testCase of labelCases) {
        const entry = seen.current[testCase.name];
        if (entry?.layout === undefined || !entry.frameId) {
          ok(false, `${testCase.name}: no layout or frame`);
          continue;
        }
        ok(entry.emptyFirst !== true, `${testCase.name}/events: the first onFrameReady was an empty frame`);
        const handle = handles.current[testCase.name];
        const actual = handle?.getComposedFrame();
        if (actual === undefined) {
          ok(false, `${testCase.name}: the frame of the view is gone`);
          continue;
        }
        const source: string | TText = testCase.text ?? (texts[testCase.name] as TText);
        const expected = expectedFrame(testCase, setup, source, entry.layout, false);
        try {
          ok(actual.lines.length === expected.lines.length && actual.lines.length > 0,
            `${testCase.name}/lines: the view has ${actual.lines.length}, the API ${expected.lines.length}`);
          let difference = '';
          for (let i = 0; difference === '' && i < Math.min(actual.lines.length, expected.lines.length); i++) {
            const a = actual.lines.get(i);
            const e = expected.lines.get(i);
            if (!(a.startIndex === e.startIndex && a.endIndex === e.endIndex && near(a.origin.x, e.origin.x) && near(a.origin.y, e.origin.y) && a.isTruncated === e.isTruncated)) {
              difference = `line ${i}: view ${a.startIndex}-${a.endIndex} at ${a.origin.x},${a.origin.y} truncated ${a.isTruncated}; API ${e.startIndex}-${e.endIndex} at ${e.origin.x},${e.origin.y} truncated ${e.isTruncated}`;
            }
            a.dispose();
            e.dispose();
          }
          ok(difference === '', `${testCase.name}/geometry: ${difference}`);
          if (testCase.truncate !== undefined) {
            const last = actual.lines.get(actual.lines.length - 1);
            ok(last.isTruncated, `${testCase.name}/truncation: the last line is not truncated`);
            last.dispose();
          }
          // Hit testing agrees with the selection rectangles of the very same frame, also for Urdu.
          let disagreements = 0;
          let firstBad = '';
          const length = actual.endIndex;
          for (let i = actual.startIndex; i < length; i++) {
            const rects = handle!.getSelectionRects(i, i + 1);
            if (rects.length !== 1 || rects[0]!.width < 1) {
              continue;
            }
            const rect = rects[0]!;
            const hit = handle!.indexOfCodeUnit(rect.x + rect.width / 2, rect.y + rect.height / 2);
            const hitRects = hit === undefined ? [] : handle!.getSelectionRects(hit, hit + 1);
            if (!hitRects.some((r) => rectContains(r, rect.x + rect.width / 2, rect.y + rect.height / 2))) {
              disagreements++;
              firstBad ||= `frame ${actual.width}x${actual.height} lines ${actual.lines.length} index ${i} rect ${JSON.stringify(rect)} hit ${hit} hitRects ${JSON.stringify(hitRects)}`;
            }
          }
          ok(disagreements === 0, `${testCase.name}/hit: ${disagreements} code units whose center hits a character with another rectangle; first ${firstBad}`);
          if (testCase.replacementExtent !== undefined) {
            const line = actual.lines.get(0);
            let width = -1;
            for (let i = 0; i < line.runs.length; i++) {
              const run = line.runs.get(i);
              const attached = run.replacement;
              if (attached !== undefined) {
                width = run.width;
                attached.dispose();
              }
              run.dispose();
            }
            line.dispose();
            ok(near(width, testCase.replacementExtent, 0.01), `${testCase.name}/replacement: the run is ${width} wide, the room is ${testCase.replacementExtent}`);
          }
        } finally {
          actual.dispose();
          expected.dispose();
        }
      }

      // The text view.
      setStage('views');
      ok(await waitFor(() => view.current.frameId !== 0 && viewHandle.current !== null && chipHandle.current !== null && view.current.chipFrame !== 0), 'view: no frame');
      const handle = viewHandle.current;
      if (handle !== null && view.current.frameId !== 0) {
        const frame = handle.getComposedFrame();
        ok(frame !== undefined, 'view: no frame handle');
        if (frame !== undefined) {
          ok(frame.lines.length > 200, `view: ${frame.lines.length} lines for 120 paragraphs`);
          // The box is the size Yoga chose, which is rounded up to the pixel grid of the display.
          ok(frame.height > 1000 && frame.width <= width + 1, `view: frame ${frame.width}x${frame.height}`);
          // Sampled hit tests and carets, in the Latin and the Urdu part of the lines.
          let bad = 0;
          let badCaret = 0;
          for (let paragraph = 0; paragraph < 120; paragraph += 7) {
            const start = longText.string.indexOf(`${paragraph}: `, 0);
            const urduStart = longText.string.indexOf(URDU, start);
            for (const i of [start + 4, urduStart + 3, urduStart + 6]) {
              const rects = handle.getSelectionRects(i, i + 1);
              if (rects.length !== 1 || rects[0]!.width < 1) {
                continue;
              }
              const rect = rects[0]!;
              const hit = handle.indexOfCodeUnit(rect.x + rect.width / 2, rect.y + rect.height / 2);
              const hitRect = hit === undefined ? undefined : handle.getSelectionRects(hit, hit + 1)[0];
              if (hitRect === undefined || !rectContains(hitRect, rect.x + rect.width / 2, rect.y + rect.height / 2)) {
                bad++;
              }
              const caret = handle.getCaretPosition(i);
              // The boundary before a code unit is at a vertical edge of its rectangle, and lies in the line.
              if (caret === undefined || !(near(caret.x, rect.x, 0.6) || near(caret.x, rect.x + rect.width, 0.6)) || caret.y > rect.y + rect.height || caret.y + caret.height < rect.y) {
                badCaret++;
              }
            }
          }
          ok(bad === 0, `view/hit: ${bad} samples whose center hits another character`);
          ok(badCaret === 0, `view/caret: ${badCaret} carets that are not at an edge of their code unit`);
          ok(handle.indexOfCodeUnit(-5, 5) === undefined && handle.indexOfCodeUnit(5, -5) === undefined, 'view/hit: outside the text is no character');
          frame.dispose();
        }

        // Scrolling must not lay the text out again: the state, and so the event, stays as it is.
        const eventsBefore = view.current.events;
        const frameBefore = view.current.frameId;
        handle.scrollToOffset(1200);
        ok(await waitFor(() => near(view.current.lastOffset, 1200, 1)), `view/scroll: the offset is ${view.current.lastOffset}, not 1200`);
        const second = handle.getComposedFrame();
        const mid = longText.string.indexOf('60: ');
        const top = second === undefined ? undefined : handle.getCaretPosition(mid)?.y;
        second?.dispose();
        ok(top !== undefined, 'view/scroll: no caret for a code unit');
        if (top !== undefined) {
          handle.scrollToCodeUnit(mid);
          ok(await waitFor(() => near(view.current.lastOffset, top, 1)), `view/scrollToCodeUnit: ${view.current.lastOffset}, wanted ${top}`);
          const first = handle.firstVisibleCodeUnitIndex;
          ok(first !== undefined && first <= mid && mid - first < 80, `view/firstVisible: ${first} for ${mid}`);
        }
        handle.scrollToOffset(0);
        await waitFor(() => view.current.lastOffset === 0);
        ok(view.current.events === eventsBefore && view.current.frameId === frameBefore, `view/relayout: ${view.current.events - eventsBefore} frames were composed while scrolling`);

        // A selection only paints.
        setSelection({ fromIndex: 3, toIndex: 40 });
        await sleep(400);
        ok(view.current.events === eventsBefore && view.current.frameId === frameBefore, 'view/selection: a selection laid the text out again');

        // A new width does lay it out, once.
        setWidth(240);
        ok(await waitFor(() => view.current.frameId !== frameBefore), 'view/width: no new frame for a new width');
        const narrow = handle.getComposedFrame();
        ok(narrow !== undefined && narrow.lines.length > 200, 'view/width: the narrow frame has lines');
        narrow?.dispose();
      }

      // Replacement in the text view: laid out with its room.
      const chip = chipHandle.current?.getComposedFrame();
      if (chip === undefined) {
        ok(false, 'chip view: no frame');
      } else {
        const line = chip.lines.get(0);
        let width = -1;
        for (let i = 0; i < line.runs.length; i++) {
          const run = line.runs.get(i);
          const attached = run.replacement;
          if (attached !== undefined) {
            width = run.width;
            attached.dispose();
          }
          run.dispose();
        }
        line.dispose();
        chip.dispose();
        ok(near(width, 36, 0.01), `chip view: the replacement run is ${width} wide, the room is 36`);
      }
      if (baseline !== undefined) {
        ok((b.testGetViewCounts?.().replacements ?? 0) > baseline.replacements, 'replacement: no static replacement is alive while the views show one');
      }

      // A view that shows a replacement is mounted and unmounted again and again: each cycle must
      // give back its text, its frame and its static replacement, and the counts must not climb.
      setStage('cycle');
      const during: string[] = [];
      for (let cycle = 0; cycle < 6; cycle++) {
        setCyclePlain(cycle >= 3);
        setCycling(true);
        await sleep(350);
        const live = b.testGetViewCounts?.();
        setCycling(false);
        await sleep(350);
        b.testCollectGarbage?.();
        const idle = b.testGetViewCounts?.();
        during.push(`${cycle}: live ${JSON.stringify(live)} idle ${JSON.stringify(idle)}`);
      }
      if (baseline !== undefined) {
        const settledCycles = () => {
          b.testCollectGarbage?.();
          const now = b.testGetViewCounts?.();
          return now !== undefined && now.replacements === baseline.replacements;
        };
        ok(await waitFor(settledCycles, 6000), `cycles: counts after 6 cycles ${JSON.stringify(b.testGetViewCounts?.())}, baseline ${JSON.stringify(baseline)}; ${during.join(' | ')}`);
      }

      // Everything is unmounted while it still shows its replacements, which must free all of it.
      setStage('gone');
      if (baseline !== undefined) {
        // Strict: with the states superseded nothing may remain, so any difference is a leak of
        // the text, the frame or the replacement. A view that is unmounted *while it still shows* a
        // replacement is another case: its last state (and the frame in it) lives until React
        // Native lets go of the node's family, which is not in our hands (see the TSDoc of
        // ViewText), and that case is not asserted here.
        const settled = () => {
          b.testCollectGarbage?.();
          const now = b.testGetViewCounts?.();
          return now !== undefined && now.texts === baseline.texts && now.replacements === baseline.replacements;
        };
        const ok2 = await waitFor(settled, 10000);
        const after = b.testGetViewCounts?.();
        ok(ok2, `release: texts ${baseline.texts} -> ${after?.texts}, replacements ${baseline.replacements} -> ${after?.replacements}`);
      }
    })()
      .catch((e: unknown) => failures.push(`(suite): ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`))
      .finally(() => onDone({ name: labelSuiteName, passed: Math.max(0, total - failures.length), total: Math.max(total, failures.length), failures }));
  }, [setup, texts, longText, chipText, onDone]);

  if (stage === 'gone') {
    // The mounting layer lets go of the removed views with the next commit, so something keeps changing.
    return <View testID="labelTests"><Text>{tick}</Text></View>;
  }
  if (setup === undefined || longText === undefined || chipText === undefined) {
    return <View testID="labelTests" />;
  }

  return (
    <View style={styles.host} testID="labelTests">
      <Text style={styles.caption}>Labels</Text>
      {stage === 'labels' &&
        labelCases.map((testCase) => (
          <TLabel
            key={testCase.name}
            testID={`label-${testCase.name}`}
            ref={(handle) => { handles.current[testCase.name] = handle; }}
            text={testCase.text}
            attributedText={texts[testCase.name]}
            typeface={testCase.face === 'roboto' ? setup.roboto : setup.nastaliq}
            textSize={testCase.size}
            textColor={testCase.color}
            textAlignment={testCase.align}
            maxLines={testCase.maxLines}
            isTruncationEnabled={testCase.truncate !== undefined}
            truncationPlace={testCase.truncate}
            style={{ minWidth: testCase.width, maxWidth: testCase.width, alignSelf: 'flex-start', marginBottom: 2 }}
            onLayout={(e) => {
              const entry = (seen.current[testCase.name] ??= { events: 0 });
              entry.layout = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
            }}
            onFrameReady={(e) => {
              const entry = (seen.current[testCase.name] ??= { events: 0 });
              if (entry.events === 0 && e.lineCount === 0) {
                entry.emptyFirst = true;
              }
              entry.events++;
              entry.frameId = e.frameId;
            }}
          />
        ))}
      {stage === 'cycle' && cycling && (
        <TLabel testID="cycle-label" text={cyclePlain ? 'abc abc' : undefined} attributedText={cyclePlain ? undefined : chipText} typeface={setup.roboto} textSize={18} style={{ maxWidth: 200 }} />
      )}
      {stage === 'views' && (
        <>
          <TTextView
            testID="view-long"
            ref={viewHandle}
            attributedText={longText}
            typeface={setup.roboto}
            textSize={16}
            selection={selection}
            style={{ width, height: 220 }}
            onScroll={(offset) => { view.current.lastOffset = offset; view.current.offsets.push(offset); }}
            onFrameReady={(e) => { view.current.events++; view.current.frameId = e.frameId; }}
          />
          <TTextView
            testID="view-chip"
            ref={chipHandle}
            attributedText={chipText}
            typeface={setup.roboto}
            textSize={18}
            style={{ width: 200, height: 60 }}
            onFrameReady={() => { view.current.chipFrame++; }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { alignSelf: 'stretch', alignItems: 'flex-start', paddingHorizontal: 16 },
  caption: { fontSize: 12, color: '#000000' },
});
