import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const manifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
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
