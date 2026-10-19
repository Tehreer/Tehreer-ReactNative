// Compiles source modules of src/ into a scratch directory so that tests can import them: node
// strips types but does not map the `.js` specifiers of the sources to their `.ts` files.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const root = join(import.meta.dirname, "..");

/** Compiles the given files (relative to the repository root) and returns the output directory. */
export function compileModules(files) {
  const out = mkdtempSync(join(tmpdir(), "tehreer-modules-"));
  const result = spawnSync(process.execPath, [
    join(root, "node_modules/typescript/lib/tsc.js"), ...files.map((file) => join(root, file)),
    "--outDir", out, "--rootDir", join(root, "src"),
    "--target", "es2022", "--module", "nodenext", "--moduleResolution", "nodenext", "--lib", "es2022,esnext.disposable",
    "--ignoreConfig", "--skipLibCheck", "--erasableSyntaxOnly", "--strict",
  ], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  writeFileSync(join(out, "package.json"), '{"type":"module"}');
  return out;
}

/** Imports a compiled module; `file` is relative to src/ and ends in `.js`. */
export function importModule(out, file) {
  return import(pathToFileURL(join(out, file)).href);
}
