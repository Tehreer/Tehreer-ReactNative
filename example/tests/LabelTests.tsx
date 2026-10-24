import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FontFile } from '../../src/graphics/FontFile';
import type { Typeface } from '../../src/graphics/Typeface';
import type { ComposedFrame } from '../../src/layout/ComposedFrame';
import { FrameResolver } from '../../src/layout/FrameResolver';
import { Replacement } from '../../src/layout/Replacement';
import { BreakMode, ReplacementKind, TextAlignment, TruncationPlace } from '../../src/layout/enums';
import { TMutableText } from '../../src/layout/TMutableText';
import { DrawStyle } from '../../src/graphics/enums';
import { Typesetter } from '../../src/layout/Typesetter';
import type { TText } from '../../src/layout/TText';
import { TLabel } from '../../src/views/TLabel';
import type { TLabelHandle } from '../../src/views/TLabel';
import { TTextView } from '../../src/views/TTextView';
import type { TTextViewHandle } from '../../src/views/TTextView';
import { getNativeBindings } from '../../src/internal/NativeBindings';
import { ViewTypesetter } from '../../src/views/ViewTypesetter';
import type { Rect } from '../../src/geometry';
import { fontBytes, nastaliqFontBytes } from './fontData';
import type { SuiteReport } from './runSuites';

// The suite of issues #27 to #29: TLabel and TTextView rendered. The native view tells when it has
// laid its text out (`onFrameReady`), and each label case compares that with the frame that the
// JavaScript API makes for the same text, settings and size: the line count and the size must be the
// same, which is the proof that the props reach Core's settings unchanged. The text view is driven
// through its handle, and everything that mounts must be gone again when it is unmounted.

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
  /** A text that has no code unit: no frame, and every query is empty. */
  isEmpty?: boolean;
  /** The view is given a typesetter of its own instead of the text. */
  givesTypesetter?: boolean;
  /** Stroke and shadow, which change how the text is drawn and not how it is laid out. */
  isStyled?: boolean;
}

function mixed(setup: Setup): TText {
  const text = new TMutableText(`abc ${URDU} cba 123 ${URDU}`);
  text.setAttributes(4, 4 + URDU.length, { typeface: setup.nastaliq, typeSize: 28 });
  const second = text.length - URDU.length;
  text.setAttributes(second, text.length, { typeface: setup.nastaliq, typeSize: 22, foregroundColor: 0xffaa0000 });
  return text;
}

function withChip(extent: number) {
  return (): TText => {
    const original = new Replacement({
      computeRoom: () => ({ ascent: 14, descent: 4, extent }),
      draw: (context) => context.fillRect({ x: 0, y: -14, width: extent, height: 18 }, 0xff2255cc),
    }, ReplacementKind.Inline);
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
  { name: 'empty-text', text: '', face: 'roboto', size: 20, width: 100, isEmpty: true },
  { name: 'emoji-mixed', text: 'abc \u{1F600} abc', face: 'roboto', size: 20, width: 60 },
  { name: 'typesetter-prop', text: LATIN, face: 'roboto', size: 20, width: 120, givesTypesetter: true },
  { name: 'stroke-shadow', text: LATIN, face: 'roboto', size: 20, width: 120, isStyled: true },
];

interface Seen {
  layout?: { width: number; height: number };
  /** What the native view said about each frame it laid out. */
  frames: { lineCount: number; width: number; height: number }[];
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

/** Makes the frame with the JavaScript API, by hand, for the box that the view was laid out in. */
function expectedFrame(testCase: LabelCase, setup: Setup, text: string | TText, box: { width: number; height: number }): ComposedFrame {
  const typeface = testCase.face === 'roboto' ? setup.roboto : setup.nastaliq;
  const typesetter = new Typesetter(text, { typeface, typeSize: testCase.size });
  const resolver = new FrameResolver();
  try {
    resolver.typesetter = typesetter;
    resolver.frameWidth = box.width + 0.01;
    resolver.frameHeight = box.height + 0.01;
    resolver.fitsHorizontally = false;
    resolver.fitsVertically = false;
    resolver.textAlignment = testCase.align ?? TextAlignment.Leading;
    if (testCase.maxLines !== undefined) {
      resolver.maxLines = testCase.maxLines;
    }
    if (testCase.truncate !== undefined) {
      resolver.isTruncationEnabled = true;
      resolver.truncationPlace = testCase.truncate;
      resolver.truncationMode = BreakMode.Line;
    }
    return resolver.createFrame(0, typesetter.codeUnitCount);
  } finally {
    resolver.dispose();
    typesetter.dispose();
  }
}

/** How many of the code units hit a character whose rectangle does not hold the center of their own. */
function hitDisagreements(handle: TLabelHandle | TTextViewHandle, length: number): { count: number; first: string } {
  let count = 0;
  let first = '';
  for (let i = 0; i < length; i++) {
    const rects = handle.getSelectionRects(i, i + 1);
    if (rects.length !== 1 || rects[0]!.width < 1) {
      continue;
    }
    const rect = rects[0]!;
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    const hit = handle.indexOfCodeUnit(x, y);
    const hitRects = hit === undefined ? [] : handle.getSelectionRects(hit, hit + 1);
    if (!hitRects.some((r) => rectContains(r, x, y))) {
      count++;
      first ||= `index ${i} rect ${JSON.stringify(rect)} hit ${hit}`;
    }
  }
  return { count, first };
}

function runWidth(frame: ComposedFrame, lineIndex: number): number {
  const line = frame.lines.get(lineIndex);
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
  return width;
}

export function LabelTestHost({ onDone }: { onDone: (report: SuiteReport) => void }) {
  const [setup, setSetup] = useState<Setup | undefined>();
  const [texts, setTexts] = useState<Record<string, TText>>({});
  const [stage, setStage] = useState<'labels' | 'views' | 'cycle' | 'gone'>('labels');
  const [width, setWidth] = useState(300);
  const [highlighted, setHighlighted] = useState(false);
  const [cycling, setCycling] = useState(false);
  const [rapid, setRapid] = useState(false);
  const [rapidText, setRapidText] = useState<TText | undefined>();
  const [tick, setTick] = useState(0);
  const [longText, setLongText] = useState<TText | undefined>();
  const [chipText, setChipText] = useState<TText | undefined>();
  const seen = useRef<Record<string, Seen>>({});
  const handles = useRef<Record<string, TLabelHandle | null>>({});
  const viewHandle = useRef<TTextViewHandle | null>(null);
  const chipHandle = useRef<TTextViewHandle | null>(null);
  const view = useRef({ frames: 0, offsets: [] as number[], lastOffset: -1, chipFrames: 0, earlyOffset: -1, earlyFrames: 0 });
  const started = useRef(false);
  // A typesetter that a label is given, which stays the caller's.
  const given = useRef<Typesetter | undefined>(undefined);
  const rapidHolder = useRef<TText | undefined>(undefined);
  // Counted before anything of this suite is registered.
  const baselineRef = useRef<{ typesetters: number; replacements: number } | undefined>(undefined);

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
    // Many paragraphs of Latin with a run of Urdu in each: long enough to scroll many screens.
    const long = new TMutableText('');
    for (let index = 0; index < 120; index++) {
      const lead = `${index}: ${LATIN} `;
      const at = long.length;
      long.append(`${lead}${URDU}\n`);
      long.setAttributes(at + lead.length, at + lead.length + URDU.length, { typeface: made.nastaliq, typeSize: 20 });
    }
    given.current = new Typesetter(LATIN, { typeface: made.roboto, typeSize: 20 });
    setSetup(made);
    setTexts(built);
    setLongText(long);
    setChipText(withChip(36)());
    // A long text with a replacement in every paragraph, to be unmounted while it is still being laid out.
    const many = new TMutableText('');
    const original = new Replacement({ computeRoom: () => ({ ascent: 12, descent: 3, extent: 20 }), draw: (context) => context.fillRect({ x: 0, y: -12, width: 20, height: 15 }, 0xff2255cc) });
    for (let index = 0; index < 400; index++) {
      const at = many.length;
      many.append(`${LATIN} \uFFFC ${LATIN}\n`);
      many.setAttributes(at + LATIN.length + 1, at + LATIN.length + 2, { replacement: original });
    }
    original.dispose();
    rapidHolder.current = many;
    setRapidText(many);
    return () => {
      Object.values(built).forEach((text) => text.dispose());
      long.dispose();
      given.current?.dispose();
      rapidHolder.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (stage !== 'gone') {
      return undefined;
    }
    const timer = setInterval(() => setTick((value) => value + 1), 100);
    return () => clearInterval(timer);
  }, [stage]);

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
      // Labels: wait until every one has its layout and its first frame.
      ok(await waitFor(() => labelCases.every((c) => c.isEmpty === true ? seen.current[c.name]?.layout !== undefined : (seen.current[c.name]?.frames.length ?? 0) > 0)), 'labels: not every label laid its text out');

      for (const testCase of labelCases) {
        const entry = seen.current[testCase.name];
        const handle = handles.current[testCase.name];
        if (testCase.isEmpty === true) {
          // Core makes no frame of an empty range, so there is none, and nothing throws.
          ok(entry?.layout !== undefined && entry.layout.height === 0 && entry.frames.length === 0, `${testCase.name}: an empty text is zero high and reports no frame`);
          ok(handle?.composedFrame === undefined && handle?.indexOfCodeUnit(1, 1) === undefined && handle?.getSelectionRects(0, 0).length === 0, `${testCase.name}: the queries of an empty text are empty`);
          continue;
        }
        if (entry?.layout === undefined || entry.frames.length === 0 || handle === null || handle === undefined) {
          ok(false, `${testCase.name}: no layout or frame`);
          continue;
        }
        const source: string | TText = testCase.text ?? (texts[testCase.name] as TText);
        const expected = expectedFrame(testCase, setup, source, entry.layout);
        try {
          // The native label and the JavaScript API lay the same text out the same way.
          const first = entry.frames[0]!;
          const last = entry.frames[entry.frames.length - 1]!;
          ok(first.lineCount > 0, `${testCase.name}/events: the first onFrameReady was an empty frame`);
          ok(last.lineCount === expected.lines.length && last.lineCount > 0, `${testCase.name}/lines: the view has ${last.lineCount}, the API ${expected.lines.length}`);
          ok(near(last.height, expected.height, 0.05) && near(last.width, expected.width, 0.05),
            `${testCase.name}/size: the view ${last.width}x${last.height}, the API ${expected.width}x${expected.height}`);

          // The frame that JavaScript makes for the handle is the same, line by line.
          const own = handle.composedFrame;
          let difference = own === undefined ? 'no frame' : '';
          for (let i = 0; own !== undefined && difference === '' && i < Math.min(own.lines.length, expected.lines.length); i++) {
            const a = own.lines.get(i);
            const e = expected.lines.get(i);
            if (!(a.startIndex === e.startIndex && a.endIndex === e.endIndex && near(a.origin.x, e.origin.x) && near(a.origin.y, e.origin.y) && a.isTruncated === e.isTruncated)) {
              difference = `line ${i}: ${a.startIndex}-${a.endIndex} at ${a.origin.x},${a.origin.y}; API ${e.startIndex}-${e.endIndex} at ${e.origin.x},${e.origin.y}`;
            }
            a.dispose();
            e.dispose();
          }
          ok(difference === '' && own?.lines.length === expected.lines.length, `${testCase.name}/geometry: ${difference}`);

          if (testCase.truncate !== undefined && own !== undefined) {
            const lastLine = own.lines.get(own.lines.length - 1);
            ok(lastLine.isTruncated, `${testCase.name}/truncation: the last line is not truncated`);
            lastLine.dispose();
          }
          const disagreement = hitDisagreements(handle, expected.endIndex);
          ok(disagreement.count === 0, `${testCase.name}/hit: ${disagreement.count} code units hit another character; first ${disagreement.first}`);
          if (testCase.replacementExtent !== undefined && own !== undefined) {
            const room = runWidth(own, 0);
            ok(near(room, testCase.replacementExtent, 0.01), `${testCase.name}/replacement: the run is ${room} wide, the room is ${testCase.replacementExtent}`);
          }
        } finally {
          expected.dispose();
        }
      }
    })()
      .then(async () => {
        // A plain text without a typeface shows nothing, as in the other wrappers, and queries are empty.
        total++;
        if (handles.current.noFace?.composedFrame !== undefined || (seen.current.noFace?.frames.length ?? 0) > 0) {
          failures.push('label/no typeface: a text without a typeface laid out');
        }
        // A typesetter that holds a replacement is refused with a clear error.
        total++;
        {
          const replaced = withChip(30)();
          const face = setup.roboto;
          const ts = new Typesetter(replaced, { typeface: face, typeSize: 14 });
          try {
            ViewTypesetter.create({ typesetter: ts, textSize: 14 }, 0)?.dispose();
            failures.push('label/typesetter: a typesetter with a replacement was accepted');
          } catch (e) {
            if (!(e instanceof Error) || !/attributedText/.test(e.message)) {
              failures.push(`label/typesetter: the error does not say what to do: ${String(e)}`);
            }
          } finally {
            ts.dispose();
            replaced.dispose();
          }
        }
        // Bad positions never reach a frame.
        let refused = false;
        try {
          handles.current.left?.indexOfCodeUnit(Number.NaN, 1);
        } catch (e) {
          refused = e instanceof RangeError;
        }
        total++;
        if (!refused) {
          failures.push('label/NaN: indexOfCodeUnit(NaN, 1) is not a RangeError');
        }

        // The text view.
        setStage('views');
        ok(await waitFor(() => view.current.frames > 0 && viewHandle.current !== null && view.current.chipFrames > 0 && view.current.earlyFrames > 0), 'view: no frame');
        const handle = viewHandle.current;
        if (handle === null) {
          ok(false, 'view: no handle');
          return;
        }
        const frame = handle.composedFrame;
        ok(frame !== undefined, 'view: no frame handle');
        if (frame !== undefined) {
          ok(frame.lines.length > 200, `view: ${frame.lines.length} lines for 120 paragraphs`);
          ok(frame.height > 1000 && frame.width <= width + 1, `view: frame ${frame.width}x${frame.height}`);
        }
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
            if (caret === undefined || !(near(caret.x, rect.x, 0.6) || near(caret.x, rect.x + rect.width, 0.6)) || caret.y > rect.y + rect.height || caret.y + caret.height < rect.y) {
              badCaret++;
            }
          }
        }
        ok(bad === 0, `view/hit: ${bad} samples whose center hits another character`);
        ok(badCaret === 0, `view/caret: ${badCaret} carets that are not at an edge of their code unit`);
        ok(handle.indexOfCodeUnit(-5, 5) === undefined && handle.indexOfCodeUnit(5, -5) === undefined, 'view/hit: outside the text is no character');

        // Bad requests never reach the native view, where NaN is a geometry error.
        for (const bad of [Number.NaN, Number.POSITIVE_INFINITY]) {
          let thrown = false;
          try { handle.scrollToOffset(bad); } catch (e) { thrown = e instanceof RangeError; }
          ok(thrown, `view/scroll: scrollToOffset(${bad}) is not a RangeError`);
        }
        let thrown = false;
        try { handle.scrollToCodeUnit(Number.NaN); } catch (e) { thrown = e instanceof RangeError; }
        ok(thrown, 'view/scroll: scrollToCodeUnit(NaN) is not a RangeError');

        // The text was laid out once; scrolling must not lay it out again.
        const framesBefore = view.current.frames;
        handle.scrollToOffset(1200);
        ok(await waitFor(() => near(view.current.lastOffset, 1200, 1)), `view/scroll: the offset is ${view.current.lastOffset}, not 1200`);
        const mid = longText.string.indexOf('60: ');
        const top = handle.getCaretPosition(mid)?.y;
        ok(top !== undefined, 'view/scroll: no caret for a code unit');
        if (top !== undefined) {
          handle.scrollToCodeUnit(mid);
          ok(await waitFor(() => near(view.current.lastOffset, top, 1)), `view/scrollToCodeUnit: ${view.current.lastOffset}, wanted ${top}`);
          const firstVisible = handle.firstVisibleCodeUnitIndex;
          ok(firstVisible !== undefined && firstVisible <= mid && mid - firstVisible < 80, `view/firstVisible: ${firstVisible} for ${mid}`);
        }
        handle.scrollToOffset(0);
        await waitFor(() => view.current.lastOffset === 0);
        ok(view.current.frames === framesBefore, `view/relayout: ${view.current.frames - framesBefore} frames were laid out while scrolling`);

        // Highlights only repaint.
        setHighlighted(true);
        await sleep(400);
        ok(view.current.frames === framesBefore, 'view/highlights: a highlight laid the text out again');

        // A request that came before the first frame was kept until there was one.
        ok(near(view.current.earlyOffset, 300, 1), `view/early: a scroll requested before the first frame went to ${view.current.earlyOffset}, not 300`);

        // A new width does lay it out, once.
        setWidth(240);
        ok(await waitFor(() => view.current.frames === framesBefore + 1), 'view/width: no new frame for a new width');
        const narrow = handle.composedFrame;
        ok(narrow !== undefined && narrow.lines.length > 200, 'view/width: the narrow frame has lines');

        // Replacement in the text view: laid out with its room.
        const chip = chipHandle.current?.composedFrame;
        ok(chip !== undefined && near(runWidth(chip, 0), 36, 0.01), 'chip view: the replacement run is not as wide as its room');
        if (baseline !== undefined) {
          ok((b.testGetViewCounts?.().replacements ?? 0) > baseline.replacements, 'replacement: no holder is alive while the views show one');
        }

        // A view that shows a replacement is mounted and unmounted again and again; each cycle must give
        // everything back, so the counts are checked at the end, strictly.
        setStage('cycle');
        for (let cycle = 0; cycle < 8; cycle++) {
          setCycling(true);
          await sleep(300);
          setCycling(false);
          await sleep(300);
        }
        // A long text is unmounted again while its layout is still on the layout thread: that layout
        // must free what it made, and the replacements of the text, though the view is gone.
        // The view is shown for different times, so that some are gone before the layout starts, some while
        // it runs and some after it ended.
        for (const shown of [10, 30, 60, 90, 120, 160, 220, 300, 60, 90, 120, 160]) {
          setRapid(true);
          await sleep(shown);
          setRapid(false);
          await sleep(250);
        }
        // Everything is unmounted while it still shows its replacements.
        setStage('gone');
        if (baseline !== undefined) {
          const settled = () => {
            b.testCollectGarbage?.();
            const now = b.testGetViewCounts?.();
            return now !== undefined && now.typesetters === baseline.typesetters && now.replacements === baseline.replacements;
          };
          const released = await waitFor(settled, 10000);
          const after = b.testGetViewCounts?.();
          ok(released, `release: typesetters ${baseline.typesetters} -> ${after?.typesetters}, replacements ${baseline.replacements} -> ${after?.replacements}`);
        }
      })
      .catch((e: unknown) => failures.push(`(suite): ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`))
      .finally(() => onDone({ name: labelSuiteName, passed: Math.max(0, total - failures.length), total: Math.max(total, failures.length), failures }));
  }, [setup, texts, longText, chipText, width, onDone]);

  if (stage === 'gone') {
    // Something keeps changing, so that React Native commits and lets go of what was removed.
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
            text={testCase.givesTypesetter === true ? undefined : testCase.text}
            attributedText={texts[testCase.name]}
            typeface={testCase.face === 'roboto' ? setup.roboto : setup.nastaliq}
            textSize={testCase.size}
            textColor={testCase.color}
            typesetter={testCase.givesTypesetter === true ? given.current : undefined}
            drawStyle={testCase.isStyled === true ? DrawStyle.FillStroke : undefined}
            strokeColor={testCase.isStyled === true ? '#cc2200' : undefined}
            strokeRadius={testCase.isStyled === true ? 1 : undefined}
            shadowColor={testCase.isStyled === true ? '#66000000' : undefined}
            shadowRadius={testCase.isStyled === true ? 2 : undefined}
            shadowDx={testCase.isStyled === true ? 2 : undefined}
            shadowDy={testCase.isStyled === true ? 2 : undefined}
            textAlignment={testCase.align}
            maxLines={testCase.maxLines}
            isTruncationEnabled={testCase.truncate !== undefined}
            truncationPlace={testCase.truncate}
            style={{ minWidth: testCase.width, maxWidth: testCase.width, alignSelf: 'flex-start', marginBottom: 2 }}
            onLayout={(e) => {
              const entry = (seen.current[testCase.name] ??= { frames: [] });
              entry.layout = { width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height };
            }}
            onFrameReady={(e) => {
              (seen.current[testCase.name] ??= { frames: [] }).frames.push({ ...e });
            }}
          />
        ))}
      {stage === 'labels' && (
        <TLabel testID="label-no-typeface" ref={(handle) => { handles.current.noFace = handle; }} text="abc" textSize={20}
          onFrameReady={(e) => { (seen.current.noFace ??= { frames: [] }).frames.push({ ...e }); }} />
      )}
      {stage === 'cycle' && cycling && (
        <>
          <TLabel testID="cycle-label" attributedText={chipText} typeface={setup.roboto} textSize={18} style={{ maxWidth: 200 }} />
          <TTextView testID="cycle-view" attributedText={chipText} typeface={setup.roboto} textSize={18} style={{ width: 200, height: 60 }} />
        </>
      )}
      {stage === 'cycle' && rapid && rapidText !== undefined && (
        <TTextView testID="rapid-view" attributedText={rapidText} typeface={setup.roboto} textSize={16} style={{ width: 200, height: 100 }} />
      )}
      {stage === 'views' && (
        <>
          <TTextView
            testID="view-long"
            ref={viewHandle}
            attributedText={longText}
            typeface={setup.roboto}
            textSize={16}
            highlights={highlighted ? [{ fromIndex: 3, toIndex: 40 }, { fromIndex: 100, toIndex: 130, color: '#44aa0000' }] : undefined}
            separatorColor="#22000000"
            style={{ width, height: 220 }}
            onScroll={(offset) => { view.current.lastOffset = offset; view.current.offsets.push(offset); }}
            onFrameReady={() => { view.current.frames++; }}
          />
          <TTextView
            testID="view-chip"
            ref={chipHandle}
            attributedText={chipText}
            typeface={setup.roboto}
            textSize={18}
            style={{ width: 200, height: 60 }}
            onFrameReady={() => { view.current.chipFrames++; }}
          />
          <TTextView
            testID="view-early"
            ref={(handle) => { handle?.scrollToOffset(300); }}
            attributedText={longText}
            typeface={setup.roboto}
            textSize={16}
            style={{ width: 200, height: 60 }}
            onScroll={(offset) => { view.current.earlyOffset = offset; }}
            onFrameReady={() => { view.current.earlyFrames++; }}
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
