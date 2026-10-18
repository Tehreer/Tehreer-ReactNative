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

// Reads the C declarations of a Tehreer Core (or SheenBidi) header: typedefs, structs, unions,
// function pointer types and the functions marked with the public macro. It understands exactly
// the C89 subset those headers use and throws a ParseError on a public declaration it cannot read,
// so that a header change never makes a function disappear silently.

export class ParseError extends Error {
  constructor(message) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Splits a header into statements, dropping comments and preprocessor lines. The last doc comment
 * before a statement is kept with it.
 */
function scan(source) {
  const statements = [];
  let text = "";
  let doc = null;
  let depth = 0;
  let index = 0;

  const isBlank = () => text.replace(/\b\w*_EXTERN_C_(?:BEGIN|END)\b/g, "").trim() === "";

  while (index < source.length) {
    const character = source[index];

    if (source.startsWith("/*", index)) {
      const end = source.indexOf("*/", index + 2);
      if (end < 0) throw new ParseError("Unterminated comment");
      if (depth === 0 && isBlank() && source.startsWith("/**", index) && !source.startsWith("/**<", index)) {
        doc = source.slice(index + 3, end);
      }
      text += " ";
      index = end + 2;
      continue;
    }

    if (source.startsWith("//", index)) {
      const end = source.indexOf("\n", index);
      index = end < 0 ? source.length : end;
      continue;
    }

    if (character === "#" && /^[ \t]*$/.test(source.slice(source.lastIndexOf("\n", index - 1) + 1, index))) {
      // A directive may continue on the next line with a backslash.
      let end = index;
      for (;;) {
        const next = source.indexOf("\n", end);
        if (next < 0) { end = source.length; break; }
        end = next + 1;
        if (source[next - 1] !== "\\") break;
      }
      index = end;
      continue;
    }

    if (character === "{" || character === "(") depth++;
    if (character === "}" || character === ")") depth--;

    if (character === ";" && depth === 0) {
      const statement = text.replace(/\b\w*_EXTERN_C_(?:BEGIN|END)\b/g, " ").replace(/\s+/g, " ").trim();
      if (statement) statements.push({ text: statement, doc });
      text = "";
      doc = null;
    } else {
      text += character;
    }
    index++;
  }

  return statements;
}

/** Splits at the commas that are not inside parentheses. */
function splitTopLevel(list) {
  const parts = [];
  let depth = 0;
  let current = "";
  for (const character of list) {
    if (character === "(") depth++;
    if (character === ")") depth--;
    if (character === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Reads a type and, when asked, the declared name after it:
 * `const TRFoo *name` gives `{ base: "TRFoo", const: true, pointer: 1 }` and the name `name`.
 */
function parseTypeAndName(text, hasName) {
  const tokens = text.match(/[A-Za-z_]\w*|\*/g) ?? [];
  let isConst = false;
  let tag = null;
  let pointer = 0;
  const identifiers = [];
  for (const token of tokens) {
    if (token === "*") pointer++;
    else if (token === "const") isConst = true;
    else if (token === "struct" || token === "union" || token === "enum") tag = token;
    else identifiers.push(token);
  }

  let name = null;
  if (hasName && identifiers.length >= 2) name = identifiers.pop();
  if (identifiers.length === 0) throw new ParseError(`Cannot read the type in "${text}"`);

  const type = { base: identifiers.join(" "), const: isConst, pointer };
  if (tag) type.tag = tag;
  return { type, name };
}

export function parseType(text) {
  return parseTypeAndName(text, false).type;
}

const FUNCTION_POINTER = /^(.*?)\(\s*\*\s*(\w+)\s*\)\s*\(([\s\S]*)\)$/;

function parseParameters(list) {
  return splitTopLevel(list)
    .filter((part) => part !== "void")
    .map((part) => parseDeclaration(part, true));
}

/** Reads a parameter or a struct member, which may be a function pointer. */
function parseDeclaration(text, isParameter) {
  const pointer = FUNCTION_POINTER.exec(text);
  if (pointer) {
    return {
      name: pointer[2],
      type: { function: { returns: parseType(pointer[1]), params: parseParameters(pointer[3]) } },
    };
  }
  const { type, name } = parseTypeAndName(text, true);
  if (name === null) {
    if (isParameter) throw new ParseError(`Unnamed parameter "${text}"`);
    throw new ParseError(`Unnamed member "${text}"`);
  }
  return { name, type };
}

function parseTypedef(text) {
  const body = text.replace(/^typedef\s+/, "");

  const record = /^(struct|union)\s*(\w+)?\s*\{([\s\S]*)\}\s*(\w+)$/.exec(body);
  if (record) {
    const members = record[3]
      .split(";")
      .map((member) => member.trim())
      .filter(Boolean)
      .map((member) => parseDeclaration(member, false));
    return { kind: record[1], name: record[4], tag: record[2] ?? null, members };
  }

  const pointer = FUNCTION_POINTER.exec(body);
  if (pointer) {
    return {
      kind: "function",
      name: pointer[2],
      returns: parseType(pointer[1]),
      params: parseParameters(pointer[3]),
    };
  }

  const alias = /^(.*?)\b(\w+)$/.exec(body);
  if (!alias) throw new ParseError(`Cannot parse typedef: ${text}`);
  const type = parseType(alias[1]);
  // `typedef const struct _TRFoo *TRFooRef;` is how Core declares an object reference.
  if (type.tag === "struct" && type.pointer === 1) {
    return { kind: "reference", name: alias[2], tag: type.base, const: type.const };
  }
  return { kind: "alias", name: alias[2], target: type };
}

/** Reads the `@param` and `@return` texts of a Doxygen comment. */
export function parseDoc(doc) {
  const result = { params: {}, returns: "" };
  if (!doc) return result;

  const lines = doc.split("\n").map((line) => line.replace(/^\s*\*?\s?/, ""));
  let current = null;
  for (const line of lines) {
    const param = /^@param\s+(\w+)\s*(.*)$/.exec(line);
    if (param) {
      current = { kind: "param", name: param[1] };
      result.params[param[1]] = param[2];
    } else if (/^@return\b/.test(line)) {
      current = { kind: "return" };
      result.returns = line.replace(/^@return\s*/, "");
    } else if (/^@\w+/.test(line)) {
      current = null;
    } else if (current?.kind === "param") {
      result.params[current.name] += ` ${line}`;
    } else if (current?.kind === "return") {
      result.returns += ` ${line}`;
    }
  }
  for (const name of Object.keys(result.params)) result.params[name] = result.params[name].replace(/\s+/g, " ").trim();
  result.returns = result.returns.replace(/\s+/g, " ").trim();
  return result;
}

function parseFunction(text, doc, options) {
  const declaration = text.replace(new RegExp(`^${options.publicMacro}\\s+`), "");
  const match = new RegExp(`^(.*?)\\b(${options.prefix}\\w+)\\s*\\(([\\s\\S]*)\\)$`).exec(declaration);
  if (!match) throw new ParseError(`Cannot parse the declaration "${declaration}"`);

  let params;
  let returns;
  try {
    returns = parseType(match[1]);
    params = parseParameters(match[3]);
  } catch (error) {
    throw new ParseError(`${match[2]}: ${error.message}`);
  }

  return {
    name: match[2],
    signature: declaration,
    returns,
    params,
    doc: parseDoc(doc),
  };
}

/**
 * Parses one header.
 *
 * @param {string} source The text of the header.
 * @param {{ publicMacro: string, prefix: string }} options The macro that marks public functions
 *   and the prefix of their names.
 * @returns The typedefs (`kind` is `alias`, `reference`, `struct`, `union` or `function`) and the
 *   public functions, in source order.
 */
export function parseHeader(source, options) {
  const typedefs = [];
  const functions = [];

  for (const { text, doc } of scan(source)) {
    if (/^typedef\b/.test(text)) {
      typedefs.push(parseTypedef(text));
    } else if (new RegExp(`^${options.publicMacro}\\b`).test(text)) {
      functions.push(parseFunction(text, doc, options));
    }
  }

  return { typedefs, functions };
}
