import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const fetchDeps = new URL("../scripts/fetch-deps", import.meta.url).pathname;
const syncCore = new URL("../scripts/sync-core", import.meta.url).pathname;
const coreCMake = new URL("../Libraries/TehreerCore/CMakeLists.txt", import.meta.url).pathname;

const declare = (name: string, repo: string, tag: string): string => `
# ${name} is fetched at configure time
FetchContent_Declare(
  ${name}
  GIT_REPOSITORY ${repo}
  GIT_TAG ${tag}
  GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(${name})
`;

const fixture = [
  declare("freetype", "https://example.test/freetype.git", "VER-1"),
  declare("harfbuzz", "https://example.test/harfbuzz.git", "2.0.0"),
  declare("libunibreak", "https://example.test/libunibreak.git", "tag_3"),
  declare("SheenBidi", "https://example.test/SheenBidi.git", "0123456789abcdef0123456789abcdef01234567")
];

// Isolates git from the user's configuration; file transport is allowed for local submodules.
const gitEnv = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_CONFIG_COUNT: "1",
  GIT_CONFIG_KEY_0: "protocol.file.allow",
  GIT_CONFIG_VALUE_0: "always",
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.test",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.test"
};

function run(script: string, args: string[], cwd?: string) {
  const result = spawnSync(script, args, { encoding: "utf8", env: gitEnv, cwd });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", args, { encoding: "utf8", env: gitEnv, cwd });
  assert.equal(result.status, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result.stdout.trim();
}

function commitFile(repo: string, name: string, content: string): string {
  writeFileSync(join(repo, name), content);
  git(repo, "add", name);
  git(repo, "commit", "-q", "-m", `add ${name}`);
  return git(repo, "rev-parse", "HEAD");
}

function withTempDir(body: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "scripts-test-"));
  try {
    body(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function pinsOf(blocks: string[]) {
  const dir = mkdtempSync(join(tmpdir(), "fetch-deps-"));
  try {
    const file = join(dir, "CMakeLists.txt");
    writeFileSync(file, blocks.join("\n"));
    return run(fetchDeps, ["--cmake", file, "--print-pins"]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("fetch-deps reads the repository and tag of every dependency", () => {
  const result = pinsOf(fixture);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split("\n"), [
    "SheenBidi\thttps://example.test/SheenBidi.git\t0123456789abcdef0123456789abcdef01234567",
    "freetype\thttps://example.test/freetype.git\tVER-1",
    "harfbuzz\thttps://example.test/harfbuzz.git\t2.0.0",
    "libunibreak\thttps://example.test/libunibreak.git\ttag_3"
  ]);
});

test("fetch-deps fails when a dependency is missing", () => {
  const result = pinsOf(fixture.slice(1));
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected dependencies/);
});

test("fetch-deps fails when an unexpected dependency appears", () => {
  const result = pinsOf([...fixture, declare("extra", "https://example.test/extra.git", "1")]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected dependencies/);
});

test("fetch-deps fails when a tag is missing", () => {
  const broken = fixture.map((block) => block.replace(/ {2}GIT_TAG 2\.0\.0\n/, ""));
  const result = pinsOf(broken);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /expected dependencies .* but found/);
});

test("fetch-deps parses the pins of the Core submodule", () => {
  const result = run(fetchDeps, ["--cmake", coreCMake, "--print-pins"]);
  assert.equal(result.status, 0, result.stderr);
  const names = result.stdout.trim().split("\n").map((line) => line.split("\t")[0]);
  assert.deepEqual(names, ["SheenBidi", "freetype", "harfbuzz", "libunibreak"]);
});

test("fetch-deps rejects unknown arguments", () => {
  const result = run(fetchDeps, ["--bogus"]);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown argument/);
});

test("sync-core requires a target", () => {
  const result = run(syncCore, []);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing <sha\|ref>/);
});

test("sync-core rejects unknown options and extra arguments", () => {
  assert.match(run(syncCore, ["--bogus"]).stderr, /unknown option/);
  const extra = run(syncCore, ["main", "somewhere", "more"]);
  assert.notEqual(extra.status, 0);
  assert.match(extra.stderr, /too many arguments/);
});

test("--help prints the leading comment only", () => {
  for (const script of [fetchDeps, syncCore]) {
    const result = run(script, ["--help"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Usage: scripts\//);
    assert.doesNotMatch(result.stdout, /set -eu/);
  }
});

// A superproject with Libraries/TehreerCore as a submodule at c1, plus the Core origin with
// c1 <- c2 <- c3 on main, so that c2 is not a branch tip.
function withSuperproject(body: (ctx: { root: string; core: string; shas: [string, string, string]; submodule: string }) => void) {
  withTempDir((dir) => {
    const core = join(dir, "core");
    mkdirSync(core);
    git(core, "init", "-q", "-b", "main");
    const shas: [string, string, string] = [
      commitFile(core, "one", "one"),
      commitFile(core, "two", "two"),
      commitFile(core, "three", "three")
    ];

    const root = join(dir, "super");
    mkdirSync(join(root, "scripts"), { recursive: true });
    git(root, "init", "-q", "-b", "main");
    copyFileSync(syncCore, join(root, "scripts", "sync-core"));
    spawnSync("chmod", ["+x", join(root, "scripts", "sync-core")]);
    git(root, "submodule", "add", "-q", core, "Libraries/TehreerCore");
    const submodule = join(root, "Libraries", "TehreerCore");
    git(submodule, "checkout", "-q", "--detach", shas[0]);
    git(root, "add", ".");
    git(root, "commit", "-q", "-m", "init");
    body({ root, core, shas, submodule });
  });
}

const stagedPointer = (root: string) =>
  git(root, "ls-files", "-s", "Libraries/TehreerCore").split(/\s+/)[1];

test("sync-core moves the submodule to a non-tip SHA and stages it", () => {
  withSuperproject(({ root, shas, submodule }) => {
    const result = run(join(root, "scripts", "sync-core"), [shas[1]]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(git(submodule, "rev-parse", "HEAD"), shas[1]);
    assert.equal(stagedPointer(root), shas[1]);
  });
});

test("sync-core resolves a relative source path against the caller", () => {
  withSuperproject(({ root, shas, submodule }) => {
    const dir = join(root, "..");
    const result = run(join(root, "scripts", "sync-core"), ["main", "./core"], dir);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(git(submodule, "rev-parse", "HEAD"), shas[2]);
    assert.equal(stagedPointer(root), shas[2]);
  });
});

test("sync-core prefers the fetched ref over a stale local one in the fallback", () => {
  withSuperproject(({ root, core, shas, submodule }) => {
    // "main^" is not a ref a server can serve, so the fallback resolves it. Locally main is stale
    // (c2, so main^ is c1) while the source's main is c3, so the fresh main^ is c2.
    git(submodule, "fetch", "-q", core);
    git(submodule, "branch", "-f", "main", shas[1]);
    const result = run(join(root, "scripts", "sync-core"), ["main^", core]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(git(submodule, "rev-parse", "HEAD"), shas[1]);
  });
});

test("sync-core refuses a submodule with untracked files", () => {
  withSuperproject(({ root, shas, submodule }) => {
    writeFileSync(join(submodule, "stray"), "x");
    const result = run(join(root, "scripts", "sync-core"), [shas[1]]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /local changes or untracked files/);
    assert.equal(stagedPointer(root), shas[0]);
  });
});

test("fetch-deps is idempotent against local repositories", () => {
  withTempDir((dir) => {
    const names = ["freetype", "harfbuzz", "libunibreak", "SheenBidi"];
    const blocks: string[] = [];
    names.forEach((name, index) => {
      const repo = join(dir, "src", name);
      mkdirSync(repo, { recursive: true });
      git(repo, "init", "-q", "-b", "main");
      const sha = commitFile(repo, "file", name);
      // Pin one dependency by SHA and the rest by tag to cover both up-to-date checks.
      let tag = sha;
      if (index !== 3) {
        tag = `v${index}`;
        git(repo, "tag", tag);
      }
      blocks.push(declare(name, `file://${repo}`, tag));
    });
    const cmake = join(dir, "CMakeLists.txt");
    writeFileSync(cmake, blocks.join("\n"));
    const out = join(dir, "out");

    const first = run(fetchDeps, ["--cmake", cmake, "--dir", out]);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(first.stdout.match(/: fetching /g)?.length, 4);

    const second = run(fetchDeps, ["--cmake", cmake, "--dir", out]);
    assert.equal(second.status, 0, second.stderr);
    assert.doesNotMatch(second.stdout, /fetching/);
    assert.equal(second.stdout.match(/: up to date /g)?.length, 4);
    for (const name of names) {
      assert.equal(git(join(out, name), "show", "-s", "--format=%s", "HEAD"), `add file`);
    }
  });
});

// A pattern kill can match the shell or tool that runs it (its own command line contains the
// pattern). Only a pid or a process group of a spawned child may be signalled.
test("no script or package script kills processes by name or pattern", async () => {
  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const root = new URL("../", import.meta.url).pathname;
  const files: string[] = [join(root, "package.json")];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else files.push(path);
    }
  };
  walk(join(root, "scripts"));
  walk(join(root, ".github"));

  const banned = /\b(pkill|killall|taskkill|pgrep)\b|\bkill\b[^\n]*\$\(\s*(ps|pgrep)|\bps\b[^\n]*\|[^\n]*\bkill\b/;
  for (const file of files) {
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      assert.doesNotMatch(line, banned, `${file}:${index + 1} kills by name or pattern`);
    });
  }
});
