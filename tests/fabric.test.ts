import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { checkSyntax, findCompiler, NO_COMPILER } from "./CompileSupport.mjs";

// The Fabric component of issue #26. Shadow nodes need React Native's C++ and a device to run, so
// the pure parts run here (the UTF-8 decoding, the syntax of the Core-only composer) and the names
// that JavaScript, C++, Kotlin and Objective-C++ must agree on are pinned. The measurement itself is
// checked on a device by example/tests/ViewTests.tsx.
const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const compiler = findCompiler();
const coreHeaders = join(root, "Libraries/TehreerCore/Headers");
const skip = !compiler ? NO_COMPILER : !existsSync(join(coreHeaders, "Tehreer")) ? "the Core submodule is not initialised" : false;

test("Utf8ToUtf16 decodes like the WHATWG decoder", { skip }, () => {
  const scratch = mkdtempSync(join(tmpdir(), "tehreer-utf8-"));
  try {
    const program = join(scratch, "check");
    const build = spawnSync(compiler as string, [
      "-std=c++20", "-Wall", "-Wextra", "-Werror", `-I${join(root, "cpp")}`,
      join(root, "tests/fixtures/fabric/Utf8Check.cpp"), "-o", program,
    ], { encoding: "utf8" });
    assert.equal(build.status, 0, build.stdout + build.stderr);
    const run = spawnSync(program, [], { encoding: "utf8" });
    assert.equal(run.status, 0, run.stdout + run.stderr);
    assert.match(run.stdout, /^OK/);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("the composer compiles against the headers of Core alone", { skip }, async () => {
  const result = await checkSyntax(compiler as string, join(root, "cpp/fabric/TextFrameComposer.cpp"), [join(root, "cpp"), coreHeaders], { standard: "c++20" });
  assert.ok(result.ok, result.output);
});

test("the component name agrees in the spec, C++, Kotlin and the codegen config", () => {
  const name = "TehreerTextBase";
  const manifest = JSON.parse(read("package.json")) as {
    codegenConfig: { type: string; ios: { components: Record<string, { className: string }> } };
  };

  assert.match(read("src/specs/TehreerTextBaseNativeComponent.ts"), new RegExp(`codegenNativeComponent<NativeProps>\\("${name}", \\{ interfaceOnly: true \\}\\)`));
  assert.match(read("cpp/fabric/TehreerTextBaseShadowNode.cpp"), new RegExp(`TehreerTextBaseComponentName\\[\\] = "${name}"`));
  assert.match(read("android/src/main/java/com/tehreer/reactnative/TehreerTextBaseManager.kt"), new RegExp(`NAME = "${name}"`));
  // "all" generates components too; with "modules" the spec of the component would be ignored.
  assert.equal(manifest.codegenConfig.type, "all");
  const className = manifest.codegenConfig.ios.components[name]?.className;
  assert.ok(className);
  assert.match(read(`ios/${className}.mm`), new RegExp(`@implementation ${className}`));
  // The CLI finds the descriptor of Android by this name, and autolinking includes TehreerModule.h only.
  assert.match(read("cpp/fabric/TehreerTextBaseComponentDescriptor.h"), /using TehreerTextBaseComponentDescriptor =/);
  assert.match(read("cpp/TehreerModule.h"), /fabric\/TehreerTextBaseComponentDescriptor\.h/);
  assert.match(read("android/CMakeLists.txt"), /cpp\/fabric\/\*\.cpp/);
  // The CLI skips interfaceOnly components when it looks for descriptors, so Android lists it itself.
  assert.match(read("react-native.config.cjs"), /componentDescriptors: \["TehreerTextBaseComponentDescriptor"\]/);
  assert.match(read("android/src/main/java/com/tehreer/reactnative/TehreerPackage.kt"), /TehreerTextBaseManager\(\)/);
});

// The painters of issues #24 and #25: the parts that need no engine or device are compiled here, and
// the names that Kotlin, C++ and the build files must agree on are pinned.
test("the platform independent painter and the frame registry compile against the headers of Core alone", { skip }, async () => {
  const files = ["cpp/painter/PaintCallbacks.cpp", "cpp/fabric/FrameRegistry.cpp", "cpp/fabric/ViewText.cpp", "cpp/fabric/StaticReplacements.cpp"];
  for (const file of files) {
    const result = await checkSyntax(compiler as string, join(root, file), [join(root, "cpp"), coreHeaders], { standard: "c++20" });
    assert.ok(result.ok, `${file}: ${result.output}`);
  }
});

test("every JNI function that Kotlin declares is defined in C++ with the same name, and the build keeps them", () => {
  const kotlin = read("android/src/main/java/com/tehreer/reactnative/TehreerPaintJni.kt");
  const cpp = read("android/src/main/cpp/TextBaseJni.cpp");
  const declared = [...kotlin.matchAll(/@JvmStatic external fun (\w+)\(/g)].map((match) => match[1]);
  assert.deepEqual(declared.sort(), ["create", "destroy", "draw", "setFrame"]);
  for (const name of declared) {
    assert.match(cpp, new RegExp(`Java_com_tehreer_reactnative_TehreerPaintJni_${name}\\(`));
  }
  // A static archive only gives up the members that something refers to, and nothing in C++ refers to these.
  const cmake = read("android/CMakeLists.txt");
  assert.match(cmake, /--undefined=Java_com_tehreer_reactnative_TehreerPaintJni_create/);
  assert.match(cmake, /android\/src\/main\/cpp\/\*\.cpp/);
  assert.match(cmake, /cpp\/painter\/\*\.cpp/);
});

test("the Kotlin manager reads the frame id from the key that the state writes", () => {
  const state = read("cpp/fabric/TehreerTextBaseState.h");
  assert.match(state, /builder\.putInt\(6, frame \? static_cast<int>\(frame->id\(\)\) : 0\)/);
  assert.match(read("android/src/main/java/com/tehreer/reactnative/TehreerTextBaseManager.kt"), /view\.setComposedFrame\(state\.getInt\(6\), state\.getDouble\(3\)\.toFloat\(\)\)/);
  // The height of the frame (key 3) is how far a scrolling view scrolls.
  assert.match(state, /builder\.putDouble\(3, frameHeight\(\)\)/);
});

// Issues #27 to #29: attributed text, scrolling, selection and static replacements.
test("every prop of the component reaches the code that reads it", () => {
  const spec = read("src/specs/TehreerTextBaseNativeComponent.ts");
  const props = [...spec.matchAll(/^  (\w+)\?: CodegenTypes\./gm)].map((match) => match[1] as string);
  const shadow = read("cpp/fabric/TehreerTextBaseShadowNode.cpp") + read("cpp/fabric/TehreerTextBaseState.h");
  const manager = read("android/src/main/java/com/tehreer/reactnative/TehreerTextBaseManager.kt");
  const view = read("ios/TehreerTextBaseView.mm");
  // Props that lay the text out are read by the shadow node; props that only paint by the views.
  const layout = ["text", "typefaceTag", "typeSize", "maxLines", "textId", "textAlignment", "truncationEnabled", "truncationMode", "truncationPlace",
    "extraLineSpacing", "lineHeightMultiplier", "justificationEnabled", "justificationLevel", "scrollable"];
  const paint = ["textColor", "selectionStart", "selectionEnd", "selectionColor", "scrollToOffset", "scrollToToken", "scrollable"];
  const events = ["onFrameReady", "onTextTap", "onTextScroll"];
  for (const name of props) {
    if (events.includes(name)) {
      continue;
    }
    assert.ok(layout.includes(name) || paint.includes(name), `${name} is not classified in this test`);
    if (layout.includes(name)) {
      assert.match(shadow, new RegExp(`props\\.${name}\\b`), `${name} is not read by the shadow node`);
    }
    if (paint.includes(name)) {
      assert.match(manager, new RegExp(`name = "${name}"`), `${name} has no ReactProp in Kotlin`);
      assert.match(view, new RegExp(`(props|next)\\.${name}\\b`), `${name} is not read by the iOS view`);
    }
  }
  for (const name of ["textId", "scrollable", "selectionStart"]) {
    assert.ok(props.includes(name), name);
  }
});

test("events agree in the spec, Kotlin and the iOS view", () => {
  const manager = read("android/src/main/java/com/tehreer/reactnative/TehreerTextBaseManager.kt");
  const view = read("ios/TehreerTextBaseView.mm");
  for (const [native, js, emit] of [["topFrameReady", "onFrameReady", "onFrameReady"], ["topTextTap", "onTextTap", "onTextTap"], ["topTextScroll", "onTextScroll", "onTextScroll"]]) {
    assert.match(manager, new RegExp(`"${native}" to mapOf\\("registrationName" to "${js}"\\)`));
    assert.match(view, new RegExp(`->${emit}\\(`));
  }
  // JavaScript reads the id of the frame from the event of both platforms.
  assert.match(manager, /putInt\("frameId", frameId\)/);
  assert.match(view, /\.frameId = /);
});

test("the view bindings that TypeScript declares are defined in C++", () => {
  const cpp = read("cpp/runtime/ViewBindings.cpp");
  const ts = read("src/internal/NativeBindings.ts");
  for (const name of ["registerViewText", "unregisterViewText", "createStaticReplacement", "acquireViewFrame"]) {
    assert.match(ts, new RegExp(`\\b${name}\\(`), `${name} is not declared in NativeBindings.ts`);
    assert.match(cpp, new RegExp(`Define\\(runtime, target, "${name}"`), `${name} is not installed`);
  }
  assert.match(read("cpp/runtime/TehreerBindings.cpp"), /InstallViewBindings\(runtime, bindings\)/);
});

test("the composer refuses text with a replacement that JavaScript would have to measure", () => {
  const composer = read("cpp/fabric/TextFrameComposer.cpp");
  assert.match(composer, /TRAttributeReplacement && !StaticReplacements::IsStatic/);
  assert.match(composer, /ComposeStatus::ForeignReplacement/);
  // The same check guards the registry, so a text that cannot be measured is refused at the source.
  assert.match(read("cpp/runtime/ViewBindings.cpp"), /TextHasOnlyStaticReplacements\(text\)/);
});

test("a scrolling view paints a window of lines found by Core's line locator, not the whole frame", () => {
  const painter = read("cpp/painter/PaintCallbacks.cpp");
  assert.match(painter, /TRLineLocatorEnumerateLines\(_locator, paint\.visible/);
  assert.match(read("android/src/main/cpp/TextBaseJni.cpp"), /paint\.isWindowed/);
  assert.match(read("ios/TehreerTextBaseView.mm"), /paint\.isWindowed = true/);
});
