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

// Reads the constants of SheenBidi (bidi types, general categories, scripts) and prints
// src/unicode/enums.ts, so that the values of the enumerations are the ones the library returns.
// Ported from Tehreer-Web's scripts/generate-unicode-enums.mjs; the output is made of constant
// objects instead of TypeScript enums because this project allows only erasable syntax.

export const GENERATED_MARKER = "GENERATED FILE. DO NOT EDIT.";

/** `Left-to-Right Isolate` becomes `LeftToRightIsolate`, `Old_Italic` becomes `OldItalic`. */
export function pascal(words) {
  return words
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join("");
}

const afterColon = (comment) => comment.replace(/^[^:]*:\s*/, "");

/**
 * The members of one header: every `SBPrefixName = 0x.. /**< comment *\/` of its enumeration, in the
 * order of the file. The member without a comment (`Nil`) is not a value of the property.
 *
 * @param {string} text The header.
 * @param {string} file Its name, for messages.
 * @param {string} prefix The prefix of the constants, such as `SBBidiType`.
 * @param {(comment: string) => string} label Turns the comment into the words of the name.
 * @returns {{ name: string, value: string }[]}
 */
export function readMembers(text, file, prefix, label) {
  const found = [];
  for (const match of text.matchAll(new RegExp(`${prefix}(\\w+)\\s*=\\s*(0x[0-9A-Fa-f]+),?\\s*/\\*\\*<\\s*(.*?)\\s*\\*/`, "g"))) {
    found.push({ name: pascal(label(match[3])), value: `0x${match[2].slice(2).toUpperCase()}` });
  }
  if (found.length === 0) {
    throw new Error(`${file}: no constants with the prefix ${prefix}`);
  }
  const names = new Set(found.map((member) => member.name));
  if (names.size !== found.length) {
    throw new Error(`${file} has members with the same name.`);
  }
  const values = new Set(found.map((member) => member.value));
  if (values.size !== found.length) {
    throw new Error(`${file} has members with the same value.`);
  }
  return found;
}

function constants(name, doc, members) {
  const body = members.map((member) => `  ${member.name}: ${member.value},`).join("\n");
  return `/** ${doc} */\nexport const ${name} = {\n${body}\n} as const;\n\nexport type ${name} = (typeof ${name})[keyof typeof ${name}];\n`;
}

// Script is a constant object like the others, and also has the two functions that tell the tags
// of a script, so the numbers are kept apart from them to make the type of the numbers alone.
function scriptBlock(members) {
  const body = members.map((member) => `  ${member.name}: ${member.value},`).join("\n");
  return `/** The script of a character, as in Unicode Standard Annex #24, Script Property Values. */
const scriptValues = {
${body}
} as const;

export type Script = (typeof scriptValues)[keyof typeof scriptValues];

export const Script = {
  ...scriptValues,

  /**
   * Returns the OpenType script tag of a script, as an integer in big endian byte order. If more
   * than one tag is associated with a script, the latest one is returned: Devanagari has \`deva\`
   * and \`dev2\`, so \`dev2\` is. A script without a tag gets \`DFLT\`. SheenBidi prefers
   * {@link Script.getUnicodeTag}.
   */
  getOpenTypeTag(script: Script): SfntTag {
    return getScriptOpenTypeTag(script);
  },

  /**
   * Returns the four letter abbreviation of a script in the Unicode Script property
   * (\`PropertyValueAliases.txt\`) as an integer in big endian byte order, such as \`Arab\`, or 0 if
   * the script has none.
   */
  getUnicodeTag(script: Script): SfntTag {
    return getScriptUnicodeTag(script);
  },
} as const;
`;
}

const LICENSE = `/*
 * Copyright (C) 2026 Muhammad Tayyab Akram
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
`;

/**
 * Prints `src/unicode/enums.ts`.
 *
 * @param {{ bidiType: string, generalCategory: string, script: string }} headers The texts of
 *   `SBBidiType.h`, `SBGeneralCategory.h` and `SBScript.h`.
 */
export function emitUnicodeEnums(headers) {
  const bidi = readMembers(headers.bidiType, "SBBidiType.h", "SBBidiType", afterColon);
  const categories = readMembers(headers.generalCategory, "SBGeneralCategory.h", "SBGeneralCategory", afterColon);
  const scripts = readMembers(headers.script, "SBScript.h", "SBScript", (comment) => comment);

  return `${LICENSE}
// ${GENERATED_MARKER}
// Written by scripts/generate-unicode-enums.mjs from the headers of SheenBidi.
// Change the generator or SheenBidi, then run \`npm run generate:unicode\`.

import type { SfntTag } from "../sfnt/SfntTag.js";
import { getScriptOpenTypeTag, getScriptUnicodeTag } from "./scriptTags.js";

${constants("BidiClass", "The bidirectional class of a character, as in Unicode Standard Annex #44, Bidirectional Class Values.", bidi)}
${constants("GeneralCategory", "The general category of a character, as in Unicode Standard Annex #44, General Category Values.", categories)}
${scriptBlock(scripts)}`;
}
