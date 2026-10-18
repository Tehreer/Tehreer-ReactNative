import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const manifest = JSON.parse(
  // A path, not a URL: the React Native types (pulled in by src/specs) redeclare the global URL.
  readFileSync(join(import.meta.dirname, "..", "package.json"), "utf8")
) as Record<string, unknown>;

test("the package has no runtime dependencies", () => {
  for (const key of ["dependencies", "optionalDependencies", "bundleDependencies", "bundledDependencies"]) {
    assert.equal(manifest[key], undefined, key);
  }
});

test("react and react-native are the only peer dependencies", () => {
  const peers = Object.keys((manifest["peerDependencies"] ?? {}) as object).sort();
  assert.deepEqual(peers, ["react", "react-native"]);
});
