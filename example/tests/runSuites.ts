import type { NativeBindings } from '../../src/internal/NativeBindings';
import type { Suite } from './index';

export interface SuiteReport {
  name: string;
  passed: number;
  total: number;
  failures: string[];
}

const oneLine = (text: string) => text.replace(/\s*[\r\n]+\s*/g, ' ');

/**
 * Runs every suite. A suite that throws as a whole counts as one failed test, so that a crash
 * cannot be mistaken for a pass; a failing suite never stops the ones after it.
 */
export function runSuites(bindings: NativeBindings, list: readonly Suite[]): SuiteReport[] {
  return list.map((suite) => {
    try {
      const outcome = suite.run(bindings);
      return { name: suite.name, ...outcome, failures: outcome.failures.map(oneLine) };
    } catch (e) {
      const message = oneLine(e instanceof Error ? e.message : String(e));
      return { name: suite.name, passed: 0, total: 1, failures: [`(suite): ${message}`] };
    }
  });
}
