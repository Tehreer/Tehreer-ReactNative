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

// Prints src/internal/NativeFunctions.ts: one typed member for every binding, with the C signature
// in its comment. The conventions of the C++ side (what a handle, a pointer view and an output
// look like) are written at the top of the file, so a reader of the TypeScript never has to open
// the C++.

import { GENERATED_MARKER, LICENSE } from "./emitCpp.mjs";

const BANNER = `
// ${GENERATED_MARKER}
// Written by scripts/generate-bindings.mjs from Libraries/TehreerCore/Headers/Tehreer.
// Change the generator or the Core header, then run \`npm run generate\`.
//
// How Core values cross into JavaScript:
//
// - Integers, floats, tags, colors, glyph ids and enumerations are numbers. A \`TRUInteger\` of
//   \`TRInvalidIndex\` is -1, and -1 is \`TRInvalidIndex\` when passed.
// - \`TRBoolean\` is a boolean.
// - An object reference is an opaque \`Handle\`. A function that creates or copies an object hands
//   over a reference that the handle owns; one that gets an object retains it for the handle. A
//   \`NULL\` result is \`undefined\`. A parameter that Core documents as optional also takes
//   \`undefined\`.
//   The \`TR*Release\` functions are not bound: a handle releases its one reference when it is
//   disposed or collected, and a release from JavaScript would free it twice. \`TR*Retain\` is bound
//   and gives a new handle with its own reference.
// - A struct that is passed or returned by value is an object with the names of its members.
// - Text goes in as a \`string\` (\`const char *\`, \`TRStringView\`) and comes back as a \`string\`.
//   Code units go in as an \`ArrayBuffer\` or a typed array together with their count.
// - A pointer that Core gives into its own memory is a \`PointerView\`: the address and the owner that
//   keeps it alive, whose length comes from the matching count function.
// - A parameter that Core fills in is not a parameter: its value is in the result. A function that
//   returns \`TRBoolean\` and fills in values gives \`undefined\` when the flag is false, else the
//   values (the value itself for one, an object by name for more). If it returns anything else, the
//   result is an object with \`result\` and one member for each value.
// - An enumeration with a callback gives the collected items as an array in the result, under
//   \`items\` when there are other values. Nothing calls back into JavaScript.
`;

const typeOf = (name, refs) => refs.get(name) ?? name;

function tsOfDescriptor(descriptor, refs) {
  switch (descriptor.k) {
    case "number": return "number";
    case "bool": return "boolean";
    case "struct": return descriptor.c;
    case "ref": return `Handle<"${typeOf(descriptor.c, refs)}"> | undefined`;
    case "stringView":
    case "cstring": return "string | undefined";
    case "token": return "number";
    case "pointerView": return `PointerView<"${descriptor.element}"> | undefined`;
    default: throw new Error(`ts: ${descriptor.k}`);
  }
}

/** The type of a value in an item or an object, where `| undefined` would read as optional. */
const required = (type) => type.replace(/ \| undefined$/, "");

function tsOfParameter(p, refs) {
  const nullable = p.nullable ? " | undefined" : "";
  switch (p.kind) {
    case "number": return "number";
    case "bool": return "boolean";
    case "struct": return p.descriptor.c;
    case "ref": return `Handle<"${refs.get(p.descriptor.c)}">${nullable}`;
    case "cstring":
    case "stringView": return `string${nullable}`;
    case "structPointer": return `${p.c}${nullable}`;
    case "inBuffer":
    case "outBuffer": return `ArrayBuffer | ArrayBufferView${nullable}`;
    case "inStructArray": return `readonly ${p.c}[]${nullable}`;
    default: throw new Error(`ts: ${p.kind}`);
  }
}

function tsOfItem(callback, refs) {
  const members = callback.payload.map((item) => `${item.name}: ${tsOfPayload(item.descriptor, refs)}`);
  if (callback.kind === "single") {
    if (callback.payload.length === 1) return tsOfPayload(callback.payload[0].descriptor, refs);
    return `{ ${members.join("; ")} }`;
  }
  return `{ ${[`type: "${callback.name}"`, ...members].join("; ")} }`;
}

function tsOfPayload(descriptor, refs) {
  if (descriptor.k === "stringView") return "string";
  if (descriptor.k === "ref") return `Handle<"${refs.get(descriptor.c)}">`;
  return tsOfDescriptor(descriptor, refs);
}

function tsOfBinding(binding, refs) {
  const callback = binding.params.find((p) => p.kind === "callback" || p.kind === "callbackStruct");
  const items = !callback ? null
    : callback.kind === "callback" ? `${tsOfItem(callback.callback, refs)}[]`
      : `(${callback.members.map((member) => tsOfItem(member, refs)).join(" | ")})[]`;

  const values = binding.outputs.map((output) => ({
    key: output.key,
    type: output.source === "collector" ? items : required(tsOfDescriptor(output.descriptor, refs)),
  }));

  const compose = (entries, direct) =>
    direct && entries.length === 1 ? entries[0].type : `{ ${entries.map((e) => `${e.key}: ${e.type}`).join("; ")} }`;

  switch (binding.result.mode) {
    case "none": return "void";
    case "value": return tsOfDescriptor(binding.returns, refs);
    case "outputs": return compose(values, true);
    case "success": {
      return `${compose(values, true)} | undefined`;
    }
    case "object": return compose([{ key: "result", type: tsOfDescriptor(binding.returns, refs) }, ...values], false);
    default: throw new Error(`ts: result mode ${binding.result.mode}`);
  }
}

function notesOf(binding) {
  const notes = [];
  if (binding.returns.k === "ref") {
    notes.push(binding.returns.ownership === "owned" ? "the handle owns the reference" : "the handle retains the reference");
  }
  if (binding.result.mode === "success") notes.push("`undefined` when it returns `TRFalse`");
  return notes;
}

/**
 * @param {object} model The plan from `buildModel`.
 * @returns {string} The text of NativeFunctions.ts.
 */
export function emitTs(model) {
  const refs = new Map(model.refs.map((ref) => [ref.name, ref.group]));

  const structs = model.structs.map((struct) => {
    const members = struct.members.map((member) =>
      `  ${member.name}: ${member.descriptor.k === "number" ? "number" : member.descriptor.k === "bool" ? "boolean" : member.descriptor.c};`);
    return `/** \`${struct.name}\` */\nexport interface ${struct.name} {\n${members.join("\n")}\n}`;
  }).join("\n\n");

  const members = model.bindings.map((binding) => {
    const params = binding.params.filter((p) => p.js).map((p) => `${p.name}: ${tsOfParameter(p, refs)}`);
    const notes = notesOf(binding);
    const comment = `  /** \`${binding.signature}\`${notes.length ? ` (${notes.join("; ")})` : ""} */`;
    return `${comment}\n  ${binding.name}(${params.join(", ")}): ${tsOfBinding(binding, refs)};`;
  }).join("\n");

  return `${LICENSE}${BANNER}
declare const handleKind: unique symbol;
declare const pointerElement: unique symbol;

/** An opaque reference to a Core object of the given kind, such as \`"TRTypeface"\`. */
export interface Handle<Kind extends string> {
  readonly [handleKind]: Kind;
}

/** A pointer into Core memory with the name of the type of its elements. */
export interface PointerView<Element extends string> {
  readonly [pointerElement]: Element;
}

${structs}

/** The functions of Tehreer Core that the native module installs. */
export interface NativeFunctions {
${members}
}
`;
}
