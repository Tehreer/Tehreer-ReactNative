// Parsing the BENCH lines that the runners log, summarizing repeated runs, comparing React Native
// with a native wrapper and writing the Markdown table of benchmarks/RESULTS.md.
//
// Line format (one JSON object after the tag; any log prefix before the tag is ignored):
//   BENCH_META {"wrapper":"react-native","platform":"ios","build":"Release",...}
//   BENCH_RESULT {"scenario":"latin-label","characters":11,"lines":1,"frameHeight":19,
//                 "layoutMs":{"n":300,"min":..,"median":..,"p90":..,"max":..},"drawMs":{..},"memLayoutKB":{..}}
// The samples are summarized by the runner (a log line is cut at about 4000 characters on Android).
//   BENCH_DONE {}
//   BENCH_ERROR {"message":"..."}

const TAG = /BENCH_(META|RESULT|DONE|ERROR) (\{.*\})\s*$/;

/**
 * The part of a log that belongs to the last launch: from its last BENCH_META line. A device log can
 * still hold the lines of an earlier launch when the reader starts, and those must not count.
 */
function lastLaunch(text) {
  const start = text.lastIndexOf("BENCH_META ");
  return start < 0 ? text : text.slice(text.lastIndexOf("\n", start) + 1);
}

/** Reads a log. A line that does not parse is reported in `problems`, never silently skipped. */
export function parseBenchLog(text) {
  const parsed = { meta: undefined, results: [], done: false, error: undefined, problems: [] };
  for (const line of lastLaunch(text).split(/\r?\n/)) {
    if (!line.includes("BENCH_")) continue;
    const match = TAG.exec(line);
    if (!match) {
      parsed.problems.push(`unreadable line: ${line.slice(0, 120)}`);
      continue;
    }
    let value;
    try {
      value = JSON.parse(match[2]);
    } catch (error) {
      parsed.problems.push(`bad JSON in ${match[1]}: ${error.message}`);
      continue;
    }
    switch (match[1]) {
      case "META": parsed.meta = value; break;
      case "RESULT": parsed.results.push(value); break;
      case "DONE": parsed.done = true; break;
      default: parsed.error = String(value.message ?? "unknown error");
    }
  }
  return parsed;
}

/** True once a complete DONE or ERROR line is in the log (a line is complete at its newline). */
export function isFinished(text) {
  const launch = lastLaunch(text);
  // Without a META line only an error can end the launch; a DONE can be left over from an earlier one.
  const ends = launch.includes("BENCH_META ") ? /BENCH_(DONE|ERROR) \{.*\}\r?\n/ : /BENCH_ERROR \{.*\}\r?\n/;
  return ends.test(launch);
}

export function median(values) {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    n: sorted.length,
    min: sorted[0],
    median: median(sorted),
    // p90 is the sample at index floor(0.9 n) of the sorted samples (the upper one, not interpolated).
    p90: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))],
    max: sorted[sorted.length - 1],
  };
}

/**
 * Combines the logs of several launches of one runner: for each scenario and metric the median of
 * the per-launch medians, and the lowest and highest of them, which show how noisy the number is.
 */
export function aggregateRuns(runs) {
  const byScenario = new Map();
  for (const run of runs) {
    for (const result of run.results) {
      const entry = byScenario.get(result.scenario) ?? { scenario: result.scenario, lines: [], frameHeights: [], medians: { layoutMs: [], drawMs: [], memLayoutKB: [], memLayoutNativeKB: [], memLayoutManagedKB: [] } };
      entry.lines.push(result.lines);
      entry.frameHeights.push(result.frameHeight);
      for (const metric of Object.keys(entry.medians)) {
        const summary = result[metric];
        if (summary && Number.isFinite(summary.median)) entry.medians[metric].push(summary.median);
      }
      byScenario.set(result.scenario, entry);
    }
  }
  return [...byScenario.values()].map((entry) => {
    const metrics = {};
    for (const [metric, values] of Object.entries(entry.medians)) {
      if (values.length > 0) metrics[metric] = { value: median(values), min: Math.min(...values), max: Math.max(...values), runs: values.length };
    }
    return { scenario: entry.scenario, lines: median(entry.lines), frameHeight: median(entry.frameHeights), metrics };
  });
}

/** A time below this (ms) is at the resolution of the clocks and of scheduling; ratios there are not results. */
export const TIME_FLOOR_MS = 0.02;

/** Launch ranges whose highest is at least this many times the lowest are too noisy for a ratio. */
export const NOISE_SPAN = 10;

function spansTooMuch(value) {
  return value.min <= 0 ? value.max > 0 : value.max / value.min >= NOISE_SPAN;
}

/**
 * Ratio of React Native to a native wrapper for each scenario and metric (above 1: React Native is
 * slower or larger). Rows carry a `quality`:
 *  - "noisy": a value is not positive, or the launches of either side span an order of magnitude
 *    (highest launch at least ${NOISE_SPAN} times the lowest, a lowest of 0 included). The ratio is NaN, shown as n/a.
 *  - "floor": both times are under TIME_FLOOR_MS. The ratio is kept but never flagged.
 *  - "ok" otherwise.
 * `flagged` is set only for "ok" rows where the ratio of the medians is above 1 + `threshold`
 * (default 20%) and the ranges of the launches do not overlap: React Native's best launch is slower
 * (larger) than the native wrapper's worst launch. A difference smaller than the launch-to-launch spread is not a finding.
 */
export function compare(reactNative, native, threshold = 0.2) {
  const rows = [];
  for (const left of reactNative) {
    const right = native.find((entry) => entry.scenario === left.scenario);
    if (!right) continue;
    for (const metric of ["layoutMs", "drawMs", "memLayoutKB"]) {
      const a = left.metrics[metric];
      const b = right.metrics[metric];
      if (!a || !b) continue;
      let quality = "ok";
      if (a.value <= 0 || b.value <= 0 || spansTooMuch(a) || spansTooMuch(b)) quality = "noisy";
      else if (metric !== "memLayoutKB" && a.value < TIME_FLOOR_MS && b.value < TIME_FLOOR_MS) quality = "floor";
      const ratio = quality === "noisy" ? NaN : a.value / b.value;
      const flagged = quality === "ok" && ratio > 1 + threshold && a.min > b.max;
      rows.push({ scenario: left.scenario, metric, reactNative: a, native: b, ratio, quality, flagged, sameLines: left.lines === right.lines });
    }
  }
  return rows;
}

export function number(value, digits) {
  if (value === undefined || Number.isNaN(value)) return "n/a";
  if (!Number.isFinite(value)) return "inf";
  return value.toFixed(digits);
}

const UNITS = { layoutMs: "ms", drawMs: "ms", memLayoutKB: "KB", memLayoutNativeKB: "KB", memLayoutManagedKB: "KB" };

export function digitsFor(metric, value) {
  if (metric.startsWith("mem")) return 0;
  return value < 1 ? 3 : value < 10 ? 2 : 1;
}

/** One table of a wrapper's numbers for every scenario (median of launches, range in brackets). */
export function formatWrapperTable(aggregate, scenarios) {
  const split = aggregate.some((entry) => entry.metrics.memLayoutManagedKB);
  const rows = [`| Scenario | Lines | Layout ms | Draw ms | Layout memory KB |${split ? " of it native / Java KB |" : ""}`, `|---|---:|---:|---:|---:|${split ? "---:|" : ""}`];
  for (const scenario of scenarios) {
    const entry = aggregate.find((candidate) => candidate.scenario === scenario.id);
    if (!entry) {
      rows.push(`| ${scenario.id} | n/a | n/a | n/a | n/a |${split ? " n/a |" : ""}`);
      continue;
    }
    const cell = (metric) => {
      const value = entry.metrics[metric];
      if (!value) return "n/a";
      const digits = digitsFor(metric, value.value);
      return `${number(value.value, digits)} (${number(value.min, digits)}-${number(value.max, digits)})`;
    };
    const parts = split ? ` ${number(entry.metrics.memLayoutNativeKB?.value, 0)} / ${number(entry.metrics.memLayoutManagedKB?.value, 0)} |` : "";
    rows.push(`| ${scenario.id} | ${entry.lines} | ${cell("layoutMs")} | ${cell("drawMs")} | ${cell("memLayoutKB")} |${parts}`);
  }
  return rows.join("\n");
}

/** The comparison table with the ratios; a flagged row ends with the sign `>20%`. */
export function formatComparisonTable(rows, nativeName) {
  const lines = [`| Scenario | Metric | React Native | ${nativeName} | RN / native | |`, "|---|---|---:|---:|---:|---|"];
  for (const row of rows) {
    const digits = digitsFor(row.metric, Math.min(row.reactNative.value, row.native.value));
    const note = [row.flagged ? "**>20% worse**" : "", row.quality === "noisy" ? "noisy, no ratio" : "", row.quality === "floor" ? "below time floor" : "", row.sameLines ? "" : "line counts differ"].filter(Boolean).join(", ");
    lines.push(`| ${row.scenario} | ${row.metric} (${UNITS[row.metric]}) | ${number(row.reactNative.value, digits)} | ${number(row.native.value, digits)} | ${number(row.ratio, 2)} | ${note} |`);
  }
  return lines.join("\n");
}
