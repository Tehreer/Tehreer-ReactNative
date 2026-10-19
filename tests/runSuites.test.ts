import assert from "node:assert/strict";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

// The module only has type imports, so node can run the file of the example app directly. The path
// is built at run time because the example app is outside the typechecked project.
const file = pathToFileURL(new URL("../example/tests/runSuites.ts", import.meta.url).pathname).href;

interface Report {
  name: string;
  passed: number;
  total: number;
  failures: string[];
}
type Run = (bindings: unknown, suites: unknown[]) => Report[];
const { runSuites } = (await import(file)) as { runSuites: Run };

const ok = (name: string) => ({ name, run: () => ({ passed: 2, total: 2, failures: [] }) });

test("suites report their own counts and failures, one line each", () => {
  const failing = { name: "b", run: () => ({ passed: 1, total: 2, failures: ["t: line one\nline two"] }) };
  const reports = runSuites({}, [ok("a"), failing]);
  assert.deepEqual(reports[0], { name: "a", passed: 2, total: 2, failures: [] });
  assert.deepEqual(reports[1]?.failures, ["t: line one line two"]);
});

test("a suite that throws counts as one failed test and the next suite still runs", () => {
  const crashing = {
    name: "crash",
    run: () => {
      throw new Error("native\nmodule missing");
    }
  };
  const reports = runSuites({}, [crashing, ok("after")]);
  assert.deepEqual(reports[0], { name: "crash", passed: 0, total: 1, failures: ["(suite): native module missing"] });
  assert.equal(reports[1]?.name, "after");
  assert.equal(reports[1]?.passed, 2);
});

test("a thrown value that is not an Error is reported too", () => {
  const reports = runSuites({}, [{ name: "odd", run: () => { throw "plain"; } }]);
  assert.deepEqual(reports[0]?.failures, ["(suite): plain"]);
});
