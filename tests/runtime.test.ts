import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

// The C++ runtime defines the templates that the generated code only declares, so a type that the
// generated code uses and the runtime does not instantiate fails at link time, on a device build.
// These tests find that on a machine without a native toolchain.
const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const generated = existsSync(join(root, "cpp/generated"))
  ? readdirSync(join(root, "cpp/generated")).filter((name) => name.endsWith(".cpp") || name === "Structs.h")
  : [];

function used(pattern: RegExp): Set<string> {
  const names = new Set<string>();
  for (const file of generated) {
    for (const match of read(`cpp/generated/${file}`).matchAll(pattern)) {
      names.add(match[1] as string);
    }
  }
  return names;
}

test("the runtime instantiates ToHandle and FromHandle for every handle type of the traits", () => {
  const traits = [...read("cpp/generated/Handles.h").matchAll(/struct HandleTraits<(\w+)>/g)].map((match) => match[1] as string);
  const instantiated = new Set([...read("cpp/runtime/MarshalHandles.cpp").matchAll(/TEHREER_HANDLE_REF\((\w+)\)/g)].map((match) => match[1]));

  assert.ok(traits.length > 0);
  for (const name of traits) {
    assert.ok(instantiated.has(name), `${name} is not instantiated in cpp/runtime/MarshalHandles.cpp`);
  }
  assert.deepEqual([...used(/ToHandle<(\w+)>/g)].filter((name) => !traits.includes(name)), []);
  assert.deepEqual([...used(/FromHandle<(\w+)>/g)].filter((name) => !traits.includes(name)), []);
});

test("the runtime instantiates ToNumber and FromNumber for every type the generated code converts", () => {
  const instantiated = new Set([...read("cpp/runtime/MarshalValues.cpp").matchAll(/TEHREER_NUMBER\((\w+)\)/g)].map((match) => match[1]));
  const types = new Set([...used(/ToNumber<(\w+)>/g), ...used(/FromNumber<(\w+)>/g)]);

  assert.ok(types.size > 0);
  for (const name of types) {
    assert.ok(instantiated.has(name), `${name} is not instantiated in cpp/runtime/MarshalValues.cpp`);
  }
});

test("the runtime defines every function that GeneratedSupport.h declares without a body", () => {
  const header = read("cpp/generated/GeneratedSupport.h");
  const sources = ["Callbacks", "Errors", "MarshalHandles", "MarshalValues"].map((name) => read(`cpp/runtime/${name}.cpp`)).join("\n");
  const declared = [...header.matchAll(/^(?:\[\[noreturn\]\] )?[\w:<>&\s*]+?[\s&*](\w+)\([^)]*\);$/gm)].map((match) => match[1] as string);

  assert.ok(declared.includes("ToConstBuffer"));
  for (const name of declared) {
    // A definition starts in the first column and opens its body on the same line, which a call or
    // a mention in a comment does not.
    assert.match(sources, new RegExp(`^[^\\s/][^;\\n]*\\b${name}\\([^;\\n]*\\{$`, "m"), `${name} is declared but not defined in cpp/runtime`);
  }
});

test("the handle functions and the debug hooks agree between TypeScript and C++", () => {
  const typescript = read("src/internal/NativeBindings.ts");
  const cpp = ["TehreerBindings", "ReplacementBindings", "DrawBindings", "TextBindings", "ViewBindings", "ViewTestHooks", "CallbackTestHooks", "GlyphImageTestHooks", "PointerBuffers", "PointerTestHooks"].map((name) => read(`cpp/runtime/${name}.cpp`)).concat(read("cpp/painter/PaintTestHooks.cpp")).join("\n");
  const names = [...typescript.matchAll(/^ {2}(\w+)\??\(/gm)].map((match) => match[1] as string);

  assert.deepEqual(names, [
    "getVersion", "smokeTest", "disposeHandle", "isHandleDisposed", "isHandleMutable", "handleEquals", "retainHandle", "TRReplacementCreate", "invokeReplacementDraw", "installDrawContext", "restoreDrawContext", "registerTypesetter", "unregisterTypesetter", "registerComposedFrame", "unregisterComposedFrame", "createReplacementHolder", "testGetViewCounts", "testApplyRendererSettings", "TRTextSetAttribute", "TRTypesetterCreate",
    "createPointerBuffer", "readPointerStructs",
    "testCreateProbe", "testGetProbeReleaseCount", "testCollectGarbage", "testRoundTripStruct", "testGetStructNames",
    "testGetHandlerCount", "testGetRetiredHandlerCount", "testDrainHandlers", "testReleaseOnOtherThread",
    "testSetNativeDrawCallbacks", "testGetDrawCallbacks", "testComputeRoomOnOtherThread", "testEnumerate",
    "testCreateMemoryProbe", "testReplaceMemoryProbe", "testGetMemoryProbeView", "testWriteMemoryProbe", "testGetMemoryProbeReferences",
    "testGetMemoryBlockCount", "testDropPointerBufferOnOtherThread",
    "testAttachNativeData", "testGetNativeDataSerial", "testGetNativeDataCounts",
    "testPaintFrame", "testGetPaintCounts",
  ]);
  for (const name of names) {
    assert.ok(cpp.includes(`"${name}"`), `${name} is not installed by cpp/runtime`);
  }

  // The hooks must not exist in release builds: the ones of TehreerBindings.cpp are behind
  // #ifndef NDEBUG, and the files of the callback and pointer hooks are empty without the debug build.
  const bindings = read("cpp/runtime/TehreerBindings.cpp");
  const start = bindings.indexOf('#ifndef NDEBUG\n    Define');
  const hooks = bindings.slice(start, bindings.indexOf("#endif", start));
  const hookFiles = ["CallbackTestHooks", "GlyphImageTestHooks", "PointerTestHooks", "ViewTestHooks"].map((name) => read(`cpp/runtime/${name}.cpp`)).concat(read("cpp/painter/PaintTestHooks.cpp"));
  const inDebugFile = (file: string, name: string) => file.includes(`"${name}"`) && file.indexOf("#ifndef NDEBUG") < file.indexOf(`"${name}"`)
    && file.trimEnd().endsWith("#endif");
  const debugOnly = (name: string) => hooks.includes(`"${name}"`) || hookFiles.some((file) => inDebugFile(file, name));

  assert.ok(hooks.includes("InstallCallbackTestHooks(runtime, bindings)"));
  assert.ok(hooks.includes("InstallGlyphImageTestHooks(runtime, bindings)"));
  assert.ok(hooks.includes("InstallPaintTestHooks(runtime, bindings)"));
  assert.ok(hooks.includes("InstallPointerTestHooks(runtime, bindings)"));
  assert.ok(hooks.includes("InstallViewTestHooks(runtime, bindings)"));
  // The two bindings that lists need are in every build, and so are not in the debug block.
  for (const name of ["createPointerBuffer", "readPointerStructs"]) {
    assert.ok(!hooks.includes(`"${name}"`) && read("cpp/runtime/PointerBuffers.cpp").includes(`"${name}"`));
  }
  for (const name of names.filter((n) => n.startsWith("test"))) {
    assert.ok(debugOnly(name), `${name} is not behind #ifndef NDEBUG`);
  }
  assert.ok(!bindings.slice(bindings.indexOf("#endif", start)).includes('"test'), "a hook is installed after the debug block");
});
