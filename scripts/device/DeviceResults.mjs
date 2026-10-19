// Parser and checker of the lines the example app logs (format documented in AGENTS.md):
//
//   TEHREER_SUITE name=<n> passed=<p> total=<t>
//   TEHREER_FAIL <suite>/<test>: <message>
//   TEHREER_RESULT version=<v> smokeTest=<bool> suites=<k> passed=<p> total=<t>
//   TEHREER_RESULT error=<message>
//
// The lines come out of a system log, so they can be preceded by a log prefix and interleaved with
// unrelated output; only the marker and what follows it on the same line count.

const marker = /TEHREER_(SUITE|FAIL|RESULT) /;

/**
 * The first marker of a line decides what the line is. A failure message that happens to contain
 * another marker is therefore still a failure line and cannot add a suite or end the run.
 */
function classify(line) {
  const match = marker.exec(line);
  return match ? { kind: match[1], text: line.slice(match.index + match[0].length) } : undefined;
}

/** True once the log holds a complete (newline terminated) result line. */
export function hasResultLine(log) {
  const lines = log.split(/\r\n|\n|\r/);
  lines.pop(); // The last piece has no line break yet.
  return lines.some((line) => classify(line)?.kind === "RESULT");
}

function fields(text) {
  const values = new Map();
  for (const [, key, value] of text.matchAll(/(\w+)=(\S*)/g)) {
    values.set(key, value);
  }
  return values;
}

function count(value) {
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : undefined;
}

/**
 * Extracts the suite lines, the failures and the result line from a log. Only complete lines are
 * read, so a result line cut in the middle by the log stream is not mistaken for a final one.
 */
export function parseDeviceLog(log) {
  const suites = [];
  const failures = [];
  let result;

  const lines = log.split(/\r\n|\n|\r/);
  for (const line of lines) {
    const entry = classify(line);
    if (entry?.kind === "SUITE") {
      const values = fields(entry.text);
      suites.push({ name: values.get("name") ?? "", passed: count(values.get("passed")), total: count(values.get("total")) });
    } else if (entry?.kind === "FAIL") {
      const text = entry.text.trim();
      const split = /^([^/\s]+)\/(.*?): (.*)$/s.exec(text);
      failures.push(split ? { suite: split[1], test: split[2], message: split[3] } : { suite: "", test: text, message: "" });
    } else if (entry?.kind === "RESULT" && result === undefined) {
      const text = entry.text.trim();
      if (text.startsWith("error=")) {
        result = { error: text.slice("error=".length) };
      } else {
        const values = fields(text);
        result = {
          version: values.get("version"),
          smokeTest: values.get("smokeTest"),
          suites: count(values.get("suites")),
          passed: count(values.get("passed")),
          total: count(values.get("total")),
        };
      }
    }
  }

  return { suites, failures, result };
}

/**
 * Judges a parsed log. Returns the problems found; the run passed when the list is empty. Every
 * count is cross-checked so that a truncated or inconsistent log cannot pass by accident.
 */
export function checkDeviceResults(parsed, expectedVersion) {
  const problems = [];
  const { suites, failures, result } = parsed;

  if (result === undefined) {
    return ["no TEHREER_RESULT line was logged"];
  }
  if (result.error !== undefined) {
    return [`the app reported an error: ${result.error}`];
  }

  if (result.version !== expectedVersion) {
    problems.push(`Core version is ${result.version ?? "missing"}, expected ${expectedVersion}`);
  }
  if (result.smokeTest !== "true") {
    problems.push(`smokeTest is ${result.smokeTest ?? "missing"}, expected true`);
  }
  if (result.suites === undefined || result.passed === undefined || result.total === undefined) {
    problems.push("the result line lacks suites, passed or total");
  } else {
    if (result.suites === 0 || result.total === 0) {
      problems.push("no tests ran");
    }
    if (result.suites !== suites.length) {
      problems.push(`the result line counts ${result.suites} suites but ${suites.length} suite lines were logged`);
    }
    if (result.passed !== result.total) {
      problems.push(`${result.total - result.passed} of ${result.total} tests did not pass`);
    }
    const sum = (key) => suites.reduce((acc, suite) => acc + (suite[key] ?? 0), 0);
    if (sum("passed") !== result.passed || sum("total") !== result.total) {
      problems.push("the suite lines do not add up to the result line");
    }
  }

  for (const suite of suites) {
    if (suite.passed === undefined || suite.total === undefined) {
      problems.push(`suite ${suite.name} has an unreadable line`);
    } else if (suite.passed !== suite.total) {
      problems.push(`suite ${suite.name}: ${suite.passed}/${suite.total} passed`);
    }
  }
  if (failures.length > 0) {
    problems.push(`${failures.length} failing test${failures.length === 1 ? "" : "s"}`);
  }

  return problems;
}

/** Human readable summary: one line per suite, then every failure with its message. */
export function formatSummary(parsed) {
  const lines = parsed.suites.map((suite) => `  ${suite.name}: ${suite.passed ?? "?"}/${suite.total ?? "?"} passed`);
  for (const failure of parsed.failures) {
    lines.push(`  FAIL ${failure.suite ? `${failure.suite}/` : ""}${failure.test}${failure.message ? `: ${failure.message}` : ""}`);
  }
  return lines.join("\n");
}
