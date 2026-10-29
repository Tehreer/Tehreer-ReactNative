export interface SampleSummary {
  n: number;
  min: number;
  median: number;
  p90: number;
  max: number;
}

export interface BenchResult {
  scenario: string;
  characters?: number;
  lines: number;
  frameHeight: number;
  layoutMs?: SampleSummary;
  drawMs?: SampleSummary;
  memLayoutKB?: SampleSummary;
  memLayoutNativeKB?: SampleSummary;
  memLayoutManagedKB?: SampleSummary;
}

export interface ParsedBenchLog {
  meta: Record<string, unknown> | undefined;
  results: BenchResult[];
  done: boolean;
  error: string | undefined;
  problems: string[];
}

export interface MetricValue {
  value: number;
  min: number;
  max: number;
  runs: number;
}

export interface ScenarioAggregate {
  scenario: string;
  lines: number;
  frameHeight: number;
  metrics: Partial<Record<"layoutMs" | "drawMs" | "memLayoutKB" | "memLayoutNativeKB" | "memLayoutManagedKB", MetricValue>>;
}

export interface ComparisonRow {
  scenario: string;
  metric: string;
  reactNative: MetricValue;
  native: MetricValue;
  ratio: number;
  quality: "ok" | "noisy" | "floor";
  flagged: boolean;
  sameLines: boolean;
}

export function parseBenchLog(text: string): ParsedBenchLog;
export function isFinished(text: string): boolean;
export function median(values: readonly number[]): number;
export function summarize(samples: readonly number[]): { n: number; min: number; median: number; p90: number; max: number };
export function aggregateRuns(runs: readonly Pick<ParsedBenchLog, "results">[]): ScenarioAggregate[];
export const TIME_FLOOR_MS: number;
export const NOISE_SPAN: number;
export function number(value: number | undefined, digits: number): string;
export function digitsFor(metric: string, value: number): number;
export function compare(reactNative: readonly ScenarioAggregate[], native: readonly ScenarioAggregate[], threshold?: number): ComparisonRow[];
export function formatWrapperTable(aggregate: readonly ScenarioAggregate[], scenarios: readonly { id: string }[]): string;
export function formatComparisonTable(rows: readonly ComparisonRow[], nativeName: string): string;
