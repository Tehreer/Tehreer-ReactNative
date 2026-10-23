import type { NativeBindings } from '../../src/internal/NativeBindings';
import { handleTestCount, runHandleTests } from './HandleTests';
import { callbackTestCount, runCallbackTests } from '../../tests/device/CallbackTests';
import { listTestCount, runListTests } from '../../tests/device/ListTests';
import { runStructTests, structTestCount } from '../../tests/device/StructTests';
import { graphicsTestCount, runGraphicsTests } from './GraphicsTests';
import { runTypefaceManagerTests, typefaceManagerTestCount } from './TypefaceManagerTests';
import { pathTestCount, runPathTests } from './PathTests';
import { drawingTestCount, runDrawingTests } from './DrawingTests';
import { layoutTestCount, runLayoutTests } from './LayoutTests';
import { rendererTestCount, runRendererTests } from './RendererTests';
import { runShapingTests, shapingTestCount } from './ShapingTests';
import { runTextTests, textTestCount } from './TextTests';
import { runUnicodeTests, unicodeTestCount } from './UnicodeTests';
import { assetTestCount, runAssetTests } from './AssetTests';
import { fontBytes } from './fontData';
import { NativeObject } from '../../src/internal/NativeObject';
import { adopt } from '../../src/internal/Adopt';
import { IndexedList } from '../../src/collections/IndexedList';
import { coreIndices, coreNumbers, corePoints, coreStructs } from '../../src/collections/CoreList';

// The suite of the Fabric view renders, so it is not an entry here: App.tsx mounts `ViewTestHost`
// (ViewTests.tsx) after these and adds its report to the totals.

// The registry of the device suites. Each package or issue adds one entry here; App.tsx runs all of
// them and logs the outcome in the format documented in AGENTS.md (scripts/test-device.mjs reads it).

export interface SuiteOutcome {
  passed: number;
  total: number;
  /** One `<test>: <message>` per failed test. */
  failures: string[];
}

export interface Suite {
  /** Short name without spaces or slashes; it prefixes the failures in the log. */
  name: string;
  run(bindings: NativeBindings): SuiteOutcome;
}

/**
 * The suites that a release build runs. The others need the debug hooks of the native module, which
 * a release build does not have, and would fail there for that reason alone.
 */
export const releaseSuiteNames: readonly string[] = ['assets'];

export const suites: readonly Suite[] = [
  {
    name: 'handles',
    run: (bindings) => {
      const result = runHandleTests(bindings);
      return { passed: result.passed, total: handleTestCount, failures: result.failures };
    },
  },
  {
    name: 'structs',
    run: (bindings) => {
      const result = runStructTests(bindings);
      return { passed: result.passed, total: structTestCount, failures: result.failures };
    },
  },
  {
    name: 'callbacks',
    run: (bindings) => {
      const result = runCallbackTests(bindings, { fontBytes });
      return { passed: result.passed, total: callbackTestCount, failures: result.failures };
    },
  },
  {
    name: 'lists',
    run: (bindings) => {
      const library = { NativeObject, adopt, IndexedList, coreIndices, coreNumbers, corePoints, coreStructs };
      const result = runListTests(bindings, library, { fontBytes });
      return { passed: result.passed, total: listTestCount, failures: result.failures };
    },
  },
  {
    name: 'graphics',
    run: (bindings) => {
      const result = runGraphicsTests(bindings);
      return { passed: result.passed, total: graphicsTestCount, failures: result.failures };
    },
  },
  {
    name: 'typefacemanager',
    run: (bindings) => {
      const result = runTypefaceManagerTests(bindings);
      return { passed: result.passed, total: typefaceManagerTestCount, failures: result.failures };
    },
  },
  {
    name: 'path',
    run: (bindings) => {
      const result = runPathTests(bindings);
      return { passed: result.passed, total: pathTestCount, failures: result.failures };
    },
  },
  {
    name: 'renderer',
    run: (bindings) => {
      const result = runRendererTests(bindings);
      return { passed: result.passed, total: rendererTestCount, failures: result.failures };
    },
  },
  {
    name: 'shaping',
    run: (bindings) => {
      const result = runShapingTests(bindings);
      return { passed: result.passed, total: shapingTestCount, failures: result.failures };
    },
  },
  {
    name: 'unicode',
    run: (bindings) => {
      const result = runUnicodeTests(bindings);
      return { passed: result.passed, total: unicodeTestCount, failures: result.failures };
    },
  },
  {
    name: 'layout',
    run: (bindings) => {
      const result = runLayoutTests(bindings);
      return { passed: result.passed, total: layoutTestCount, failures: result.failures };
    },
  },
  {
    name: 'text',
    run: (bindings) => {
      const result = runTextTests(bindings);
      return { passed: result.passed, total: textTestCount, failures: result.failures };
    },
  },
  {
    name: 'drawing',
    run: (bindings) => {
      const result = runDrawingTests(bindings);
      return { passed: result.passed, total: drawingTestCount, failures: result.failures };
    },
  },
  {
    name: 'assets',
    run: (bindings) => {
      const result = runAssetTests(bindings);
      return { passed: result.passed, total: assetTestCount, failures: result.failures };
    },
  },
];
