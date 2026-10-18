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

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { GENERATED_MARKER } from "./emitCpp.mjs";

export const CPP_DIRECTORY = "cpp/generated";
export const TS_FILE = "src/internal/NativeFunctions.ts";

/** The files of a generation, by path relative to the repository root. */
export function outputFiles(generated) {
  const files = new Map();
  for (const [name, text] of generated.cpp) files.set(`${CPP_DIRECTORY}/${name}`, text);
  files.set(TS_FILE, generated.ts);
  return files;
}

/** The generated files in `cpp/generated` that the generation no longer produces. */
function staleFiles(root, files) {
  const directory = join(root, CPP_DIRECTORY);
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .map((name) => `${CPP_DIRECTORY}/${name}`)
    .filter((path) => !files.has(path) && readFileSync(join(root, path), "utf8").includes(GENERATED_MARKER));
}

/**
 * Compares the files on disk with a generation.
 *
 * @returns {string[]} One line for each file that is missing, different or left over.
 */
export function checkFiles(root, files) {
  const problems = [];
  for (const [path, text] of files) {
    const absolute = join(root, path);
    if (!existsSync(absolute)) problems.push(`${path}: missing`);
    else if (readFileSync(absolute, "utf8") !== text) problems.push(`${path}: out of date`);
  }
  for (const path of staleFiles(root, files)) problems.push(`${path}: no longer generated`);
  return problems;
}

/** Writes a generation, and removes the generated files it no longer produces. */
export function writeFiles(root, files) {
  for (const path of staleFiles(root, files)) unlinkSync(join(root, path));
  for (const [path, text] of files) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    if (!existsSync(absolute) || readFileSync(absolute, "utf8") !== text) writeFileSync(absolute, text);
  }
}
