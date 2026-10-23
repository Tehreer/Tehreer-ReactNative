import type * as Library from '../../src/index';

// The scenarios of issue #22: frames drawn into a recording surface. Like layoutScenarios.ts, nothing
// here imports the library: the caller passes it in, so the very same code ran against Tehreer-Web's
// WebAssembly build (its CanvasPainter, with `CanvasRecorder` below standing in for a canvas context)
// to make `drawingExpected.ts`, and runs on a device against this wrapper's `DrawingContext`. Both
// sides write the same normalised events (see `format`), so "the same calls as Tehreer-Web" is a
// comparison of two lists of strings.

type Lib = Pick<typeof Library, 'DrawStyle' | 'FrameResolver' | 'Renderer' | 'Replacement' | 'ReplacementKind' | 'TMutableText' | 'Typesetter'>;

export interface Faces {
  readonly roboto: Library.Typeface;
  readonly nastaliq: Library.Typeface;
}

export interface DrawScenario {
  readonly name: string;
  readonly text: string;
  readonly face: 'roboto' | 'nastaliq';
  readonly size: number;
  readonly width: number;
  /** `[from, to, face]`: another face for a part of the text. */
  readonly parts?: readonly (readonly [number, number, 'roboto' | 'nastaliq'])[];
  /** Attributes of the text, by range. */
  readonly attributes?: readonly (readonly [number, number, Readonly<Record<string, unknown>>])[];
  /** Settings of the renderer, by property name. `drawStyle` is the name of a `DrawStyle`. */
  readonly renderer?: Readonly<Record<string, number | string>>;
  /** The top left of the frame. */
  readonly origin: readonly [number, number];
  readonly replacement?: { readonly from: number; readonly to: number; readonly kind: 'Inline' | 'Block'; readonly ascent: number; readonly descent: number; readonly extent: number };
}

const URDU = 'تحریر ایک متنی انجن ہے';

export const drawScenarios: readonly DrawScenario[] = [
  { name: 'ltr', text: 'abc abc', face: 'roboto', size: 20, width: 300, origin: [10, 20] },
  { name: 'ltr-wrap', text: 'abc abc abc abc abc', face: 'roboto', size: 20, width: 70, origin: [5, 7] },
  { name: 'urdu', text: URDU, face: 'nastaliq', size: 30, width: 150, origin: [0, 0] },
  { name: 'mixed', text: 'abc ' + URDU + ' abc', face: 'roboto', size: 20, width: 90, origin: [3, 4], parts: [[4, 4 + URDU.length, 'nastaliq']] },
  {
    name: 'decorations', text: 'abcdef', face: 'roboto', size: 20, width: 300, origin: [0, 0],
    attributes: [[1, 3, { backgroundColor: 0xff00ff00 }], [3, 5, { underline: true, strikethrough: true, decorationColor: 0x80102030 }], [0, 2, { foregroundColor: 0xff0000ff }]],
  },
  { name: 'shadow', text: 'abc', face: 'roboto', size: 20, width: 300, origin: [0, 0], renderer: { shadowRadius: 4, shadowDx: 2, shadowDy: 3, shadowColor: 0xff0000ff } },
  { name: 'fill-stroke', text: 'abc', face: 'roboto', size: 20, width: 300, origin: [0, 0], renderer: { drawStyle: 'FillStroke', strokeRadius: 1 } },
  { name: 'stroke', text: 'abc', face: 'roboto', size: 20, width: 300, origin: [0, 0], renderer: { drawStyle: 'Stroke', strokeRadius: 1 } },
  { name: 'render-scale', text: 'abc abc', face: 'roboto', size: 20, width: 300, origin: [10, 20], renderer: { renderScale: 2 } },
  { name: 'replacement-inline', text: 'ab￼ab', face: 'roboto', size: 20, width: 200, origin: [2, 3], replacement: { from: 2, to: 3, kind: 'Inline', ascent: 12, descent: 4, extent: 30 } },
  { name: 'replacement-block', text: 'ab￼ab', face: 'roboto', size: 20, width: 150, origin: [0, 0], replacement: { from: 2, to: 3, kind: 'Block', ascent: 12, descent: 4, extent: -1 } },
];

/** Rounds to what a float of 32 bits keeps reliably, so that two builds of Core compare. */
export const round = (value: number): number => Math.round(value * 1000) / 1000;

/** One normalised event: its name and the numbers or strings it carries. */
export function format(name: string, ...values: (number | string)[]): string {
  return [name, ...values.map((value) => (typeof value === 'number' ? String(round(value)) : value))].join(' ');
}

export interface Prepared {
  readonly frame: Library.ComposedFrame;
  readonly renderer: Library.Renderer;
  dispose(): void;
}

/**
 * Lays out the scenario and sets up a renderer for it. A replacement's `draw` appends a
 * `replacement` event to `events`, the same list that the surface appends to.
 */
export function prepare(lib: Lib, faces: Faces, scenario: DrawScenario, events: string[]): Prepared {
  const text = new lib.TMutableText(scenario.text);
  text.setAttributes(0, scenario.text.length, { typeface: faces[scenario.face], typeSize: scenario.size });
  for (const [from, to, name] of scenario.parts ?? []) {
    text.setAttributes(from, to, { typeface: faces[name] });
  }
  for (const [from, to, attributes] of scenario.attributes ?? []) {
    text.setAttributes(from, to, attributes);
  }

  let replacement: Library.Replacement | undefined;
  if (scenario.replacement !== undefined) {
    const { from, to, kind, ascent, descent, extent } = scenario.replacement;
    replacement = new lib.Replacement({
      computeRoom: (layoutWidth: number) => ({ ascent, descent, extent: extent < 0 ? layoutWidth : extent }),
      draw: (_context: unknown, bounds: Library.ReplacementBounds) => {
        events.push(format('replacement', bounds.x, bounds.y, bounds.ascent, bounds.descent, bounds.width));
      },
    }, lib.ReplacementKind[kind]);
    text.setAttributes(from, to, { replacement });
  }

  const typesetter = new lib.Typesetter(text);
  const resolver = new lib.FrameResolver();
  resolver.typesetter = typesetter;
  resolver.frameWidth = scenario.width;
  resolver.frameHeight = 1000;
  const frame = resolver.createFrame(0, scenario.text.length);

  const renderer = new lib.Renderer();
  renderer.typeface = faces[scenario.face];
  renderer.typeSize = scenario.size;
  for (const [name, value] of Object.entries(scenario.renderer ?? {})) {
    (renderer as unknown as Record<string, unknown>)[name] = name === 'drawStyle' ? lib.DrawStyle[value as 'Fill' | 'Stroke' | 'FillStroke'] : value;
  }

  for (const object of [resolver, typesetter, replacement, text]) {
    object?.dispose();
  }
  return {
    frame,
    renderer,
    dispose() {
      frame.dispose();
      renderer.dispose();
    },
  };
}

/**
 * The part of a 2D canvas context that Tehreer-Web's `CanvasPainter` uses, recording the normalised
 * events. It is what `drawingExpected.ts` was made with: pass it as the context of `frame.draw`
 * (cast to a canvas context), after `setImageSourceFactory((rgba, width, height) => ({ width, height }))`.
 */
export class CanvasRecorder {
  readonly events: string[];
  #fillStyle = '';

  constructor(events: string[]) {
    this.events = events;
  }

  get fillStyle(): string {
    return this.#fillStyle;
  }

  set fillStyle(value: string) {
    this.#fillStyle = value;
  }

  set shadowColor(value: string) {
    this.events.push(format('shadowColor', value));
  }

  set shadowBlur(value: number) {
    this.events.push(format('shadowBlur', value));
  }

  set shadowOffsetX(value: number) {
    this.events.push(format('shadowOffsetX', value));
  }

  set shadowOffsetY(value: number) {
    this.events.push(format('shadowOffsetY', value));
  }

  save(): void {
    this.events.push('save');
  }

  restore(): void {
    this.events.push('restore');
  }

  beginPath(): void {
    this.events.push('beginPath');
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.events.push(format('rect', x, y, width, height));
  }

  clip(): void {
    this.events.push('clip');
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.events.push(format('fillRect', x, y, width, height, this.#fillStyle));
  }

  drawImage(source: { width: number; height: number }, ...position: number[]): void {
    this.events.push(format('drawImage', ...position, `${source.width}x${source.height}`));
  }
}
