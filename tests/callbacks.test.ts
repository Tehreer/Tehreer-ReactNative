import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { checkSyntax, findCompiler, NO_COMPILER } from "./CompileSupport.mjs";
import { MANUAL } from "../scripts/generator/config.mjs";

// The callbacks cannot run under node (they need a JS runtime with JSI, which only exists in the
// example app; see tests/device/CallbackTests.ts for what is tested there). These tests pin the
// rules that keep Core's C frames safe, so that an edit that breaks one fails without a device,
// and compile the runtime against the real JSI headers of React Native.
const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const coreHeaders = join(root, "Libraries/TehreerCore/Headers");
const jsiHeaders = join(root, "node_modules/react-native/ReactCommon/jsi");
const sheenBidiHeaders = join(root, "Libraries/Dependencies/SheenBidi/Headers");

/** The body of the function that starts at `signature`, up to the closing brace in the first column. */
function bodyOf(text: string, signature: string): string {
  const start = text.indexOf(signature);
  assert.ok(start >= 0, `${signature} was not found`);
  return text.slice(start, text.indexOf("\n}\n", start));
}

test("the trampolines of a kept callback never let an exception out", () => {
  const text = read("cpp/runtime/ReplacementBindings.cpp");

  // noexcept turns a mistake into a terminate instead of an unwind through C frames.
  assert.match(text, /void ComputeRoom\(void \*userData, TRFloat layoutWidth, TRReplacementRoom \*room\) noexcept \{/);
  assert.match(text, /void Finalize\(void \*userData\) noexcept \{/);
  assert.match(bodyOf(text, "void ComputeRoom("), /runtime::InvokeHandler\(userData,/);

  const callbacks = bodyOf(text, "jsi::Value BindReplacementCreate(");
  assert.match(callbacks, /callbacks\.computeRoom = &ComputeRoom;/);
  assert.match(callbacks, /callbacks\.finalize = &Finalize;/);

  const invoke = read("cpp/runtime/Callbacks.h");
  assert.match(invoke, /bool InvokeHandler\(void \*userData, Body &&body\) noexcept \{/);
  // Both the lookup and the handler are inside a catch-all, and a failure is recorded, not rethrown.
  assert.equal([...invoke.matchAll(/catch \(\.\.\.\)/g)].length, 2);
  assert.match(invoke, /RecordCallbackError\(\*target\.runtime, std::current_exception\(\)\)/);
  assert.match(invoke, /marshal::HasCallbackError\(\*target\.runtime\)/);
});

test("a finalizer only drops a table entry and touches no JavaScript", () => {
  const text = read("cpp/runtime/ReplacementBindings.cpp");
  const finalize = bodyOf(text, "void Finalize(");

  assert.match(finalize, /HandlerTable::Shared\(\)\.Remove\(/);
  assert.doesNotMatch(finalize, /jsi::|getProperty|call|rt\b/);

  // Remove may run on any thread, inside an engine finalizer: a handler is always queued, never
  // destroyed there, whichever thread it is (the behaviour is run by tests/handlerTable.test.ts).
  const table = read("cpp/runtime/HandlerTable.cpp");
  const remove = bodyOf(table, "void HandlerTable::Remove(");
  assert.doesNotMatch(remove, /this_thread/);
  assert.match(remove, /retired\.push_back/);
  // And a handler is found only on its runtime's thread.
  assert.match(bodyOf(table, "HandlerTable::Target HandlerTable::Find("), /scope\.thread != std::this_thread::get_id\(\)/);
});

test("keys are never 0, and the table is cleared by a host object when the runtime goes away", () => {
  const table = read("cpp/runtime/HandlerTable.cpp");

  assert.match(table, /while \(key == 0 \|\| _entries\.count\(key\) != 0\)/);
  assert.match(table, /class HandlerTable::Lifetime final : public jsi::HostObject/);
  assert.match(bodyOf(table, "~Lifetime() override {"), /Shared\(\)\.Detach\(_scope\)/);
  // Never destroyed at exit: the jsi values it could hold would outlive their runtime.
  assert.match(table, /static HandlerTable \*table = new HandlerTable\(\);/);

  const bindings = read("cpp/runtime/TehreerBindings.cpp");
  assert.match(bindings, /"lifetime", jsi::Object::createFromHostObject\(\s*runtime, runtime::HandlerTable::Shared\(\)\.Attach\(runtime\)\)/);
  // Before the freeze and the read-only property, so that nothing can drop it.
  assert.ok(bindings.indexOf('"lifetime"') < bindings.indexOf("freeze.call(runtime, bindings)"));
});

test("creation keeps the handler before Core can call it and drops it on every failure path", () => {
  const create = bodyOf(read("cpp/runtime/ReplacementBindings.cpp"), "jsi::Value BindReplacementCreate(");

  // Arguments first, then the table, then Core, so a bad argument keeps nothing.
  const order = ["marshal::ToObject(", "marshal::ToNumber<TRReplacementKind>", "table.Add(", "TRReplacementCreate(&callbacks"].map((part) => create.indexOf(part));
  assert.ok(order.every((index) => index >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);

  // Core makes no object on NULL, so it never calls finalize and the entry is removed here.
  assert.match(create, /if \(replacement == nullptr\) \{[^}]*table\.Remove\(key\);/);
  // An owned reference goes straight into a handle, which releases it (and so the entry) if that fails.
  assert.match(create, /FromHandle<TRReplacementRef>\(rt, replacement, marshal::Ownership::Adopt\)/);
});

test("the functions that keep callbacks are bound by hand, and only they use the table", () => {
  const kept = [...MANUAL].filter(([, reason]) => /handler table/.test(reason)).map(([name]) => name);
  assert.deepEqual(kept, ["TRReplacementCreate"]);

  const installed = read("cpp/runtime/ReplacementBindings.cpp");
  for (const name of kept) {
    assert.ok(installed.includes(`"${name}"`), `${name} is not installed`);
  }

  // The others of MANUAL either never keep JavaScript (native painters and native data) or take
  // no callback, so they must not reach for the table.
  const sources = readdirSync(join(root, "cpp/runtime")).filter((name) => name.endsWith(".cpp"));
  const users = sources.filter((name) => /HandlerTable::Shared\(\)/.test(read(`cpp/runtime/${name}`))).sort();
  assert.deepEqual(users, ["CallbackTestHooks.cpp", "Callbacks.cpp", "DrawBindings.cpp", "HandlerTable.cpp", "ReplacementBindings.cpp", "TehreerBindings.cpp"]);

  // The Core header agrees: the only callbacks that are kept after the call are the replacement's.
  const header = read("Libraries/TehreerCore/Headers/Tehreer/TRReplacement.h");
  assert.match(header, /void \(\*computeRoom\)\(void \*userData, TRFloat layoutWidth, TRReplacementRoom \*room\);/);
  assert.match(header, /void \(\*finalize\)\(void \*userData\);/);
});

test("every generated binding looks for a callback error right after Core returns, and releases what it created", () => {
  const generated = join(root, "cpp/generated");
  let bindings = 0;

  for (const name of readdirSync(generated).filter((file) => /Bindings\.cpp$/.test(file) && file !== "Bindings.cpp")) {
    const text = readFileSync(join(generated, name), "utf8");
    for (const match of text.matchAll(/^jsi::Value Bind(\w+)\([^\n]*\{\n([\s\S]*?)\n\}\n/gm)) {
      bindings++;
      const [, binding, body] = match as unknown as [string, string, string];
      const lines = (body as string).split("\n");
      // A leftover error that nothing threw must not surface from this call.
      assert.equal(lines[1], "    marshal::BeginCall();", `${binding}: does not forget a stale callback error first`);
      const call = lines.findIndex((line) => new RegExp(`^ {4}(auto result = )?${binding}\\(`).test(line));
      assert.ok(call >= 0, `${binding}: the call to Core was not found`);

      const next = lines[call + 1] ?? "";
      const owned = /auto result = /.test(lines[call] ?? "") && /marshal::Ownership::Adopt/.test(body);
      assert.equal(next, owned ? "    marshal::RethrowCallbackError(rt, result);" : "    marshal::RethrowCallbackError(rt);", `${binding}: the line after the call is "${next}"`);
    }
  }
  assert.ok(bindings > 200, `${bindings} bindings were found`);

  const support = read("cpp/generated/GeneratedSupport.h");
  assert.match(support, /bool HasCallbackError\(jsi::Runtime &rt\);/);
  assert.match(support, /\[\[noreturn\]\] void ThrowCallbackError\(jsi::Runtime &rt\);/);
  assert.match(read("cpp/generated/Handles.h"), /HandleTraits<Ref>::Release\(owned\);\s*\}\s*ThrowCallbackError\(rt\);/);
});

test("the first error is the one thrown, and the slot is empty once it is", () => {
  const text = read("cpp/runtime/Callbacks.cpp");

  assert.match(text, /thread_local PendingError gPending;/);
  assert.match(bodyOf(text, "void RecordCallbackError("), /if \(!gPending\.error\) \{/);
  const thrown = bodyOf(text, "void ThrowCallbackError(");
  assert.ok(thrown.indexOf("gPending.error = nullptr") < thrown.indexOf("std::rethrow_exception"), "the slot is cleared before the throw");
});

// What React Native compiles: C++20 against the real jsi.h, in a debug and a release configuration.
const compiler = findCompiler();
const skip = !compiler ? NO_COMPILER
  : !existsSync(join(jsiHeaders, "jsi/jsi.h")) ? "react-native is not installed (node_modules/react-native/ReactCommon/jsi)"
    : !existsSync(join(coreHeaders, "Tehreer")) ? "the Core submodule is not initialised (git submodule update --init)"
      : !existsSync(join(sheenBidiHeaders, "SheenBidi")) ? "SheenBidi is not fetched (npm run setup)"
        : false;

for (const [label, defines] of [["debug", []], ["release", ["NDEBUG"]]] as const) {
  test(`the runtime and the generated bindings compile as C++20 against the real JSI (${label})`, { skip }, async () => {
    const includes = [jsiHeaders, coreHeaders, sheenBidiHeaders, join(root, "cpp")];
    // TehreerModule.cpp needs the headers that codegen writes into an app, so it is left out.
    const files = [
      ...readdirSync(join(root, "cpp/runtime")).filter((name) => name.endsWith(".cpp")).map((name) => join(root, "cpp/runtime", name)),
      ...readdirSync(join(root, "cpp/generated")).filter((name) => name.endsWith(".cpp")).map((name) => join(root, "cpp/generated", name)),
    ];
    assert.ok(files.length > 25);

    const results = await Promise.all(files.map((file) => checkSyntax(compiler as string, file, includes, { standard: "c++20", defines: [...defines] })));
    assert.deepEqual(results.filter((result) => !result.ok).map((result) => `${result.file}\n${result.output}`), []);
  });
}
