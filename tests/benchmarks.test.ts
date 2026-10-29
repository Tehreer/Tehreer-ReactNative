import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { aggregateRuns, compare, formatComparisonTable, isFinished, median, parseBenchLog } from "../benchmarks/lib/Results.mjs";
import { formatReport } from "../benchmarks/lib/Report.mjs";
import { validateScenarios } from "../benchmarks/lib/Scenarios.mjs";

const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path));
function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  assert.ok(item !== undefined);
  return item;
}
const definition = JSON.parse(read("benchmarks/scenarios.json").toString("utf8")) as unknown;

test("the scenario file is valid and its character counts are right", () => {
  const file = validateScenarios(definition);
  assert.ok(file.scenarios.length >= 5);
  assert.ok(file.scenarios.some((scenario) => scenario.characters >= 20000));
});

test("the fonts are Core's test fonts, and the example copies are equal byte for byte", () => {
  const file = validateScenarios(definition);
  for (const name of Object.values(file.fonts)) {
    const core = read(`${file.fontsDirectory}/${name}`);
    assert.ok(core.length > 0);
    assert.deepEqual(read(`example/assets/fonts/${name}`), core);
  }
});

test("a bad scenario file is refused with a reason", () => {
  const file = structuredClone(definition) as { scenarios: { characters: number; id: string; segments: { font: string }[] }[] };
  const first = at(file.scenarios, 0);
  first.characters += 1;
  assert.throws(() => validateScenarios(file), /characters is/);
  first.characters -= 1;
  at(first.segments, 0).font = "nope";
  assert.throws(() => validateScenarios(file), /unknown font/);
  at(first.segments, 0).font = "latin";
  at(file.scenarios, 1).id = first.id;
  assert.throws(() => validateScenarios(file), /duplicate/);
  assert.throws(() => validateScenarios({ schema: 2 }), /schema/);
});

const summary = (median: number) => ({ n: 3, min: median, median, p90: median, max: median });
const line = (tag: string, value: unknown) => `01-01 12:00:00.000 I ReactNativeJS: ${tag} ${JSON.stringify(value)}`;
const result = (scenario: string, layout: number, draw: number, memory: number, lines = 4) =>
  ({ scenario, lines, frameHeight: 80, layoutMs: summary(layout), drawMs: summary(draw), memLayoutKB: summary(memory) });

test("a log is parsed through its prefixes, and a cut line is reported", () => {
  const log = [
    "noise", line("BENCH_META", { wrapper: "x" }), line("BENCH_RESULT", result("a", 1, 2, 3)),
    'I ReactNativeJS: BENCH_RESULT {"scenario":"b"', line("BENCH_DONE", {}), "",
  ].join("\n");
  const parsed = parseBenchLog(log);
  assert.equal(parsed.meta?.wrapper, "x");
  assert.equal(parsed.results.length, 1);
  assert.equal(parsed.done, true);
  assert.equal(parsed.problems.length, 1);
  assert.equal(isFinished(log), true);
  assert.equal(isFinished(line("BENCH_DONE", {})), false, "a line is complete at its newline");
  assert.equal(parseBenchLog(line("BENCH_ERROR", { message: "boom" })).error, "boom");
});

test("lines of an earlier launch that are still in the log do not count", () => {
  const old = [line("BENCH_META", { wrapper: "old" }), line("BENCH_RESULT", result("a", 9, 9, 9)), line("BENCH_DONE", {}), ""].join("\n");
  assert.equal(isFinished(old), true);
  assert.equal(isFinished(`${old}\n`), true);
  const restarted = `${old}\n${line("BENCH_META", { wrapper: "new" })}\n${line("BENCH_RESULT", result("b", 1, 1, 1))}\n`;
  assert.equal(isFinished(restarted), false);
  const parsed = parseBenchLog(`${restarted}${line("BENCH_DONE", {})}\n`);
  assert.equal(parsed.meta?.wrapper, "new");
  assert.deepEqual(parsed.results.map((entry) => entry.scenario), ["b"]);
  assert.equal(isFinished(`${line("BENCH_DONE", {})}\n`), false, "a DONE without a META is a leftover");
});

test("runs are aggregated by median and compared with a 20 percent threshold", () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  const runs = (values: number[]) => values.map((value) => ({ results: [result("a", value, 10, 100), result("b", 5, 10, 100)] }));
  const rn = aggregateRuns(runs([3, 1, 2]));
  assert.equal(at(rn, 0).metrics.layoutMs?.value, 2);
  assert.equal(at(rn, 0).metrics.layoutMs?.min, 1);
  assert.equal(at(rn, 0).metrics.layoutMs?.max, 3);
  const native = aggregateRuns(runs([2, 2, 2]));
  const rows = compare(rn, native);
  assert.equal(rows.find((row) => row.scenario === "a" && row.metric === "layoutMs")?.flagged, false);
  const slower = compare(aggregateRuns(runs([2.5, 2.5, 2.5])), native);
  assert.equal(slower.find((row) => row.scenario === "a" && row.metric === "layoutMs")?.flagged, true);
  assert.match(formatComparisonTable(slower, "Native"), />20% worse/);
});

test("the report names the flagged rows", () => {
  const file = validateScenarios(definition);
  const make = (layout: number) => aggregateRuns([{ results: file.scenarios.map((scenario) => result(scenario.id, layout, 1, 10)) }]);
  const text = formatReport({
    environment: { date: "2026-01-01T00:00:00Z", host: { cpu: "cpu", macOS: "1" }, coreVersion: "1.0.0", coreCommit: "abc", wrapperCommit: "def", runs: 1, ios: { name: "iPhone", os: "iOS 18" } },
    metas: {},
    aggregates: { "react-native/ios": make(3), "tehreer-cocoa/ios": make(1) },
    definition: file,
  });
  assert.match(text, /more than 20% worse/);
  assert.match(text, /\| ios \| latin-label \| layoutMs \|/);
});

test("the benchmark is not a device test suite, and the runner never kills by name", () => {
  assert.doesNotMatch(read("example/tests/index.ts").toString("utf8"), /benchmark/i);
  assert.doesNotMatch(read("example/App.tsx").toString("utf8"), /benchmark/i);
  const banned = /\b(pkill|killall|taskkill|pgrep)\b/;
  assert.doesNotMatch(read("benchmarks/run.mjs").toString("utf8"), banned);
});
