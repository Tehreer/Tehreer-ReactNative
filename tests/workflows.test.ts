import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// There is no YAML parser in the dependencies (and none may be added), so the workflow files are
// read line by line. The files keep a fixed shape: two-space indentation, one key per line.
const directory = join(import.meta.dirname, "..", ".github", "workflows");
const files = readdirSync(directory).filter((name) => name.endsWith(".yml"));

function read(name: string): string {
  return readFileSync(join(directory, name), "utf8");
}

/** The text of each job, keyed by job id. */
function jobsOf(text: string): Map<string, string> {
  const jobs = new Map<string, string>();
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line === "jobs:");
  assert.notEqual(start, -1, "no jobs: key");
  let current: string | undefined;
  for (const line of lines.slice(start + 1)) {
    const header = /^ {2}([\w-]+):\s*$/.exec(line);
    if (header) {
      current = header[1] as string;
      jobs.set(current, "");
    } else if (current !== undefined) {
      jobs.set(current, jobs.get(current) + line + "\n");
    }
  }
  return jobs;
}

/** The trigger block: the lines between `on:` and the next top-level key. */
function triggersOf(text: string): string {
  const match = /^on:\n((?: .*\n|\n|#.*\n)*)/m.exec(text);
  assert.ok(match, "no on: key");
  return match[1] as string;
}

test("the expected workflow files exist", () => {
  assert.ok(files.includes("ci.yml"));
  assert.ok(files.includes("device-tests.yml"));
});

test("every checkout in every job fetches the submodules recursively", () => {
  for (const name of files) {
    for (const [job, body] of jobsOf(read(name))) {
      const checkouts = [...body.matchAll(/uses: actions\/checkout@[^\n]*\n((?: {8,}[^\n]*\n)*)/g)];
      assert.ok(checkouts.length > 0, `${name}/${job} has no checkout`);
      for (const checkout of checkouts) {
        assert.match(checkout[1] as string, /^\s+submodules: recursive$/m, `${name}/${job} checkout lacks submodules: recursive`);
      }
    }
  }
});

test("the new workflows use no secrets and only read the repository", () => {
  for (const name of ["ci.yml", "device-tests.yml"]) {
    const text = read(name);
    assert.doesNotMatch(text, /secrets\./, `${name} uses a secret`);
    assert.match(text, /^permissions:\n {2}contents: read$/m, `${name} must set read-only permissions`);
  }
});

test("every action is pinned to a version", () => {
  for (const name of files) {
    for (const use of read(name).matchAll(/uses: (\S+)/g)) {
      assert.match(use[1] as string, /@v\d+(\.\d+\.\d+)?$/, `${name}: ${use[1]} is not pinned to a version tag`);
    }
  }
});

test("ci.yml has a checks job for pull requests and pushes to main with the required steps", () => {
  const text = read("ci.yml");
  const triggers = triggersOf(text);
  assert.match(triggers, /^ {2}pull_request:/m);
  assert.match(triggers, /^ {2}push:\n {4}branches: \[main\]/m);
  const checks = jobsOf(text).get("checks");
  assert.ok(checks, "no checks job");
  assert.match(checks, /runs-on: ubuntu-latest/);
  assert.match(checks, /node-version: 22\.x/);
  for (const command of ["npm ci", "npm run typecheck", "npm run lint", "npm run generate:check", "npm test"]) {
    assert.ok(checks.includes(`run: ${command}`), `checks does not run ${command}`);
  }
  assert.match(text, /cancel-in-progress: \$\{\{ github\.event_name == 'pull_request' \}\}/);
});

test("device tests start only by hand or by the device-tests label", () => {
  const text = read("device-tests.yml");
  const triggers = triggersOf(text);
  assert.match(triggers, /^ {2}workflow_dispatch:/m);
  assert.match(triggers, /^ {2}pull_request:\n {4}types: \[labeled, synchronize\]/m);
  assert.doesNotMatch(triggers, /^ {2}push:/m);

  const jobs = jobsOf(text);
  assert.deepEqual([...jobs.keys()].sort(), ["android", "ios"]);
  for (const [job, body] of jobs) {
    const condition = /^ {4}if: >-\n((?: {6}.*\n)+)/m.exec(body)?.[1] ?? "";
    assert.match(condition, /event\.label\.name == 'device-tests'/, `${job} must check the label name`);
    assert.match(condition, /contains\(github\.event\.pull_request\.labels\.\*\.name, 'device-tests'\)/, `${job} must check the label on synchronize`);
    assert.match(condition, /head\.repo\.full_name == github\.repository/, `${job} must not run for forks`);
    assert.match(body, /timeout-minutes: \d+/, `${job} needs a timeout`);
    assert.match(body, /run: scripts\/fetch-deps/, `${job} must fetch the dependencies`);
  }
  assert.match(jobs.get("ios") as string, /runs-on: macos-/);
  assert.match(jobs.get("ios") as string, /run: npm run test:ios/);
  assert.match(jobs.get("android") as string, /runs-on: ubuntu-latest/);
  assert.match(jobs.get("android") as string, /reactivecircus\/android-emulator-runner@v/);
  assert.match(jobs.get("android") as string, /script: npm run test:android/);
});
