export interface SuiteLine {
  name: string;
  passed: number | undefined;
  total: number | undefined;
}

export interface FailureLine {
  suite: string;
  test: string;
  message: string;
}

export type ResultLine =
  | { error: string }
  | {
      version: string | undefined;
      smokeTest: string | undefined;
      suites: number | undefined;
      passed: number | undefined;
      total: number | undefined;
    };

export interface ParsedDeviceLog {
  suites: SuiteLine[];
  failures: FailureLine[];
  result: ResultLine | undefined;
}

export function hasResultLine(log: string): boolean;
export function parseDeviceLog(log: string): ParsedDeviceLog;
export function checkDeviceResults(parsed: ParsedDeviceLog, expectedVersion: string): string[];
export function formatSummary(parsed: ParsedDeviceLog): string;
