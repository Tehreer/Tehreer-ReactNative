import { useEffect, useRef, useState } from 'react';
import { PixelRatio, StyleSheet, Text, View } from 'react-native';
import { FontFile } from '../../src/graphics/FontFile';
import type { Typeface } from '../../src/graphics/Typeface';
import { TypefaceManager } from '../../src/graphics/TypefaceManager';
import { FrameResolver } from '../../src/layout/FrameResolver';
import { Typesetter } from '../../src/layout/Typesetter';
import { TextBase } from '../../src/views/TextBase';
import { fontBytes, nastaliqFontBytes } from './fontData';
import type { SuiteReport } from './runSuites';

// The suite of issue #26: the Fabric component whose Yoga measure function lays text out in C++
// with Core. Each case renders the component with `maxWidth`, then compares what Yoga laid out
// (`onLayout`) and what the native view read from the shadow node's state (`onFrameReady`) with the
// frame that the JavaScript API makes for the same text, typeface, size and width. It renders, so
// it is not a synchronous `Suite`: App.tsx mounts `ViewTestHost` after the synchronous suites.

export const viewSuiteName = 'views';

const ROBOTO_TAG = 9101;
const NASTALIQ_TAG = 9102;
const URDU = 'تحریر ایک متنی انجن ہے';
const LATIN = 'abc abc abc abc abc';

interface ViewCase {
  name: string;
  text: string;
  face: 'roboto' | 'nastaliq' | 'missing';
  size: number;
  width: number;
  maxLines?: number;
}

export const viewCases: readonly ViewCase[] = [
  { name: 'latin-70', text: LATIN, face: 'roboto', size: 20, width: 70 },
  { name: 'latin-120', text: LATIN, face: 'roboto', size: 20, width: 120 },
  { name: 'latin-300', text: LATIN, face: 'roboto', size: 20, width: 300 },
  { name: 'latin-big-70', text: LATIN, face: 'roboto', size: 31.5, width: 70 },
  { name: 'latin-maxlines2', text: LATIN, face: 'roboto', size: 20, width: 70, maxLines: 2 },
  { name: 'urdu-100', text: URDU, face: 'nastaliq', size: 30, width: 100 },
  { name: 'urdu-150', text: URDU, face: 'nastaliq', size: 30, width: 150 },
  { name: 'urdu-400', text: URDU, face: 'nastaliq', size: 30, width: 400 },
  { name: 'emoji-mixed', text: 'abc \u{1F600} abc', face: 'roboto', size: 20, width: 60 },
  { name: 'empty-text', text: '', face: 'roboto', size: 20, width: 100 },
  { name: 'unknown-typeface', text: LATIN, face: 'missing', size: 20, width: 100 },
];

interface Measured {
  layout?: { width: number; height: number };
  event?: { lineCount: number; width: number; height: number };
}

interface Expected {
  width: number;
  height: number;
  lineCount: number;
}

function expectedFrame(testCase: ViewCase, faces: Record<string, Typeface>): Expected {
  const typeface = faces[testCase.face];
  if (typeface === undefined || testCase.text === '') {
    return { width: 0, height: 0, lineCount: 0 };
  }
  const typesetter = new Typesetter(testCase.text, { typeface, typeSize: testCase.size });
  const resolver = new FrameResolver();
  try {
    resolver.typesetter = typesetter;
    resolver.frameWidth = testCase.width;
    resolver.frameHeight = Infinity;
    resolver.fitsHorizontally = true;
    resolver.fitsVertically = true;
    if (testCase.maxLines !== undefined) {
      resolver.maxLines = testCase.maxLines;
    }
    const frame = resolver.createFrame(0, testCase.text.length);
    try {
      return { width: frame.width, height: frame.height, lineCount: frame.lines.length };
    } finally {
      frame.dispose();
    }
  } finally {
    resolver.dispose();
    typesetter.dispose();
  }
}

/**
 * Yoga rounds a measured size up to the pixel grid, and the rounding of the position above adds up
 * to a second pixel, so a laid out size may exceed the frame by two pixels.
 */
const roundUp = () => 1 / PixelRatio.get() + 0.01;

function judge(testCase: ViewCase, expected: Expected, measured: Measured): string[] {
  const failures: string[] = [];
  const fail = (what: string, message: string) => failures.push(`${testCase.name}/${what}: ${message}`);
  const within = (actual: number, wanted: number) => actual >= wanted - 0.01 && actual <= wanted + 2 * roundUp();

  if (measured.layout === undefined) {
    fail('layout', 'onLayout was never called');
  } else {
    if (!within(measured.layout.width, expected.width)) {
      fail('width', `laid out ${measured.layout.width}, the frame is ${expected.width}`);
    }
    if (!within(measured.layout.height, expected.height)) {
      fail('height', `laid out ${measured.layout.height}, the frame is ${expected.height}`);
    }
  }
  if (measured.event === undefined) {
    fail('event', 'the native view never reported a frame');
  } else {
    if (measured.event.lineCount !== expected.lineCount) {
      fail('lines', `the view read ${measured.event.lineCount} lines (${measured.event.width}x${measured.event.height}) from the state, the frame has ${expected.lineCount}; laid out ${JSON.stringify(measured.layout)}`);
    }
    // The state's frame was composed for the box Yoga chose, which is the measured size rounded up.
    if (!within(measured.event.width, expected.width) || !within(measured.event.height, expected.height)) {
      fail('state', `the view read ${measured.event.width}x${measured.event.height}, the frame is ${expected.width}x${expected.height}`);
    }
  }
  return failures;
}

const settleMs = 600;
const limitMs = 20_000;

/** Mounts every case, waits until the callbacks settle, and reports once. */
export function ViewTestHost({ onDone }: { onDone: (report: SuiteReport) => void }) {
  const [faces, setFaces] = useState<Record<string, Typeface> | undefined>();
  const [error, setError] = useState<string | undefined>();
  const measured = useRef<Measured[]>(viewCases.map(() => ({})));
  const lastCallback = useRef(Date.now());
  const reported = useRef(false);

  useEffect(() => {
    const files = [new FontFile(fontBytes), new FontFile(nastaliqFontBytes)];
    const roboto = files[0]!.typefaces.get(0);
    const nastaliq = files[1]!.typefaces.get(0);
    try {
      if (!TypefaceManager.registerTypeface(roboto, ROBOTO_TAG) || !TypefaceManager.registerTypeface(nastaliq, NASTALIQ_TAG)) {
        throw new Error('the tags of the view tests are taken');
      }
      setFaces({ roboto, nastaliq });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    return () => {
      TypefaceManager.unregisterTypeface(roboto);
      TypefaceManager.unregisterTypeface(nastaliq);
    };
  }, []);

  useEffect(() => {
    if (faces === undefined && error === undefined) {
      return;
    }
    const started = Date.now();
    const timer = setInterval(() => {
      const quiet = Date.now() - lastCallback.current > settleMs;
      const complete = measured.current.every((m) => m.layout !== undefined && m.event !== undefined);
      if (reported.current || !((quiet && complete) || Date.now() - started > limitMs)) {
        return;
      }
      reported.current = true;
      clearInterval(timer);
      const failures: string[] = [];
      if (faces === undefined) {
        failures.push(`(setup): ${error}`);
      } else {
        viewCases.forEach((testCase, index) => {
          try {
            failures.push(...judge(testCase, expectedFrame(testCase, faces), measured.current[index]!));
          } catch (e) {
            failures.push(`${testCase.name}/(expected): ${e instanceof Error ? e.message : String(e)}`);
          }
        });
      }
      // Four checks a case: width, height, lines read from the state, size read from the state.
      const total = viewCases.length * 4;
      onDone({ name: viewSuiteName, passed: Math.max(0, total - failures.length), total, failures });
    }, 100);
    return () => clearInterval(timer);
  }, [faces, error, onDone]);

  const tag = (face: ViewCase['face']) => (face === 'roboto' ? ROBOTO_TAG : face === 'nastaliq' ? NASTALIQ_TAG : 4242);

  return (
    <View style={styles.host} testID="viewTests">
      <Text style={styles.caption}>{faces ? 'Views' : 'Views: setting up'}</Text>
      {faces &&
        viewCases.map((testCase, index) => (
          <TextBase
            key={testCase.name}
            testID={`view-${testCase.name}`}
            text={testCase.text}
            typefaceTag={tag(testCase.face)}
            typeSize={testCase.size}
            maxLines={testCase.maxLines ?? 0}
            style={{ maxWidth: testCase.width, alignSelf: 'flex-start', marginBottom: 2 }}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              measured.current[index]!.layout = { width, height };
              lastCallback.current = Date.now();
            }}
            onFrameReady={(e) => {
              measured.current[index]!.event = { ...e.nativeEvent };
              lastCallback.current = Date.now();
            }}
          />
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { alignSelf: 'stretch', alignItems: 'flex-start', paddingHorizontal: 16 },
  caption: { fontSize: 12, color: '#000000' },
});
