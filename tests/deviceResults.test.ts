import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkDeviceResults,
  formatSummary,
  hasResultLine,
  parseDeviceLog
} from "../scripts/device/DeviceResults.mjs";

const good = [
  "2026-01-01 12:00:00.000 I ReactNativeJS: TEHREER_SUITE name=handles passed=3 total=3",
  "unrelated noise",
  "I ReactNativeJS: TEHREER_SUITE name=colors passed=2 total=2",
  "I ReactNativeJS: TEHREER_RESULT version=1.2.3 smokeTest=true suites=2 passed=5 total=5",
  ""
].join("\n");

test("a consistent log passes", () => {
  const parsed = parseDeviceLog(good);
  assert.equal(parsed.suites.length, 2);
  assert.deepEqual(checkDeviceResults(parsed, "1.2.3"), []);
});

test("a result line is complete only when it ends with a newline", () => {
  assert.equal(hasResultLine("TEHREER_RESULT version=1 smokeTest=tr"), false);
  assert.equal(hasResultLine("TEHREER_RESULT version=1 smokeTest=true\n"), true);
  assert.equal(hasResultLine("TEHREER_SUITE name=a passed=1 total=1\n"), false);
});

test("failures are split into suite, test and message", () => {
  const parsed = parseDeviceLog(
    "x TEHREER_FAIL handles/dispose twice: expected a RangeError: got none\nTEHREER_FAIL odd line\n"
  );
  assert.deepEqual(parsed.failures[0], {
    suite: "handles",
    test: "dispose twice",
    message: "expected a RangeError: got none"
  });
  assert.equal(parsed.failures[1]?.test, "odd line");
});

test("failing tests fail the run and show up in the summary", () => {
  const log = [
    "TEHREER_SUITE name=handles passed=2 total=3",
    "TEHREER_FAIL handles/leak: not released",
    "TEHREER_RESULT version=1.2.3 smokeTest=true suites=1 passed=2 total=3",
    ""
  ].join("\n");
  const parsed = parseDeviceLog(log);
  const problems = checkDeviceResults(parsed, "1.2.3");
  assert.ok(problems.some((problem) => /1 of 3 tests did not pass/.test(problem)));
  assert.ok(problems.some((problem) => /1 failing test/.test(problem)));
  const summary = formatSummary(parsed);
  assert.match(summary, /handles: 2\/3 passed/);
  assert.match(summary, /FAIL handles\/leak: not released/);
});

test("a missing result line, an app error and a wrong version fail", () => {
  assert.deepEqual(checkDeviceResults(parseDeviceLog("TEHREER_SUITE name=a passed=1 total=1\n"), "1"), [
    "no TEHREER_RESULT line was logged"
  ]);
  assert.match(
    checkDeviceResults(parseDeviceLog("TEHREER_RESULT error=boom\n"), "1")[0] ?? "",
    /reported an error: boom/
  );
  assert.ok(checkDeviceResults(parseDeviceLog(good), "9.9.9").some((p) => /Core version/.test(p)));
});

test("smokeTest false, zero tests and inconsistent counts fail", () => {
  const smoke = good.replace("smokeTest=true", "smokeTest=false");
  assert.ok(checkDeviceResults(parseDeviceLog(smoke), "1.2.3").some((p) => /smokeTest/.test(p)));

  const empty = "TEHREER_RESULT version=1.2.3 smokeTest=true suites=0 passed=0 total=0\n";
  assert.ok(checkDeviceResults(parseDeviceLog(empty), "1.2.3").some((p) => /no tests ran/.test(p)));

  const missingSuite = good.replace(/^.*name=colors.*\n/m, "");
  assert.ok(checkDeviceResults(parseDeviceLog(missingSuite), "1.2.3").length > 0);

  const lying = good.replace("passed=5 total=5", "passed=9 total=9");
  assert.ok(checkDeviceResults(parseDeviceLog(lying), "1.2.3").some((p) => /do not add up/.test(p)));
});
