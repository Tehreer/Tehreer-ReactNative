import { FontFile, FrameResolver, Renderer, TMutableText, Typesetter } from 'tehreer-react-native';
import type { Typeface } from 'tehreer-react-native';
import type { NativeBindings } from '../../src/internal/NativeBindings';
import scenarioFile from '../../benchmarks/scenarios.json';
import { expandRuns, expandText } from '../../benchmarks/lib/Scenarios.mjs';

// The React Native runner of benchmarks/scenarios.json. What is measured, and how, is written in
// benchmarks/README.md; Tehreer-Android and Tehreer-Cocoa run the same steps in benchmarks/android and
// benchmarks/cocoa. Fonts are the files of Core's Tests/Fonts (copies in example/assets/fonts, equal
// byte for byte, which tests/benchmarks.test.ts checks); nothing is embedded in code.

const fontAssets: Record<string, number> = {
  'Roboto-Regular.abc.ttf': require('../assets/fonts/Roboto-Regular.abc.ttf') as number,
  'NotoNastaliqUrdu-Regular.ttf': require('../assets/fonts/NotoNastaliqUrdu-Regular.ttf') as number,
};

interface Counts {
  warmup: number;
  iterations: number;
}

interface Scenario {
  id: string;
  segments: { font: string; text: string }[];
  repeat: number;
  characters: number;
  typeSize: number;
  width: number;
  layout: Counts;
  draw: Counts;
}

interface Options {
  platform: string;
  osVersion: string;
  isDebug: boolean;
  coreVersion: string;
  report(tag: string, value: unknown): void;
  progress(status: string): void;
}

const scenarioList = scenarioFile.scenarios as Scenario[];
const fontFiles = scenarioFile.fonts as Record<string, string>;
const frameHeight = scenarioFile.frameHeight;

/** The summary that is logged instead of the samples: n, min, median, p90 (nearest rank), max. */
function summarize(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  const median = sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
  return {
    n: sorted.length, min: sorted[0]!, median, p90: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))]!, max: sorted[sorted.length - 1]!,
  };
}

const yieldToJs = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function nowMs(): number {
  return globalThis.performance.now();
}

/** The styled text of a scenario: the type size everywhere and the font of each segment. */
function makeText(scenario: Scenario, faces: Map<string, Typeface>): TMutableText {
  const styled = new TMutableText(expandText(scenario));
  for (const [start, end, font] of expandRuns(scenario)) {
    styled.setAttributes(start, end, { typeface: faces.get(font), typeSize: scenario.typeSize });
  }
  return styled;
}

function layoutOnce(scenario: Scenario, text: TMutableText) {
  const start = nowMs();
  const typesetter = new Typesetter(text);
  const resolver = new FrameResolver();
  resolver.typesetter = typesetter;
  resolver.frameWidth = scenario.width;
  resolver.frameHeight = frameHeight;
  // The frame is as high as its lines (otherwise it is the box, and the canvas would be a million pixels).
  resolver.fitsVertically = true;
  const frame = resolver.createFrame(0, text.length);
  const elapsed = nowMs() - start;
  return { typesetter, resolver, frame, elapsed };
}

function memory(bindings: NativeBindings): { heapKB: number; residentKB: number } {
  return bindings.benchMemory!();
}

async function runScenario(scenario: Scenario, faces: Map<string, Typeface>, bindings: NativeBindings) {
  // Memory first, three times with everything released in between: the median is the number.
  // The native heap in use with a typesetter and a frame alive, minus before the text existed.
  const memSamples: number[] = [];
  for (let i = 0; i < 3; i++) {
    const before = memory(bindings).heapKB;
    const text = makeText(scenario, faces);
    const made = layoutOnce(scenario, text);
    text.dispose();
    const after = memory(bindings).heapKB;
    memSamples.push(after - before);
    made.frame.dispose();
    made.resolver.dispose();
    made.typesetter.dispose();
  }

  const layoutMs: number[] = [];
  const text = makeText(scenario, faces);
  let lines = 0;
  let height = 0;
  let width = 0;
  let last: ReturnType<typeof layoutOnce> | undefined;
  for (let i = 0; i < scenario.layout.warmup + scenario.layout.iterations; i++) {
    const made = layoutOnce(scenario, text);
    if (i >= scenario.layout.warmup) {
      layoutMs.push(made.elapsed);
    }
    if (last === undefined) {
      last = made;
    } else {
      made.frame.dispose();
      made.resolver.dispose();
      made.typesetter.dispose();
    }
  }
  const kept = last!;
  lines = kept.frame.lines.length;
  height = kept.frame.height;
  width = kept.frame.width;

  const renderer = new Renderer();
  renderer.typeface = faces.get(scenario.segments[0]!.font)!;
  renderer.typeSize = scenario.typeSize;
  renderer.renderScale = 1;
  const canvasHeight = Math.ceil(height);
  const drawMs = bindings.benchDrawFrame!(kept.frame.nativeHandle, renderer.nativeHandle, {
    width: scenario.width, height: canvasHeight, warmup: scenario.draw.warmup, iterations: scenario.draw.iterations,
  });

  renderer.dispose();
  kept.frame.dispose();
  kept.resolver.dispose();
  kept.typesetter.dispose();
  text.dispose();
  return { scenario: scenario.id, characters: scenario.characters, lines, frameWidth: width, frameHeight: height, layoutMs: summarize(layoutMs), drawMs: summarize(drawMs), memLayoutKB: summarize(memSamples) };
}

export async function runBenchmark(options: Options): Promise<void> {
  const bindings = (globalThis as unknown as { __tehreer: NativeBindings }).__tehreer;
  if (bindings.benchDrawFrame === undefined || bindings.benchMemory === undefined) {
    throw new Error('this build has no benchmark hooks: build with TEHREER_BENCHMARKS (benchmarks/README.md)');
  }

  const faces = new Map<string, Typeface>();
  const files: FontFile[] = [];
  for (const [name, file] of Object.entries(fontFiles)) {
    const asset = fontAssets[file];
    if (asset === undefined) {
      throw new Error(`no asset for the font ${file}`);
    }
    const fontFile = await FontFile.fromAsset(asset);
    files.push(fontFile);
    faces.set(name, fontFile.typefaces.get(0));
  }

  const start = memory(bindings);
  options.report('BENCH_META', {
    wrapper: 'react-native',
    platform: options.platform,
    osVersion: options.osVersion,
    build: options.isDebug ? 'Debug' : 'Release',
    coreVersion: options.coreVersion,
    engine: (globalThis as { HermesInternal?: unknown }).HermesInternal === undefined ? 'unknown' : 'hermes',
    renderScale: 1,
    residentKBStart: start.residentKB,
    heapKBStart: start.heapKB,
  });

  for (const scenario of scenarioList) {
    options.progress(scenario.id);
    await yieldToJs();
    options.report('BENCH_RESULT', await runScenario(scenario, faces, bindings));
  }

  const end = memory(bindings);
  options.report('BENCH_DONE', { residentKBEnd: end.residentKB, heapKBEnd: end.heapKB });
  options.progress('done');
}
