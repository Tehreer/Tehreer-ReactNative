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

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { BOUNDS, EXCLUDED, MANUAL, POINTER_COUNTS, SCALAR_OUTS, SKIP_INCLUDES } from "./config.mjs";
import { emitCpp } from "./emitCpp.mjs";
import { emitTs } from "./emitTs.mjs";
import { buildModel } from "./model.mjs";
import { parseHeader } from "./parser.mjs";

/**
 * Generates every output from the public headers of Core.
 *
 * @param {string} headersDirectory The directory with `TR*.h`, normally `Headers/Tehreer`.
 * @param {object} [overrides] Replaces the configuration; tests use it with small headers.
 * @returns {{ cpp: Map<string, string>, ts: string, model: object }}
 */
export function generate(headersDirectory, overrides = {}) {
  const files = readdirSync(headersDirectory).filter((name) => /^TR.*\.h$/.test(name)).sort();
  const headers = files.map((file) => ({
    file,
    parsed: parseHeader(readFileSync(join(headersDirectory, file), "utf8"), { publicMacro: "TR_PUBLIC", prefix: "TR" }),
  }));

  const model = buildModel(headers, {
    excluded: overrides.excluded ?? EXCLUDED,
    manual: overrides.manual ?? new Set(MANUAL.keys()),
    bounds: overrides.bounds ?? BOUNDS,
    scalarOuts: overrides.scalarOuts ?? SCALAR_OUTS,
    pointerCounts: overrides.pointerCounts ?? POINTER_COUNTS,
  });

  return {
    cpp: emitCpp(model, { includePrefix: "Tehreer", skipIncludes: overrides.skipIncludes ?? SKIP_INCLUDES }),
    ts: emitTs(model),
    model,
  };
}
