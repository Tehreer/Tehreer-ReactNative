import type * as Library from '../../src/index';

// The scenario matrix of issue #21. `measure` runs one scenario against a library with the API of
// Tehreer-Web and Tehreer-ReactNative (the two have the same names here) and returns plain numbers
// and strings, so the very same function ran against Tehreer-Web's WebAssembly build to produce
// `layoutExpected.ts`, and runs on a device to check that this wrapper gives the same geometry.
// It has no import of the library itself: the caller passes it in, and nothing here is specific to
// one of the two.

type Lib = Pick<typeof Library, 'BreakMode' | 'FrameResolver' | 'LineLocator' | 'Renderer' | 'Replacement'
  | 'ReplacementKind' | 'TextAlignment' | 'TMutableText' | 'TruncationPlace' | 'Typesetter' | 'VerticalAlignment'>;

export interface Faces {
  readonly roboto: Library.Typeface;
  readonly nastaliq: Library.Typeface;
}

export interface FrameScenario {
  readonly name: string;
  readonly text: string;
  /** `[from, to, face, size]` for each part; the whole text has the first part's face and size if it is not covered. */
  readonly parts?: readonly (readonly [number, number, 'roboto' | 'nastaliq'])[];
  readonly face: 'roboto' | 'nastaliq';
  readonly size: number;
  readonly width: number;
  readonly height: number;
  /** Members of the resolver to set, by the name of the property; the values are names of enums or numbers. */
  readonly settings?: Readonly<Record<string, string | number | boolean>>;
  /** A replacement at `[from, to)`: its kind and room. */
  readonly replacement?: { readonly from: number; readonly to: number; readonly kind: 'Inline' | 'Block'; readonly ascent: number; readonly descent: number; readonly extent: number };
}

const URDU = 'تحریر ایک متنی انجن ہے';

export const frameScenarios: readonly FrameScenario[] = [
  { name: 'ltr-wrap', text: 'abc abc abc abc abc', face: 'roboto', size: 20, width: 70, height: 1000 },
  { name: 'ltr-right', text: 'abc abc abc abc abc', face: 'roboto', size: 20, width: 120, height: 1000, settings: { textAlignment: 'Right' } },
  { name: 'ltr-center', text: 'abc abc abc abc abc', face: 'roboto', size: 20, width: 120, height: 1000, settings: { textAlignment: 'Center' } },
  { name: 'ltr-justified', text: 'abc abc abc abc abc', face: 'roboto', size: 20, width: 120, height: 1000, settings: { isJustificationEnabled: true } },
  { name: 'urdu-wrap', text: URDU, face: 'nastaliq', size: 30, width: 150, height: 1000 },
  { name: 'urdu-unbounded', text: URDU, face: 'nastaliq', size: 30, width: Infinity, height: Infinity },
  { name: 'urdu-left', text: URDU, face: 'nastaliq', size: 30, width: 150, height: 1000, settings: { textAlignment: 'Left' } },
  { name: 'mixed', text: 'abc ' + URDU + ' abc', face: 'roboto', size: 20, width: Infinity, height: Infinity, parts: [[4, 4 + URDU.length, 'nastaliq']] },
  { name: 'mixed-wrap', text: 'abc ' + URDU + ' abc', face: 'roboto', size: 20, width: 90, height: 1000, parts: [[4, 4 + URDU.length, 'nastaliq']] },
  { name: 'truncate-end', text: 'abc abc abc abc abc', face: 'roboto', size: 20, width: 70, height: 1000, settings: { maxLines: 2, isTruncationEnabled: true } },
  { name: 'truncate-middle-character', text: 'abc abc abc abc abc', face: 'roboto', size: 20, width: 90, height: 1000, settings: { maxLines: 1, isTruncationEnabled: true, truncationPlace: 'Middle', truncationMode: 'Character' } },
  { name: 'truncate-start', text: 'abc abc abc abc abc', face: 'roboto', size: 20, width: 90, height: 1000, settings: { maxLines: 1, isTruncationEnabled: true, truncationPlace: 'Start' } },
  { name: 'truncate-by-height', text: 'abc abc abc abc abc', face: 'roboto', size: 20, width: 70, height: 40, settings: { isTruncationEnabled: true } },
  { name: 'fits-both', text: 'abc abc', face: 'roboto', size: 20, width: 500, height: 5, settings: { fitsHorizontally: true, fitsVertically: true } },
  { name: 'bottom-aligned', text: 'abc abc abc abc abc', face: 'roboto', size: 20, width: 70, height: 200, settings: { verticalAlignment: 'Bottom' } },
  { name: 'center-aligned', text: 'abc abc abc abc abc', face: 'roboto', size: 20, width: 70, height: 200, settings: { verticalAlignment: 'Center' } },
  { name: 'line-spacing', text: 'abc abc abc abc abc', face: 'roboto', size: 20, width: 70, height: 1000, settings: { lineHeightMultiplier: 1.5, extraLineSpacing: 2 } },
  { name: 'replacement-inline', text: 'ab￼ab', face: 'roboto', size: 20, width: 200, height: 1000, replacement: { from: 2, to: 3, kind: 'Inline', ascent: 12, descent: 4, extent: 30 } },
  { name: 'replacement-block', text: 'ab￼ab', face: 'roboto', size: 20, width: 150, height: 1000, replacement: { from: 2, to: 3, kind: 'Block', ascent: 12, descent: 4, extent: -1 } },
];

/** Rounds to what a float of 32 bits keeps reliably, so that two builds of Core compare. */
const r = (value: number): number => (Number.isFinite(value) ? Math.round(value * 1000) / 1000 : value);
const rects = (list: readonly { x: number; y: number; width: number; height: number }[]) =>
  list.map(({ x, y, width, height }) => [r(x), r(y), r(width), r(height)]);

function dispose(...objects: ({ dispose(): void } | undefined)[]): void {
  for (const object of objects) {
    object?.dispose();
  }
}

function describeRun(run: Library.GlyphRun): unknown {
  const typeface = run.typeface;
  const replacement = run.replacement;
  const data = {
    range: [run.startIndex, run.endIndex, run.startExtraLength, run.endExtraLength],
    bidi: run.bidiLevel,
    direction: run.writingDirection,
    backward: run.isBackward,
    family: typeface?.familyName ?? null,
    typeSize: r(run.typeSize),
    scale: [r(run.scaleX), r(run.scaleY)],
    replacement: replacement === undefined ? null : replacement.kind,
    metrics: [r(run.ascent), r(run.descent), r(run.leading), r(run.width), r(run.height)],
    origin: [r(run.origin.x), r(run.origin.y)],
    glyphCount: run.glyphCount,
    glyphIds: run.glyphIds.toArray(),
    glyphOffsets: run.glyphOffsets.toArray().map((point) => [r(point.x), r(point.y)]),
    glyphAdvances: run.glyphAdvances.toArray().map(r),
    clusterMap: run.clusterMap.toArray(),
  };
  dispose(typeface, replacement);
  return data;
}

function describeLine(line: Library.ComposedLine): unknown {
  const runs: unknown[] = [];
  for (let index = 0; index < line.runs.length; index++) {
    const run = line.runs.get(index);
    runs.push(describeRun(run));
    run.dispose();
  }
  const distances: number[] = [];
  for (let unit = line.startIndex; unit <= line.endIndex; unit++) {
    distances.push(r(line.getCodeUnitDistance(unit)));
  }
  return {
    range: [line.startIndex, line.endIndex],
    level: line.paragraphLevel,
    origin: [r(line.origin.x), r(line.origin.y)],
    metrics: [r(line.ascent), r(line.descent), r(line.leading), r(line.width), r(line.height), r(line.trailingWhitespaceExtent)],
    block: line.isBlock,
    truncated: line.isTruncated,
    distances,
    penOffsets: [r(line.getPenOffset(0.5, 300)), r(line.getPenOffset(1, 300))],
    runs,
  };
}

export function measure(lib: Lib, faces: Faces, scenario: FrameScenario): unknown {
  const face = (name: 'roboto' | 'nastaliq') => faces[name];
  const text = new lib.TMutableText(scenario.text);
  text.setAttributes(0, scenario.text.length, { typeface: face(scenario.face), typeSize: scenario.size });
  for (const [from, to, name] of scenario.parts ?? []) {
    text.setAttributes(from, to, { typeface: face(name) });
  }

  let replacement: Library.Replacement | undefined;
  if (scenario.replacement !== undefined) {
    const { from, to, kind, ascent, descent, extent } = scenario.replacement;
    // A negative extent stands for "the whole layout width", as a block replacement usually does.
    replacement = new lib.Replacement(
      { computeRoom: (layoutWidth: number) => ({ ascent, descent, extent: extent < 0 ? layoutWidth : extent }) },
      lib.ReplacementKind[kind],
    );
    text.setAttributes(from, to, { replacement });
  }

  const typesetter = new lib.Typesetter(text);
  const resolver = new lib.FrameResolver();
  resolver.typesetter = typesetter;
  resolver.frameWidth = scenario.width;
  resolver.frameHeight = scenario.height;
  const enums: Record<string, Record<string, number>> = {
    textAlignment: lib.TextAlignment, verticalAlignment: lib.VerticalAlignment,
    truncationMode: lib.BreakMode, truncationPlace: lib.TruncationPlace,
  };
  for (const [name, value] of Object.entries(scenario.settings ?? {})) {
    (resolver as unknown as Record<string, unknown>)[name] = typeof value === 'string' ? enums[name]?.[value] : value;
  }

  const frame = resolver.createFrame(0, scenario.text.length);
  const lines: unknown[] = [];
  for (let index = 0; index < frame.lines.length; index++) {
    const line = frame.lines.get(index);
    lines.push(describeLine(line));
    line.dispose();
  }

  const unitLines: number[] = [];
  for (let unit = 0; unit <= scenario.text.length + 1; unit++) {
    unitLines.push(frame.getLineIndexForCodeUnit(unit));
  }
  const renderer = new lib.Renderer();
  renderer.typeface = face(scenario.face);
  renderer.typeSize = scenario.size;
  const locator = new lib.LineLocator(frame, renderer);
  const boxes = [];
  for (let index = 0; index < locator.lineCount; index++) {
    boxes.push(locator.getLineBox(index));
  }
  const end = scenario.text.length;
  const data = {
    range: [frame.startIndex, frame.endIndex],
    size: [r(frame.width), r(frame.height)],
    unitLines,
    positionLines: [-100, 0, 15, 30, 10000].map((y) => frame.getLineIndexAtPosition(5, y)),
    selection: [[2, 12], [0, end], [1, 1]].map(([from, to]) => rects(frame.getSelectionRects(Math.min(from as number, end), Math.min(to as number, end)))),
    boxes: rects(boxes),
    found: locator.findLines({ x: -10, y: -10, width: 100000, height: 100000 }),
    below: [0, 30, 100000].map((y) => locator.getFirstLineIndexBelow(y)),
    lines,
  };
  dispose(locator, renderer, frame, resolver, typesetter, replacement, text);
  return data;
}

/** What the typesetter alone gives: lines, breaks, tokens, truncation and justification. */
export function measureTypesetter(lib: Lib, faces: Faces): unknown {
  const string = 'abc abc abc abc abc';
  const typesetter = new lib.Typesetter(string, { typeface: faces.roboto, typeSize: 20 });
  const end = string.length;
  const modes = [lib.BreakMode.Line, lib.BreakMode.Character];

  const whole = typesetter.createSimpleLine(0, end);
  const token = typesetter.createTruncationToken(0, end, lib.TruncationPlace.End, 'c');
  const custom = typesetter.createTruncationToken(0, end, lib.TruncationPlace.End, 'bb');
  const short = typesetter.createSimpleLine(0, 7);
  const data: Record<string, unknown> = {
    count: typesetter.codeUnitCount,
    forward: modes.map((mode) => [20, 60, 1000].map((extent) => typesetter.suggestForwardBreak(0, end, extent, mode))),
    backward: modes.map((mode) => [20, 60, 1000].map((extent) => typesetter.suggestBackwardBreak(0, end, extent, mode))),
    forwardFrom: typesetter.suggestForwardBreak(4, end, 60, lib.BreakMode.Line),
    simple: [describeLine(whole), describeLine(typesetter.createSimpleLine(4, 11))],
    token: [describeLine(token), describeLine(custom)],
    truncated: [lib.TruncationPlace.End, lib.TruncationPlace.Start, lib.TruncationPlace.Middle].map((place) => {
      const line = typesetter.createTruncatedLine(0, end, whole.width / 2, lib.BreakMode.Line, place, token);
      const described = describeLine(line);
      line.dispose();
      return described;
    }),
    notTruncated: (() => {
      const line = typesetter.createTruncatedLine(0, end, whole.width * 2, lib.BreakMode.Line, lib.TruncationPlace.End, token);
      const truncated = line.isTruncated;
      line.dispose();
      return truncated;
    })(),
    justified: (() => {
      const line = typesetter.createJustifiedLine(0, 7, 1, short.width + 40);
      const described = describeLine(line);
      line.dispose();
      return described;
    })(),
  };
  dispose(whole, token, custom, short, typesetter);
  return data;
}
