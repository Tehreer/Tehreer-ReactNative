import type { NativeBindings } from '../../src/internal/NativeBindings';
import { handleTestCount, runHandleTests } from './HandleTests';

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
];
