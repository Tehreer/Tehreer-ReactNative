#!/usr/bin/env node
// Copyright (C) 2026 Muhammad Tayyab Akram
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Reads the public headers of Tehreer Core and writes
//   cpp/generated/                       the C++ JSI glue, and
//   src/internal/NativeFunctions.ts      the typed signatures of the same functions.
//
// Usage: node scripts/generate-bindings.mjs [--check] [--core <Core directory>]
//   --check   writes nothing and exits with 1 if the files on disk differ from a generation.
//
// A signature that cannot be expressed stops the run with the function and the type in the message.
/* global process, console */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { checkFiles, outputFiles, writeFiles } from "./generator/files.mjs";
import { generate } from "./generator/generate.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function main(argv) {
  let check = false;
  let core = join(root, "Libraries/TehreerCore");
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--check") check = true;
    else if (argument === "--core" && index + 1 < argv.length) core = resolve(argv[++index]);
    else throw new Error(`Unknown argument "${argument}"`);
  }

  const headers = join(core, "Headers/Tehreer");
  if (!existsSync(headers)) {
    throw new Error(`${headers} does not exist; run \`git submodule update --init\` first`);
  }

  const generated = generate(headers);
  const files = outputFiles(generated);

  if (check) {
    const problems = checkFiles(root, files);
    if (problems.length > 0) {
      console.error(`The generated files are stale; run \`npm run generate\`:\n  ${problems.join("\n  ")}`);
      return 1;
    }
    console.log(`The ${files.size} generated files are up to date.`);
    return 0;
  }

  writeFiles(root, files);
  console.log(`Generated ${generated.model.bindings.length} bindings in ${files.size} files.`);
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(`generate-bindings: ${error.message}`);
  process.exitCode = 1;
}
