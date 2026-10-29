import type { ScenarioAggregate } from "./Results.mjs";
import type { ScenarioFile } from "./Scenarios.mjs";

export function formatReport(input: {
  environment: {
    date: string;
    host: { cpu: string; macOS: string };
    coreVersion: string;
    coreCommit: string;
    wrapperCommit: string;
    siblingCommits?: Record<string, string>;
    runs: number;
    ios?: { name: string; os: string };
    android?: { model: string; avd: string; release: string; api: string; abi: string };
  };
  metas: Record<string, { build?: string; engine?: string; coreVersion?: string } | undefined>;
  aggregates: Record<string, ScenarioAggregate[]>;
  definition: ScenarioFile;
}): string;
