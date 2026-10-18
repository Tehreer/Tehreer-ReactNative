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

// Prints the C++17 JSI glue for a binding plan. The generated code only converts: it reads the
// JavaScript arguments through the `tehreer::marshal` functions that GeneratedSupport.h declares,
// calls one Core function and converts the result. The runtime in cpp/runtime defines those
// functions; nothing here knows how a handle, a buffer or a pointer view is represented.

export const LICENSE = `/*
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

/** Marks a file as generated; the generator only deletes files that carry it. */
export const GENERATED_MARKER = "GENERATED FILE. DO NOT EDIT.";

const BANNER = `
// ${GENERATED_MARKER}
// Written by scripts/generate-bindings.mjs from Libraries/TehreerCore/Headers/Tehreer.
// Change the generator or the Core header, then run \`npm run generate\`.
`;

const header = (text) => `${LICENSE}${BANNER}\n${text}`;

/** Renders a declaration such as `const TRStringView *familyName`. */
function declaration(type, name) {
  const qualifier = `${type.const ? "const " : ""}${type.tag ? `${type.tag} ` : ""}`;
  return `${qualifier}${type.base} ${"*".repeat(type.pointer)}${name}`;
}

const variable = (name) => `a_${name}`;
const expand = (expression) => expression.replace(/\{(\w+)\}/g, (_, name) => variable(name));

function fromJs(descriptor, value, fnName, paramName) {
  switch (descriptor.k) {
    case "number": return `marshal::ToNumber<${descriptor.c}>(rt, ${value}, ${fnName}, "${paramName}")`;
    case "bool": return `(marshal::ToBoolean(rt, ${value}, ${fnName}, "${paramName}") ? TRTrue : TRFalse)`;
    case "struct": return `${descriptor.c}FromJs(rt, ${value}, ${fnName}, "${paramName}")`;
    default: throw new Error(`fromJs: ${descriptor.k}`);
  }
}

function toJs(descriptor, value, extra = {}) {
  switch (descriptor.k) {
    case "number": return `marshal::FromNumber<${descriptor.c}>(rt, ${value})`;
    case "bool": return `marshal::FromBoolean(${value} != 0)`;
    case "struct": return `${descriptor.c}ToJs(rt, ${value})`;
    case "ref": return `marshal::FromHandle<${descriptor.c}>(rt, ${value}, marshal::Ownership::${extra.ownership === "owned" ? "Adopt" : "Retain"})`;
    case "stringView": return `marshal::FromStringView(rt, ${value})`;
    case "cstring": return `marshal::FromCString(rt, ${value})`;
    case "token": return `marshal::FromToken(rt, ${value})`;
    case "pointerView":
      return `marshal::MakePointerView(rt, ${value}, "${descriptor.element}", sizeof(${descriptor.element}), marshal::ArgAt(args, count, 0))`;
    default: throw new Error(`toJs: ${descriptor.k}`);
  }
}

// ---------------------------------------------------------------------------------------------

function emitSupport(model, options) {
  const includes = model.files
    .filter((file) => !options.skipIncludes.includes(file))
    .map((file) => `#include <${options.includePrefix}/${file}>`)
    .join("\n");

  return header(`#ifndef TEHREER_GENERATED_SUPPORT_H
#define TEHREER_GENERATED_SUPPORT_H

#include <cstddef>
#include <cstdint>
#include <exception>
#include <string>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

${includes}

namespace tehreer {

namespace jsi = facebook::jsi;

/**
 * The conversions between JavaScript values and Core values that the generated bindings use. The
 * runtime defines everything declared here except the inline parts. Every function that reads a
 * value takes the name of the Core function and of the parameter, and throws a \`jsi::JSError\`
 * that names both when the value cannot be converted.
 */
namespace marshal {

/** Whether the reference that a Core function returns is already owned by the caller. */
enum class Ownership {
    /** The reference is owned (\`Create\`, \`Copy\`, \`Retain\`): the handle adopts it. */
    Adopt,
    /** The reference is borrowed (\`Get\`): the handle retains it first. */
    Retain,
};

/**
 * Describes an object reference type. Handles.h specialises it for every reference type of Core.
 * \`kGroup\` is the same for the types that share one object (\`TRTextRef\` and
 * \`TRMutableTextRef\`), so that a handle is accepted for any of them. \`Release\` is the only thing
 * a finalizer may call.
 */
template <class Ref> struct HandleTraits;

[[noreturn]] void Fail(jsi::Runtime &rt, const char *function, const char *parameter, const char *message);

/** The argument at \`index\`, or undefined when fewer were passed. */
const jsi::Value &ArgAt(const jsi::Value *args, size_t count, size_t index);
bool IsNullish(const jsi::Value &value);

/**
 * Numbers. \`ToNumber\` throws when the value is not a number or not representable as \`T\`. For
 * \`TRUInteger\`, -1 is \`TRInvalidIndex\` in both directions.
 */
template <class T> T ToNumber(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter);
template <class T> jsi::Value FromNumber(jsi::Runtime &rt, T value);
bool ToBoolean(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter);
jsi::Value FromBoolean(bool value);

/** Object references. A null or undefined value is \`NULL\` when \`nullable\`, else an error. */
template <class Ref> Ref ToHandle(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable);
/**
 * \`NULL\` becomes undefined. If making the handle throws, an \`Adopt\`ed reference is released, so
 * no path leaks one.
 */
template <class Ref> jsi::Value FromHandle(jsi::Runtime &rt, Ref ref, Ownership ownership);

/** A UTF-8 string that lives as long as the argument object. */
struct CStringArg {
    std::string storage;
    bool isNull;
    const char *get() const { return isNull ? nullptr : storage.c_str(); }
};
CStringArg ToCString(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable);
/** \`NULL\` becomes undefined. */
jsi::Value FromCString(jsi::Runtime &rt, const char *string);

/** A UTF-16 view of a JavaScript string that lives as long as the argument object. */
struct StringViewArg {
    std::u16string storage;
    TRStringView view;
    bool isNull;
    const TRStringView *get() const { return isNull ? nullptr : &view; }
};
StringViewArg ToStringView(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable);
/** Decodes the string by its encoding; \`NULL\` becomes undefined. */
jsi::Value FromStringView(jsi::Runtime &rt, const TRStringView *view);

/**
 * Memory of an \`ArrayBuffer\` or of a typed array, read by Core during the call only.
 * \`data\` is null for a null or undefined value when \`nullable\`.
 */
struct ConstBuffer {
    const void *data;
    size_t byteLength;
};
struct MutableBuffer {
    void *data;
    size_t byteLength;
};
ConstBuffer ToConstBuffer(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable);
MutableBuffer ToMutableBuffer(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable);

/**
 * Throws a \`RangeError\` unless \`count\` units of \`unitSize\` bytes fit in \`byteLength\`, so Core
 * never reads or writes past a buffer; the test must not overflow, as \`count\` can be
 * \`TRInvalidIndex\`. A \`unitSize\` of zero (an invalid encoding) throws too.
 */
void RequireCapacity(jsi::Runtime &rt, const char *function, const char *parameter, size_t count, size_t unitSize, size_t byteLength);
/** The same for an array that holds \`available\` elements. */
void RequireElements(jsi::Runtime &rt, const char *function, const char *parameter, size_t count, size_t available);

/** The size in bytes of a code unit of \`encoding\`, or zero when it is not valid. */
size_t CodeUnitSize(TRStringEncoding encoding);

jsi::Object ToObject(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter);
jsi::Array ToArray(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter);

/**
 * A pointer into memory that \`owner\` keeps alive, with the name and the size of its elements.
 * The count is asked from Core separately. \`NULL\` becomes undefined.
 */
jsi::Value MakePointerView(jsi::Runtime &rt, const void *address, const char *element, size_t elementSize, const jsi::Value &owner);
/** The address of an opaque pointer, as a number (an application token such as \`userData\`). */
jsi::Value FromToken(jsi::Runtime &rt, const void *pointer);

/**
 * Receives what Core passes to the callbacks of an enumeration. Nothing re-enters JavaScript
 * code that the caller wrote: each call is turned into one item, and the items are returned as
 * an array once the Core function has returned. If making an item throws, the first error is kept,
 * the enumeration is stopped through its \`stop\` flag and the error is rethrown by \`Finish\`.
 */
struct Collector {
    explicit Collector(jsi::Runtime &runtime) : runtime(runtime) {}

    jsi::Runtime &runtime;
    std::vector<jsi::Value> items;
    std::exception_ptr error;

    bool HasFailed() const { return error != nullptr; }

    jsi::Value Finish() {
        if (error) {
            std::rethrow_exception(error);
        }

        jsi::Array array(runtime, items.size());
        for (size_t index = 0; index < items.size(); index++) {
            array.setValueAtIndex(runtime, index, std::move(items[index]));
        }
        return jsi::Value(runtime, array);
    }
};

} // namespace marshal
} // namespace tehreer

#endif
`);
}

function emitHandles(model) {
  const traits = model.refs.map((ref) => `template <> struct HandleTraits<${ref.name}> {
    static constexpr const char *kGroup = "${ref.group}";
    static void Retain(${ref.name} ref) { ${ref.retain}(ref); }
    static void Release(${ref.name} ref) { ${ref.release}(ref); }
};`).join("\n\n");

  return header(`#ifndef TEHREER_GENERATED_HANDLES_H
#define TEHREER_GENERATED_HANDLES_H

#include "GeneratedSupport.h"

namespace tehreer {
namespace marshal {

${traits}

} // namespace marshal
} // namespace tehreer

#endif
`);
}

function emitStructs(model) {
  const codecs = model.structs.map((struct) => {
    const toMembers = struct.members.map((member) => {
      const value = member.descriptor.k === "struct"
        ? `${member.descriptor.c}ToJs(rt, value.${member.name})`
        : toJs(member.descriptor, `value.${member.name}`);
      return `    object.setProperty(rt, "${member.name}", ${value});`;
    }).join("\n");
    const fromMembers = struct.members.map((member) =>
      `    result.${member.name} = ${fromJsMember(member.descriptor, member.name)};`).join("\n");

    return `inline jsi::Value ${struct.name}ToJs(jsi::Runtime &rt, const ${struct.name} &value) {
    jsi::Object object(rt);
${toMembers}
    return jsi::Value(std::move(object));
}

inline ${struct.name} ${struct.name}FromJs(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter) {
    jsi::Object object = marshal::ToObject(rt, value, function, parameter);
    ${struct.name} result = {};
${fromMembers}
    return result;
}`;
  }).join("\n\n");

  return header(`#ifndef TEHREER_GENERATED_STRUCTS_H
#define TEHREER_GENERATED_STRUCTS_H

#include "GeneratedSupport.h"

namespace tehreer {
namespace generated {

${codecs}

} // namespace generated
} // namespace tehreer

#endif
`);
}

function fromJsMember(descriptor, name) {
  const value = `object.getProperty(rt, "${name}")`;
  switch (descriptor.k) {
    case "number": return `marshal::ToNumber<${descriptor.c}>(rt, ${value}, function, parameter)`;
    case "bool": return `(marshal::ToBoolean(rt, ${value}, function, parameter) ? TRTrue : TRFalse)`;
    case "struct": return `${descriptor.c}FromJs(rt, ${value}, function, parameter)`;
    default: throw new Error(`member ${name}: ${descriptor.k}`);
  }
}

// ---------------------------------------------------------------------------------------------

function emitCallback(binding, callback) {
  const name = `Collect${binding.name}_${callback.name}`;
  const signature = callback.signature;
  const params = signature.params.map((p) => declaration(p.type, p.name)).join(", ");

  const payload = callback.payload;
  const convert = (item) => {
    const value = item.descriptor.k === "ref"
      ? toJs(item.descriptor, item.name, { ownership: "borrowed" })
      : toJs(item.descriptor, item.name);
    return value;
  };

  let build;
  if (callback.kind === "single" && payload.length === 1) {
    build = `        jsi::Value item = ${convert(payload[0])};`;
  } else {
    const lines = ["        jsi::Object object(rt);"];
    if (callback.kind === "member") {
      lines.push(`        object.setProperty(rt, "type", jsi::String::createFromAscii(rt, "${callback.name}"));`);
    }
    for (const item of payload) lines.push(`        object.setProperty(rt, "${item.name}", ${convert(item)});`);
    lines.push("        jsi::Value item(std::move(object));");
    build = lines.join("\n");
  }

  const stop = callback.stop ? `\n        *${callback.stop} = TRTrue;` : "";
  const stopEarly = callback.stop ? `\n        *${callback.stop} = TRTrue;` : "";

  return {
    name,
    code: `void ${name}(${params}) {
    auto *collector = static_cast<marshal::Collector *>(${callback.userData});
    if (collector->HasFailed()) {${stopEarly}
        return;
    }

    try {
        jsi::Runtime &rt = collector->runtime;
${build}
        collector->items.push_back(std::move(item));
    } catch (...) {
        collector->error = std::current_exception();${stop}
    }
}`,
  };
}

function emitBinding(binding) {
  const callbackPlan = binding.params.find((p) => p.kind === "callback" || p.kind === "callbackStruct");
  const trampolines = [];
  if (callbackPlan?.kind === "callback") {
    trampolines.push(emitCallback(binding, callbackPlan.callback));
  } else if (callbackPlan?.kind === "callbackStruct") {
    for (const member of callbackPlan.members) trampolines.push(emitCallback(binding, member));
  }

  const lines = [];
  const checks = [];
  const callArguments = [];
  let jsIndex = 0;
  let usesArgs = false;

  const argument = () => {
    usesArgs = true;
    return `marshal::ArgAt(args, count, ${jsIndex++})`;
  };

  for (const p of binding.params) {
    const name = p.name;
    const v = variable(name);
    const nullable = p.nullable ? "true" : "false";

    switch (p.kind) {
      case "number":
      case "bool":
        lines.push(`    ${p.descriptor.k === "bool" ? "TRBoolean" : p.descriptor.c} ${v} = ${fromJs(p.descriptor, argument(), "kFunction", name)};`);
        callArguments.push(v);
        break;
      case "ref":
        lines.push(`    ${p.descriptor.c} ${v} = marshal::ToHandle<${p.descriptor.c}>(rt, ${argument()}, kFunction, "${name}", ${nullable});`);
        callArguments.push(v);
        break;
      case "struct":
        lines.push(`    ${p.descriptor.c} ${v} = ${fromJs(p.descriptor, argument(), "kFunction", name)};`);
        callArguments.push(v);
        break;
      case "cstring":
        lines.push(`    marshal::CStringArg ${v} = marshal::ToCString(rt, ${argument()}, kFunction, "${name}", ${nullable});`);
        callArguments.push(`${v}.get()`);
        break;
      case "stringView":
        lines.push(`    marshal::StringViewArg ${v} = marshal::ToStringView(rt, ${argument()}, kFunction, "${name}", ${nullable});`);
        callArguments.push(`${v}.get()`);
        break;
      case "structPointer": {
        const arg = argument();
        lines.push(`    ${p.c} v_${name} = {};`);
        lines.push(`    const ${p.c} *${v} = nullptr;`);
        if (p.nullable) {
          lines.push(`    if (!marshal::IsNullish(${arg})) {`);
          lines.push(`        v_${name} = ${p.c}FromJs(rt, ${arg}, kFunction, "${name}");`);
          lines.push(`        ${v} = &v_${name};`);
          lines.push("    }");
        } else {
          lines.push(`    v_${name} = ${p.c}FromJs(rt, ${arg}, kFunction, "${name}");`);
          lines.push(`    ${v} = &v_${name};`);
        }
        callArguments.push(v);
        break;
      }
      case "inBuffer":
      case "outBuffer": {
        const isIn = p.kind === "inBuffer";
        const type = isIn ? "ConstBuffer" : "MutableBuffer";
        lines.push(`    marshal::${type} ${v} = marshal::To${type}(rt, ${argument()}, kFunction, "${name}", ${nullable});`);
        checks.push(`    if (${v}.data != nullptr) {\n        marshal::RequireCapacity(rt, kFunction, "${name}", static_cast<size_t>(${expand(p.count)}), ${expand(p.unit)}, ${v}.byteLength);\n    }`);
        if (p.element === "void") callArguments.push(`${v}.data`);
        else callArguments.push(`static_cast<${isIn ? "const " : ""}${p.element} *>(${v}.data)`);
        break;
      }
      case "inStructArray": {
        const arg = argument();
        lines.push(`    std::vector<${p.c}> v_${name};`);
        lines.push(`    size_t n_${name} = 0;`);
        lines.push(`    const ${p.c} *${v} = nullptr;`);
        lines.push(p.nullable ? `    if (!marshal::IsNullish(${arg})) {` : "    {");
        lines.push(`        jsi::Array array = marshal::ToArray(rt, ${arg}, kFunction, "${name}");`);
        lines.push(`        n_${name} = array.size(rt);`);
        lines.push(`        v_${name}.reserve(n_${name});`);
        lines.push(`        for (size_t index = 0; index < n_${name}; index++) {`);
        lines.push(`            v_${name}.push_back(${p.c}FromJs(rt, array.getValueAtIndex(rt, index), kFunction, "${name}"));`);
        lines.push("        }");
        lines.push(`        ${v} = v_${name}.data();`);
        lines.push("    }");
        checks.push(`    if (${v} != nullptr) {\n        marshal::RequireElements(rt, kFunction, "${name}", static_cast<size_t>(${expand(p.count)}), n_${name});\n    }`);
        callArguments.push(v);
        break;
      }
      case "out":
        lines.push(`    ${p.descriptor.c} o_${name} = ${p.descriptor.k === "struct" ? "{}" : "0"};`);
        callArguments.push(`&o_${name}`);
        break;
      case "callback":
        lines.push("    marshal::Collector collector(rt);");
        callArguments.push(`Collect${binding.name}_${p.callback.name}`);
        break;
      case "callbackStruct":
        lines.push("    marshal::Collector collector(rt);");
        lines.push(`    ${p.struct} callbacks = {};`);
        for (const member of p.members) lines.push(`    callbacks.${member.name} = Collect${binding.name}_${member.name};`);
        callArguments.push("&callbacks");
        break;
      case "userData":
        callArguments.push("&collector");
        break;
      default:
        throw new Error(`${binding.name}: cannot print ${p.kind}`);
    }
  }

  const returnsValue = binding.returns.k !== "void";
  const call = `${binding.name}(${callArguments.join(", ")})`;
  const hasCollector = Boolean(callbackPlan);

  const body = [];
  body.push(...lines);
  if (checks.length > 0) body.push("", ...checks);
  body.push("");
  body.push(returnsValue ? `    auto result = ${call};` : `    ${call};`);

  const outputValue = (output) => output.source === "collector"
    ? "collector.Finish()"
    : toJs(output.descriptor, `o_${output.name}`);
  const resultValue = () => toJs(binding.returns, "result", { ownership: binding.returns.ownership });

  const compose = (entries, direct) => {
    if (direct && entries.length === 1) return [`    return ${entries[0].value === "std::move(items)" ? "items" : entries[0].value};`];
    const out = ["    jsi::Object object(rt);"];
    for (const entry of entries) out.push(`    object.setProperty(rt, "${entry.key}", ${entry.value});`);
    out.push("    return jsi::Value(std::move(object));");
    return out;
  };
  const entries = binding.outputs.map((output) => ({ key: output.key, value: outputValue(output) }));

  // A collector rethrows its error from Finish, but the Core results must not be converted first.
  if (hasCollector) body.push("    jsi::Value items = collector.Finish();");
  const collected = entries.map((entry) => (entry.value === "collector.Finish()" ? { ...entry, value: "std::move(items)" } : entry));

  switch (binding.result.mode) {
    case "none":
      body.push("    return jsi::Value::undefined();");
      break;
    case "value":
      body.push(`    return ${resultValue()};`);
      break;
    case "outputs":
      body.push(...compose(collected, true));
      break;
    case "success":
      body.push("    if (result == TRFalse) {", "        return jsi::Value::undefined();", "    }", ...compose(collected, true));
      break;
    case "object":
      body.push(...compose([{ key: "result", value: resultValue() }, ...collected], false));
      break;
    default:
      throw new Error(`${binding.name}: result mode ${binding.result.mode}`);
  }

  const jsCount = jsIndex;
  const needsArgs = usesArgs || binding.returns.k === "pointerView";
  const code = `jsi::Value Bind${binding.name}(jsi::Runtime &rt, const jsi::Value &, ${needsArgs ? "const jsi::Value *args, size_t count" : "const jsi::Value *, size_t"}) {
    [[maybe_unused]] constexpr const char *kFunction = "${binding.name}";
${body.join("\n")}
}`;

  return { code, trampolines, jsCount };
}

function emitBindingsFile(base, bindings) {
  const parts = bindings.map(emitBinding);
  const trampolines = parts.flatMap((part) => part.trampolines.map((t) => t.code));
  const installs = bindings.map((binding, index) =>
    `    target.setProperty(rt, "${binding.name}", jsi::Function::createFromHostFunction(rt, jsi::PropNameID::forAscii(rt, "${binding.name}"), ${parts[index].jsCount}, &Bind${binding.name}));`);

  return header(`#include "Bindings.h"

#include "GeneratedSupport.h"
#include "Handles.h"
#include "Structs.h"

namespace tehreer {
namespace generated {
namespace {

${[...trampolines, ...parts.map((part) => part.code)].join("\n\n")}

} // namespace

void Install${base}(jsi::Runtime &rt, jsi::Object &target) {
${installs.join("\n")}
}

} // namespace generated
} // namespace tehreer
`);
}

/**
 * @param {object} model The plan from `buildModel`.
 * @param {{ includePrefix: string, skipIncludes: string[] }} options
 * @returns {Map<string, string>} The text of every file, by name.
 */
export function emitCpp(model, options) {
  const files = new Map();
  files.set("GeneratedSupport.h", emitSupport(model, options));
  files.set("Handles.h", emitHandles(model));
  files.set("Structs.h", emitStructs(model));

  const byFile = new Map();
  for (const binding of model.bindings) {
    if (!byFile.has(binding.file)) byFile.set(binding.file, []);
    byFile.get(binding.file).push(binding);
  }

  const bases = [];
  for (const [file, bindings] of byFile) {
    const base = file.replace(/\.h$/, "");
    bases.push(base);
    files.set(`${base}Bindings.cpp`, emitBindingsFile(base, bindings));
  }

  files.set("Bindings.h", header(`#ifndef TEHREER_GENERATED_BINDINGS_H
#define TEHREER_GENERATED_BINDINGS_H

#include "GeneratedSupport.h"

namespace tehreer {
namespace generated {

/** Adds every binding to \`target\`, a property for each Core function with the name of the function. */
void InstallBindings(jsi::Runtime &rt, jsi::Object &target);

${bases.map((base) => `void Install${base}(jsi::Runtime &rt, jsi::Object &target);`).join("\n")}

} // namespace generated
} // namespace tehreer

#endif
`));

  files.set("Bindings.cpp", header(`#include "Bindings.h"

namespace tehreer {
namespace generated {

void InstallBindings(jsi::Runtime &rt, jsi::Object &target) {
${bases.map((base) => `    Install${base}(rt, target);`).join("\n")}
}

} // namespace generated
} // namespace tehreer
`));

  return files;
}
