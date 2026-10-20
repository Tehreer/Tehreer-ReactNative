import type { NativeBindings } from '../../src/internal/NativeBindings';
import { handleTestCount, runHandleTests } from './HandleTests';
import { callbackTestCount, runCallbackTests } from '../../tests/device/CallbackTests';
import { listTestCount, runListTests } from '../../tests/device/ListTests';
import { runStructTests, structTestCount } from '../../tests/device/StructTests';
import { graphicsTestCount, runGraphicsTests } from './GraphicsTests';
import { fontBytes } from './fontData';
import { NativeObject } from '../../src/internal/NativeObject';
import { adopt } from '../../src/internal/Adopt';
import { IndexedList } from '../../src/collections/IndexedList';
import { coreIndices, coreNumbers, corePoints, coreStructs } from '../../src/collections/CoreList';

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
];
