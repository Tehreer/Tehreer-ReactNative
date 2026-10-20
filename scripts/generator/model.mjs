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

// Turns parsed declarations into a binding plan: for every public function, how each parameter is
// read from JavaScript, how the call is made and what is handed back. The two emitters only print
// the plan, so every decision about what can be expressed is made, and tested, here.
//
// A signature that the plan cannot express throws a GeneratorError that names the function and
// the type. Nothing is skipped silently.

export class GeneratorError extends Error {
  constructor(message) {
    super(message);
    this.name = "GeneratorError";
  }
}

const INTEGER_TYPES = new Set([
  "int8_t", "int16_t", "int32_t", "int64_t",
  "uint8_t", "uint16_t", "uint32_t", "uint64_t",
  "intptr_t", "uintptr_t", "size_t", "ptrdiff_t",
]);
const FLOAT_TYPES = new Set(["float", "double"]);

/** Parameters named like this carry the opaque pointer that Core hands back to a callback. */
const USER_DATA = /^(userData|context)$/;
const TYPED_COUNT = /^(count|capacity|\w+Count)$/;
const VOID_COUNT = /^(size|capacity|count|length|\w+(Count|Size|Length))$/;
const BYTE_COUNT = /(size|capacity)$/i;

/**
 * Describes the typedefs of the headers and tells what kind of value a type name is.
 */
class Registry {
  constructor(typedefs, booleanTypes) {
    this.booleanTypes = booleanTypes;
    this.typedefs = new Map();
    for (const typedef of typedefs) this.typedefs.set(typedef.name, typedef);
  }

  /** Follows aliases until a kind that has its own rules. */
  resolve(name, context) {
    const chain = [];
    let current = name;
    for (;;) {
      chain.push(current);
      if (this.booleanTypes.has(current)) return { kind: "bool", chain };
      const typedef = this.typedefs.get(current);
      if (!typedef) {
        if (current === "void") return { kind: "void", chain };
        if (current === "char") return { kind: "char", chain };
        if (INTEGER_TYPES.has(current)) return { kind: "number", integer: true, chain };
        if (FLOAT_TYPES.has(current)) return { kind: "number", integer: false, chain };
        throw new GeneratorError(`${context}: unknown type "${name}"${current === name ? "" : ` (through "${current}")`}`);
      }
      if (typedef.kind === "alias") {
        if (typedef.target.pointer !== 0 || typedef.target.tag) {
          throw new GeneratorError(`${context}: "${current}" is a typedef of a pointer or of a tagged type, which is not supported`);
        }
        current = typedef.target.base;
        continue;
      }
      return { kind: typedef.kind, typedef, chain };
    }
  }
}

/** The size in bytes of one element: a `void *` and a `char *` count bytes. */
const unitOfElement = (element) => (element === "void" || element === "char" ? "1" : `sizeof(${element})`);

const stripRef = (name) => name.replace(/Ref$/, "");

/**
 * @param {{ file: string, parsed: { typedefs: object[], functions: object[] } }[]} headers
 *   The parsed headers, in the order their functions are bound.
 * @param {object} config
 * @param {Set<string>} config.excluded Declared but not implemented, or needing headers of another library.
 * @param {Set<string>} config.manual Bound by hand in cpp/runtime; each needs a reason in the config.
 * @param {Record<string, Record<string, { count: string }>>} config.bounds The element count of a
 *   buffer that the signature cannot tell; `{name}` stands for a parameter.
 * @param {Record<string, string[]>} config.scalarOuts The mutable pointers that receive one value.
 * @param {Record<string, string>} [config.pointerCounts] The element count behind each getter that
 *   returns a pointer into Core memory; `{name}` stands for a parameter.
 * @param {Set<string>} [config.booleanTypes]
 */
export function buildModel(headers, config) {
  const booleanTypes = config.booleanTypes ?? new Set(["TRBoolean"]);
  const registry = new Registry(headers.flatMap((header) => header.parsed.typedefs), booleanTypes);
  const functions = headers.flatMap((header) => header.parsed.functions.map((fn) => ({ ...fn, file: header.file })));
  const known = new Map(functions.map((fn) => [fn.name, fn]));

  for (const [label, names] of [["excluded", config.excluded], ["manual", config.manual]]) {
    for (const name of names) {
      if (!known.has(name)) throw new GeneratorError(`${name}: listed as ${label} but no header declares it`);
    }
  }
  for (const [name, parameters] of Object.entries(config.bounds)) {
    const fn = known.get(name);
    if (!fn) throw new GeneratorError(`${name}: has bounds but no header declares it`);
    for (const parameter of Object.keys(parameters)) {
      if (!fn.params.some((p) => p.name === parameter)) {
        throw new GeneratorError(`${name}: has bounds for "${parameter}", which is not a parameter`);
      }
    }
  }

  for (const [name, parameters] of Object.entries(config.scalarOuts)) {
    const fn = known.get(name);
    if (!fn) throw new GeneratorError(`${name}: has scalar outputs but no header declares it`);
    for (const parameter of parameters) {
      if (!fn.params.some((p) => p.name === parameter)) {
        throw new GeneratorError(`${name}: has a scalar output "${parameter}", which is not a parameter`);
      }
    }
  }

  const pointerCounts = config.pointerCounts ?? {};
  for (const [name, expression] of Object.entries(pointerCounts)) {
    const fn = known.get(name);
    if (!fn) throw new GeneratorError(`${name}: has a pointer count but no header declares it`);
    for (const [, parameter] of expression.matchAll(/\{(\w+)\}/g)) {
      if (!fn.params.some((p) => p.name === parameter)) {
        throw new GeneratorError(`${name}: the pointer count uses "${parameter}", which is not a parameter`);
      }
    }
    for (const [, called] of expression.matchAll(/\b(TR\w+)\(/g)) {
      if (!known.has(called)) throw new GeneratorError(`${name}: the pointer count calls ${called}, which no header declares`);
    }
  }

  const structs = new Map();

  /** Registers a struct that is converted by value, in dependency order. */
  const useStruct = (name, context) => {
    if (structs.has(name)) return;
    const { typedef } = registry.resolve(name, context);
    const members = [];
    for (const member of typedef.members) {
      const memberContext = `${context}: member "${member.name}" of struct "${name}"`;
      const descriptor = describeValue(member.type, memberContext);
      if (!["number", "bool", "struct"].includes(descriptor.k)) {
        throw new GeneratorError(`${memberContext}: cannot express type "${typeText(member.type)}"`);
      }
      members.push({ name: member.name, descriptor });
    }
    structs.set(name, { name, members });
  };

  /** Describes a type that is passed by value or returned. */
  function describeValue(type, context) {
    if (type.function) throw new GeneratorError(`${context}: cannot express a function pointer`);
    if (type.pointer !== 0) throw new GeneratorError(`${context}: cannot express type "${typeText(type)}"`);

    const resolved = registry.resolve(type.base, context);
    switch (resolved.kind) {
      case "void": return { k: "void" };
      case "bool": return { k: "bool", c: type.base };
      case "number": return { k: "number", c: type.base, integer: resolved.integer };
      case "reference": return { k: "ref", c: type.base, tag: resolved.typedef.tag };
      case "struct":
        useStruct(type.base, context);
        return { k: "struct", c: type.base };
      default:
        throw new GeneratorError(`${context}: cannot express ${resolved.kind} type "${type.base}"`);
    }
  }

  /** Describes what a pointer points at, for return values, out parameters and buffers. */
  function describePointee(type, context) {
    const resolved = registry.resolve(type.base, context);
    switch (resolved.kind) {
      case "void": return { k: "void" };
      case "char": return { k: "char", c: type.base };
      case "bool": return { k: "bool", c: type.base };
      case "number": return { k: "number", c: type.base, integer: resolved.integer };
      case "struct":
      case "union": return { k: "struct", c: type.base, resolved };
      default:
        throw new GeneratorError(`${context}: cannot express a pointer to ${resolved.kind} type "${type.base}"`);
    }
  }

  function planCallback(fn, name, signature, kind, context) {
    if (typeText(signature.returns) !== "void") {
      throw new GeneratorError(`${context}: the callback must return void, not "${typeText(signature.returns)}"`);
    }
    const userData = signature.params.filter((p) => USER_DATA.test(p.name) && !p.type.function && p.type.pointer === 1 && p.type.base === "void");
    if (userData.length !== 1) {
      throw new GeneratorError(`${context}: the callback must have exactly one "void *userData" or "void *context" parameter`);
    }
    const payload = [];
    let stop = null;
    for (const p of signature.params) {
      const parameterContext = `${context}: callback parameter "${p.name}"`;
      if (p === userData[0]) continue;
      if (!p.type.function && p.type.pointer === 1 && p.type.base === "TRBoolean" && p.name === "stop") {
        stop = p.name;
        continue;
      }
      if (!p.type.function && p.type.pointer === 1 && p.type.base === "TRStringView" && p.type.const) {
        payload.push({ name: p.name, descriptor: { k: "stringView" } });
        continue;
      }
      const descriptor = describeValue(p.type, parameterContext);
      if (!["number", "bool", "ref", "struct"].includes(descriptor.k)) {
        throw new GeneratorError(`${parameterContext}: cannot express type "${typeText(p.type)}"`);
      }
      payload.push({ name: p.name, descriptor });
    }
    return { name, kind, signature, userData: userData[0].name, stop, payload, function: fn };
  }

  function planFunction(fn) {
    const fail = (what, why) => {
      throw new GeneratorError(`${fn.name}: cannot express ${what}: ${why}`);
    };
    const docOf = (name) => fn.doc.params[name] ?? "";
    // "MUST NOT be NULL" mentions NULL too, but forbids it; "unless" makes it a conditional rule that
    // the caller can satisfy with NULL, so the parameter stays nullable. A parameter whose own text
    // says nothing may still be accepted as NULL by Core, as the @return text then says
    // ("... or the buffer is `NULL`"), so that text is read as well.
    const forbids = (text) => /\b(?:must|may|can|should)\s+not\s+be\s+`?NULL|\bcannot\s+be\s+`?NULL|\bnever\s+`?NULL/i.test(text);
    // Only for data pointers: a string or an object that makes the function return NULL is a
    // mistake to report, not an optional argument.
    const isNullable = (name, type) => {
      const text = docOf(name);
      if (forbids(text)) return /\bunless\b/.test(text);
      if (/\bNULL\b/.test(text)) return true;
      if (type.pointer !== 1 || type.base === "TRStringView" || (type.base === "char" && type.const)) return false;
      // The subject may be a part of the name: "the buffer is NULL" for `codeUnitBuffer`.
      const subjects = [...fn.doc.returns.matchAll(/`?(\w+)`?\s+(?:is|are)\s+`?NULL/g)].map((m) => (m[1] ?? "").toLowerCase());
      const lower = name.toLowerCase();
      return subjects.some((subject) => lower.includes(subject) || subject.includes(lower));
    };
    const bounds = config.bounds[fn.name] ?? {};

    // 1. The return type.
    const returns = planReturn(fn, fail);

    // 2. The parameters.
    const params = fn.params;
    const descriptors = params.map((p) => classifyParameter(p, `${fn.name}: parameter "${p.name}"`));

    const callbackCount = descriptors.filter((d) => d.k === "callback" || d.k === "callbackStruct").length;
    if (callbackCount > 1) fail("the callbacks", "only one callback parameter is supported");

    const plans = [];
    descriptors.forEach((descriptor, index) => {
      const p = params[index];
      const base = { name: p.name, index, js: true, nullable: isNullable(p.name, p.type) };
      const where = `parameter "${p.name}" of type "${typeText(p.type)}"`;

      switch (descriptor.k) {
        case "number":
        case "bool":
        case "ref":
        case "struct":
          plans.push({ ...base, kind: descriptor.k, descriptor, nullable: descriptor.k === "ref" && base.nullable });
          return;
        case "cstring":
          plans.push({ ...base, kind: "cstring" });
          return;
        case "stringView":
          plans.push({ ...base, kind: "stringView" });
          return;
        case "voidptr":
          if (USER_DATA.test(p.name) && callbackCount === 1) {
            plans.push({ ...base, kind: "userData", js: false });
            return;
          }
          if (USER_DATA.test(p.name)) fail(where, "an opaque pointer without a callback has no JavaScript representation");
          plans.push(planBuffer(params, descriptors, index, descriptor, bounds, base, fail, where));
          return;
        case "pointer":
          plans.push(planPointerParameter(fn, params, descriptors, index, descriptor, bounds, base, fail, where));
          return;
        case "callback": {
          const signature = descriptor.signature;
          plans.push({ ...base, js: false, kind: "callback", callback: planCallback(fn, p.name, signature, "single", `${fn.name}: parameter "${p.name}"`) });
          return;
        }
        case "callbackStruct": {
          const members = descriptor.members.map((member) =>
            planCallback(fn, member.name, member.type.function, "member", `${fn.name}: parameter "${p.name}" member "${member.name}"`));
          plans.push({ ...base, js: false, kind: "callbackStruct", struct: descriptor.c, members });
          return;
        }
        default:
          fail(where, `kind ${descriptor.k}`);
      }
    });

    // 3. What is handed back.
    const outs = plans.filter((plan) => plan.kind === "out");
    const callback = plans.find((plan) => plan.kind === "callback" || plan.kind === "callbackStruct");

    const outputs = [];
    for (const out of outs) outputs.push({ key: out.name, source: "out", name: out.name, descriptor: out.descriptor });
    if (callback) outputs.push({ key: "items", source: "collector", name: callback.name });

    let result;
    if (outputs.length === 0) {
      result = { mode: returns.k === "void" ? "none" : "value" };
    } else if (returns.k === "void") {
      result = { mode: "outputs" };
    } else if (returns.k === "bool") {
      // A flag with values means that the values are there when it is true.
      result = { mode: "success", flag: true };
    } else {
      result = { mode: "object" };
    }

    // A collector's error is rethrown after the call, which would leak a reference that the call
    // created and nothing owns yet.
    if (callback && returns.k === "ref" && returns.ownership === "owned") {
      fail("the result", "an enumeration cannot also return a reference that the caller owns");
    }

    return {
      name: fn.name,
      file: fn.file,
      signature: fn.signature,
      returns,
      params: plans,
      outputs,
      result,
    };
  }

  function planReturn(fn, fail) {
    const type = fn.returns;
    const where = `the return type "${typeText(type)}"`;
    if (type.function) fail(where, "a function pointer");

    if (type.pointer === 0) {
      const descriptor = describeValue(type, `${fn.name}: ${where}`);
      if (descriptor.k === "ref") return { ...descriptor, ownership: ownershipOf(fn, fail, where) };
      return descriptor;
    }

    if (type.pointer !== 1) fail(where, "a pointer to a pointer");
    const pointee = describePointee(type, `${fn.name}: ${where}`);
    if (pointee.k === "char") {
      if (!type.const) fail(where, "a mutable string");
      return { k: "cstring" };
    }
    if (pointee.k === "void") return { k: "token", c: type.const ? "const void *" : "void *" };
    if (pointee.k === "struct" && pointee.c === "TRStringView" && type.const) return { k: "stringView" };
    if (!type.const) fail(where, "a mutable pointer into Core memory");
    const owner = fn.params[0];
    if (!owner || owner.type.function || owner.type.pointer !== 0 || registry.resolve(owner.type.base, fn.name).kind !== "reference") {
      fail(where, "the pointer needs an owner, and the first parameter is not an object reference");
    }
    const count = pointerCounts[fn.name];
    if (count === undefined) fail(where, "the number of elements behind the pointer is unknown: add the function to POINTER_COUNTS");
    return { k: "pointerView", element: pointee.c, pointee, count };
  }

  /**
   * `Create` and `Copy` give a reference that the caller owns, as does `Retain`; `Get` does not.
   * They are matched as whole camel-case words, so `TRFooTargetBar` is not a `Get`.
   */
  function ownershipOf(fn, fail, where) {
    if (/[a-z0-9](?:Create|Copy)(?=[A-Z0-9]|$)/.test(fn.name) || /[a-z0-9]Retain$/.test(fn.name)) return "owned";
    if (/[a-z0-9]Get(?=[A-Z0-9]|$)/.test(fn.name)) return "borrowed";
    return fail(where, "its ownership is unknown, as the name has none of Create, Copy, Retain or Get");
  }

  function classifyParameter(p, context) {
    const type = p.type;
    if (type.function) throw new GeneratorError(`${context}: cannot express an inline function pointer`);

    if (type.pointer === 0) {
      const resolved = registry.resolve(type.base, context);
      if (resolved.kind === "function") {
        return { k: "callback", signature: resolved.typedef };
      }
      return describeValue(type, context);
    }
    if (type.pointer !== 1) throw new GeneratorError(`${context}: cannot express type "${typeText(type)}"`);

    const pointee = describePointee(type, context);
    if (pointee.k === "char" && type.const) return { k: "cstring" };
    if (pointee.k === "void") return { k: "voidptr", const: type.const };
    if (pointee.k === "struct" && pointee.c === "TRStringView" && type.const) return { k: "stringView" };

    if (pointee.k === "struct" && pointee.resolved.kind === "struct") {
      const members = pointee.resolved.typedef.members;
      if (members.length > 0 && members.every((m) => m.type.function)) {
        if (!type.const) throw new GeneratorError(`${context}: a mutable pointer to the callbacks "${type.base}" is not supported`);
        return { k: "callbackStruct", c: type.base, members };
      }
    }
    return { k: "pointer", const: type.const, pointee, c: type.base };
  }

  /**
   * The count of a buffer is the first count after it. A `void *` buffer, which is text or bytes,
   * may also have it before, as in `TRTextGetCodeUnits(text, index, length, buffer)`.
   */
  function counterOf(params, descriptors, index, pattern, mayPrecede) {
    const isCount = (j) => pattern.test(params[j].name) && descriptors[j].k === "number";
    for (let j = index + 1; j < params.length; j++) if (isCount(j)) return params[j].name;
    if (mayPrecede) for (let j = index - 1; j >= 0; j--) if (isCount(j)) return params[j].name;
    return null;
  }

  /** The size in bytes of one counted unit of a `void *` buffer. */
  function unitOf(params, descriptors, counter, fail, where) {
    if (BYTE_COUNT.test(counter)) return unitOfElement("void");

    const encoding = params.find((p, j) => descriptors[j].k === "number" && p.type.base === "TRStringEncoding");
    if (encoding) return `marshal::CodeUnitSize({${encoding.name}})`;

    const first = params[0];
    if (first && !first.type.function && first.type.pointer === 0 && ["TRTextRef", "TRMutableTextRef"].includes(first.type.base)) {
      return `marshal::CodeUnitSize(TRTextGetEncoding({${first.name}}))`;
    }
    return fail(where, `the size of a code unit is unknown: "${counter}" counts units but the function has no encoding and no text`);
  }

  function planBuffer(params, descriptors, index, descriptor, bounds, base, fail, where) {
    const override = bounds[base.name];
    const counter = override ? null : counterOf(params, descriptors, index, VOID_COUNT, true);
    if (!override && !counter) fail(where, "the size of the buffer is unknown: no count, size or capacity parameter");

    const count = override ? override.count : `{${counter}}`;
    const unit = override ? unitOfElement("void") : unitOf(params, descriptors, counter, fail, where);
    return {
      ...base,
      kind: descriptor.const ? "inBuffer" : "outBuffer",
      element: "void",
      count,
      unit,
      counter,
    };
  }

  function planPointerParameter(fn, params, descriptors, index, descriptor, bounds, base, fail, where) {
    const element = descriptor.pointee;
    if (element.k === "char" && !descriptor.const) {
      const counter = counterOf(params, descriptors, index, TYPED_COUNT, false);
      if (!counter) fail(where, "the size of the buffer is unknown: no capacity parameter");
      return { ...base, kind: "outBuffer", element: "char", count: `{${counter}}`, unit: unitOfElement("char"), counter };
    }
    if (element.k === "char") fail(where, "a pointer to characters is only supported as a constant string");

    const override = bounds[base.name];
    const counter = override ? null : counterOf(params, descriptors, index, TYPED_COUNT, false);
    const scalar = element.k === "number" || element.k === "bool";

    if (element.k === "struct") {
      if (element.resolved.kind !== "struct") fail(where, `a pointer to the union "${element.c}"`);
      useStruct(element.c, `${fn.name}: ${where}`);
    }

    if (descriptor.const) {
      if (!override && !counter) {
        if (scalar) fail(where, "the length of the array is unknown: no count parameter and no bounds entry");
        return { ...base, kind: "structPointer", c: element.c };
      }
      const count = override ? override.count : `{${counter}}`;
      if (scalar) return { ...base, kind: "inBuffer", element: element.c, count, unit: unitOfElement(element.c), counter };
      return { ...base, kind: "inStructArray", c: element.c, count, counter };
    }

    if (override || counter) {
      if (!scalar) fail(where, "an output array of structs is not supported");
      return {
        ...base,
        kind: "outBuffer",
        element: element.c,
        count: override ? override.count : `{${counter}}`,
        unit: unitOfElement(element.c),
        counter,
      };
    }
    if (!(config.scalarOuts[fn.name] ?? []).includes(base.name)) {
      fail(where, "it is not known how many values Core writes through it: it has no count and is not in SCALAR_OUTS");
    }
    return {
      ...base,
      kind: "out",
      js: false,
      descriptor: scalar ? { k: element.k, c: element.c, integer: element.integer } : { k: "struct", c: element.c },
    };
  }

  // The reference types, with the functions that retain and release them.
  const refs = [];
  for (const typedef of registry.typedefs.values()) {
    if (typedef.kind !== "reference") continue;
    const peers = [...registry.typedefs.values()].filter((other) => other.kind === "reference" && other.tag === typedef.tag);
    const canonical = peers.find((other) => known.has(`${stripRef(other.name)}Retain`) && known.has(`${stripRef(other.name)}Release`));
    if (!canonical) {
      throw new GeneratorError(`${typedef.name}: the reference type has no ${stripRef(typedef.name)}Retain and ${stripRef(typedef.name)}Release`);
    }
    const group = stripRef(canonical.name);
    refs.push({ name: typedef.name, group, retain: `${group}Retain`, release: `${group}Release`, const: typedef.const });
  }

  // A handle owns one reference and releases it when it is disposed or collected, so a binding
  // that released the same reference again from JavaScript would free it twice.
  const releases = new Set(refs.map((ref) => ref.release));

  const bindings = [];
  for (const fn of functions) {
    if (config.excluded.has(fn.name) || config.manual.has(fn.name) || releases.has(fn.name)) continue;
    bindings.push(planFunction(fn));
  }

  const seen = new Set();
  for (const binding of bindings) {
    if (seen.has(binding.name)) throw new GeneratorError(`${binding.name}: declared twice`);
    seen.add(binding.name);
  }

  for (const [name, parameters] of Object.entries(config.scalarOuts)) {
    const binding = bindings.find((b) => b.name === name);
    if (!binding) throw new GeneratorError(`${name}: has scalar outputs but is excluded or manual`);
    for (const parameter of parameters) {
      if (binding.params.find((p) => p.name === parameter)?.kind !== "out") {
        throw new GeneratorError(`${name}: "${parameter}" is listed as a scalar output but is not one`);
      }
    }
  }

  for (const name of Object.keys(pointerCounts)) {
    if (bindings.find((b) => b.name === name)?.returns.k !== "pointerView") {
      throw new GeneratorError(`${name}: has a pointer count but does not return a pointer into Core memory`);
    }
  }

  const unusedBounds = Object.entries(config.bounds).filter(([name]) => !bindings.some((b) => b.name === name));
  if (unusedBounds.length > 0) {
    throw new GeneratorError(`${unusedBounds[0][0]}: has bounds but is excluded or manual`);
  }

  // Every struct and union that the headers declare, not only the ones that are converted by value:
  // native code reads the others (the draw callbacks, the attributes, what a typeface lists) too,
  // and all of them have their layout checked at compile time.
  const layouts = headers.flatMap((header) => header.parsed.typedefs)
    .filter((typedef) => typedef.kind === "struct" || typedef.kind === "union");

  // The scalar typedefs (TRFloat, TRUInt16, TRGlyphID, ...): their width decides the layout of every
  // struct and array that holds them, and a struct check cannot see a typedef that changes under it.
  const scalars = [];
  for (const typedef of headers.flatMap((header) => header.parsed.typedefs)) {
    if (typedef.kind !== "alias" || typedef.target.pointer !== 0 || typedef.target.tag) continue;

    let base = typedef.target.base;
    for (let next = registry.typedefs.get(base); next?.kind === "alias" && next.target.pointer === 0 && !next.target.tag; next = registry.typedefs.get(base)) {
      base = next.target.base;
    }
    if (INTEGER_TYPES.has(base) || FLOAT_TYPES.has(base)) scalars.push({ name: typedef.name, base });
  }

  return {
    bindings,
    structs: [...structs.values()],
    layouts,
    scalars,
    refs,
    files: [...new Set(headers.map((header) => header.file))],
    excluded: [...config.excluded],
    manual: [...config.manual],
    releases: [...releases],
  };
}

export function typeText(type) {
  if (type.function) return "function pointer";
  return `${type.const ? "const " : ""}${type.tag ? `${type.tag} ` : ""}${type.base}${type.pointer ? ` ${"*".repeat(type.pointer)}` : ""}`;
}
