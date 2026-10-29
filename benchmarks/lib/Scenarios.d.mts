export interface Segment {
  font: string;
  text: string;
}

export interface Counts {
  warmup: number;
  iterations: number;
}

export interface Scenario {
  id: string;
  title: string;
  segments: Segment[];
  repeat: number;
  characters: number;
  typeSize: number;
  width: number;
  layout: Counts;
  draw: Counts;
}

export interface ScenarioFile {
  schema: 1;
  fontsDirectory: string;
  fonts: Record<string, string>;
  frameHeight: number;
  scenarios: Scenario[];
}

export const METRICS: readonly ["layoutMs", "drawMs", "memLayoutKB"];
export function expandText(scenario: Pick<Scenario, "segments" | "repeat">): string;
export function expandRuns(scenario: Pick<Scenario, "segments" | "repeat">): [number, number, string][];
export function validateScenarios(definition: unknown): ScenarioFile;
