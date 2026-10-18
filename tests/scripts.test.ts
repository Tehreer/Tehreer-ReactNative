import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

function run(script: string, args: string[]) {
  const result = spawnSync(script, args, { encoding: "utf8" });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
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
