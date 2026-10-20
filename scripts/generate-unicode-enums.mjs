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

// Writes src/unicode/enums.ts from the headers of SheenBidi (fetched by scripts/fetch-deps).
//
//   node scripts/generate-unicode-enums.mjs [--check] [--sheenbidi <SheenBidi directory>]

/* global process, console */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { emitUnicodeEnums } from "./generator/unicodeEnums.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = "src/unicode/enums.ts";

function main(argv) {
  let check = false;
  let sheenBidi = join(root, "Libraries/Dependencies/SheenBidi");
  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === "--check") check = true;
    else if (argument === "--sheenbidi" && index + 1 < argv.length) sheenBidi = resolve(argv[++index]);
    else throw new Error(`Unknown argument "${argument}"`);
  }

  const headers = join(sheenBidi, "Headers/SheenBidi");
  if (!existsSync(headers)) {
    throw new Error(`${headers} does not exist; run \`npm run setup\` first`);
  }

  const read = (name) => readFileSync(join(headers, name), "utf8");
  const text = emitUnicodeEnums({
    bidiType: read("SBBidiType.h"),
    generalCategory: read("SBGeneralCategory.h"),
    script: read("SBScript.h"),
  });

  const output = join(root, OUTPUT);
  if (check) {
    if (!existsSync(output) || readFileSync(output, "utf8") !== text) {
      console.error(`${OUTPUT} is stale; run \`npm run generate:unicode\``);
      return 1;
    }
    console.log(`${OUTPUT} is up to date.`);
    return 0;
  }

  writeFileSync(output, text);
  console.log(`Generated ${OUTPUT}`);
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  console.error(`generate-unicode-enums: ${error.message}`);
  process.exitCode = 1;
}
