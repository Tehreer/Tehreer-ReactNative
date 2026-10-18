// Helpers for the tests that compile the generated C++ with a plain C++17 compiler. It is plain
// JavaScript because the tests are run by Node's type stripping, which needs `.ts` specifiers
// that the project's TypeScript settings do not allow, while `.mjs` needs no extension rewrite.
/* global process */
import { spawn, spawnSync } from "node:child_process";

/** Finds a C++ compiler, or returns undefined when the machine has none. */
export function findCompiler() {
  const candidates = [process.env.CXX, "clang++", "g++", "c++"].filter(Boolean);
  return candidates.find((name) => spawnSync(name, ["--version"], { stdio: "ignore" }).status === 0);
}

export const NO_COMPILER = "no C++ compiler (CXX, clang++, g++ or c++) was found";

/**
 * Checks the syntax and the types of a C++17 file without producing code. Warnings are errors, so
 * the generated glue stays clean.
 */
export function checkSyntax(compiler, file, includeDirectories) {
  const args = ["-std=c++17", "-fsyntax-only", "-Wall", "-Wextra", "-Werror", ...includeDirectories.map((directory) => `-I${directory}`), file];
  return new Promise((resolve) => {
    const child = spawn(compiler, args);
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    child.on("error", (error) => resolve({ file, ok: false, output: String(error) }));
    child.on("close", (code) => resolve({ file, ok: code === 0, output }));
  });
}
