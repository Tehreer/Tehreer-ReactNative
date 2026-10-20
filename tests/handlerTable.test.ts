import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { findCompiler, NO_COMPILER } from "./CompileSupport.mjs";

// The handler table and the callback error slot run here, for real, against the stand-in of
// <jsi/jsi.h> (tests/fixtures/jsi-stub): no engine, but the rules that matter (who destroys a
// handler and when, no lock held while an error is made, a stale error forgotten, the queue emptied
// by an ordinary binding) are behaviour, so they are executed. The harness is
// tests/fixtures/handler-harness/Harness.cpp; the device suite (tests/device/CallbackTests.ts) runs
// the same rules inside Hermes.
const root = join(import.meta.dirname, "..");
const compiler = findCompiler();
const skip = !compiler ? NO_COMPILER
  : !existsSync(join(root, "Libraries/TehreerCore/Headers/Tehreer")) ? "the Core submodule is not initialised (git submodule update --init)"
    : false;

test("the handler table and the callback error slot behave as documented", { skip }, () => {
  const scratch = mkdtempSync(join(tmpdir(), "tehreer-harness-"));
  try {
    const program = join(scratch, "harness");
    const build = spawnSync(compiler as string, [
      "-std=c++20", "-Wall", "-Wextra", "-Werror", "-pthread",
      `-I${join(root, "tests/fixtures/jsi-stub")}`, `-I${join(root, "Libraries/TehreerCore/Headers")}`, `-I${join(root, "cpp")}`,
      join(root, "tests/fixtures/handler-harness/Harness.cpp"),
      join(root, "cpp/runtime/HandlerTable.cpp"),
      join(root, "cpp/runtime/Callbacks.cpp"),
      "-o", program,
    ], { encoding: "utf8" });
    assert.equal(build.status, 0, build.stdout + build.stderr);

    const run = spawnSync(program, [], { encoding: "utf8", timeout: 60_000 });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /^OK /);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
