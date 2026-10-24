import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { checkSyntax, findCompiler, NO_COMPILER } from "./CompileSupport.mjs";

// The Fabric components TLabel and TTextView (issues #27 to #29). Shadow nodes and views need React
// Native's C++, Kotlin and Objective-C++ and a device to run, so the parts that need only Core are
// compiled here and the names that JavaScript, C++, Kotlin and Objective-C++ must agree on are pinned.
// What the views do is checked on a device by example/tests/LabelTests.tsx.
const root = join(import.meta.dirname, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const compiler = findCompiler();
const coreHeaders = join(root, "Libraries/TehreerCore/Headers");
const skip = !compiler ? NO_COMPILER : !existsSync(join(coreHeaders, "Tehreer")) ? "the Core submodule is not initialised" : false;
const kotlin = (name: string) => read(`android/src/main/java/com/tehreer/reactnative/${name}.kt`);

test("the files that need only Core compile against its headers", { skip }, async () => {
  const files = [
    "cpp/views/TextLayout.cpp", "cpp/views/Typesetters.cpp", "cpp/views/ReplacementHolder.cpp", "cpp/painter/PaintCallbacks.cpp",
  ];
  for (const file of files) {
    const result = await checkSyntax(compiler as string, join(root, file), [join(root, "cpp"), coreHeaders], { standard: "c++20" });
    assert.ok(result.ok, `${file}: ${result.output}`);
  }
});

test("the component names agree in the specs, C++, Kotlin, Objective-C++ and the configs", () => {
  const manifest = JSON.parse(read("package.json")) as { codegenConfig: { type: string; ios: { components: Record<string, { className: string }> } } };
  // "all" generates components too; with "modules" the specs of the components would be ignored.
  assert.equal(manifest.codegenConfig.type, "all");
  const descriptors = [...read("react-native.config.cjs").matchAll(/"(\w+ComponentDescriptor)"/g)].map((match) => match[1]);

  for (const name of ["TLabel", "TTextView"]) {
    assert.match(read(`src/specs/${name}NativeComponent.ts`), new RegExp(`codegenNativeComponent<NativeProps>\\("${name}", \\{ interfaceOnly: true \\}\\)`));
    assert.match(read("cpp/views/ComponentNames.cpp"), new RegExp(`${name}ComponentName\\[\\] = "${name}"`));
    assert.match(kotlin(`${name}Manager`), new RegExp(`NAME = "${name}"`));
    const className = manifest.codegenConfig.ios.components[name]?.className;
    assert.equal(className, name);
    assert.match(read(`ios/${name}.mm`), new RegExp(`@implementation ${name}\\b`));
    assert.match(read(`ios/${name}.mm`), new RegExp(`Class<RCTComponentViewProtocol> ${name}Cls\\(void\\)`));
    // The CLI finds the descriptor of Android by this name, and autolinking includes TehreerModule.h only.
    assert.match(read("cpp/views/ComponentDescriptors.h"), new RegExp(`using ${name}ComponentDescriptor =`));
    assert.ok(descriptors.includes(`${name}ComponentDescriptor`), `${name} is not listed in react-native.config.cjs`);
  }
  assert.match(read("cpp/TehreerModule.h"), /views\/ComponentDescriptors\.h/);
  assert.match(read("android/CMakeLists.txt"), /cpp\/views\/\*\.cpp/);
  const packaged = kotlin("TehreerPackage");
  assert.match(packaged, /TLabelManager\(\)/);
  assert.match(packaged, /TTextViewManager\(\)/);
});

test("the classes do not carry the library's prefix, as in the other wrappers", () => {
  for (const file of ["TLabel", "TTextView", "TextContainer", "LineView", "ComposedFrame", "ComposedLine", "LineLocator", "Renderer", "Typesetter"]) {
    assert.ok(existsSync(join(root, `android/src/main/java/com/tehreer/reactnative/${file}.kt`)), `${file}.kt`);
  }
  for (const file of ["TLabel", "TTextView", "LineView"]) {
    assert.ok(existsSync(join(root, `ios/${file}.mm`)), `${file}.mm`);
  }
  assert.ok(!/TehreerTextBase|TehreerPaintJni|ViewTextRegistry|ComposedFrameBox|FrameRegistry/.test(read("package.json") + read("android/CMakeLists.txt")));
});

test("every native that Kotlin declares is registered in C++ with the same name and signature kind", () => {
  const bridge = read("android/src/main/cpp/JavaBridge.cpp");
  assert.match(bridge, /Java_com_tehreer_reactnative_JniBridge_nRegister/);
  assert.match(kotlin("JniBridge"), /nRegister\(\)/);
  // A static archive only gives up the members that something refers to; Java finds nRegister by name.
  assert.match(read("android/CMakeLists.txt"), /--undefined=Java_com_tehreer_reactnative_JniBridge_nRegister/);
  assert.match(bridge, /register_com_tehreer_reactnative_Typesetter/);

  for (const name of ["ComposedFrame", "ComposedLine", "LineLocator", "Renderer", "Typesetter"]) {
    const declared = [...kotlin(name).matchAll(/external fun (n\w+)\(/g)].map((match) => match[1] as string);
    assert.ok(declared.length > 0, name);
    const cpp = read(`android/src/main/cpp/${name}.cpp`);
    for (const native of declared) {
      assert.match(cpp, new RegExp(`\\{ "${native}", "`), `${name}.${native} is not registered`);
    }
    // The other way round: nothing is registered that Kotlin does not declare.
    for (const registered of [...cpp.matchAll(/\{ "(n\w+)", "/g)].map((match) => match[1] as string)) {
      assert.ok(declared.includes(registered), `${name}.${registered} is registered but not declared`);
    }
    assert.match(cpp, new RegExp(`register_com_tehreer_reactnative_${name}\\(JNIEnv`));
  }
});

test("every prop of the components reaches the code that reads it", () => {
  for (const name of ["TLabel", "TTextView"]) {
    const spec = read(`src/specs/${name}NativeComponent.ts`);
    const props = [...spec.matchAll(/^ {2}(\w+)\?: (?:CodegenTypes\.|ReadonlyArray)/gm)].map((match) => match[1] as string).filter((p) => !p.startsWith("on"));
    const manager = kotlin(`${name}Manager`);
    const view = read(`ios/${name}.mm`);
    const shadow = read("cpp/views/TextShadowNode.h");
    for (const prop of props) {
      assert.match(manager, new RegExp(`name = "${prop}"`), `${name}.${prop} has no ReactProp in Kotlin`);
      // The shadow node reads the props that lay out; the iOS view reads all of them.
      assert.match(view, new RegExp(`next\\.${prop}\\b`), `${name}.${prop} is not read by the iOS view`);
    }
    assert.match(shadow, /props\.typesetterId/);
    assert.match(shadow, /props\.frameSettings/);
  }
});

test("events agree in the specs, Kotlin and the iOS views", () => {
  for (const name of ["TLabel", "TTextView"]) {
    const manager = kotlin(`${name}Manager`);
    const view = read(`ios/${name}.mm`);
    const events = name === "TLabel" ? ["onFrameReady", "onTextTap"] : ["onFrameReady", "onTextTap", "onTextScroll"];
    for (const event of events) {
      assert.match(read(`src/specs/${name}NativeComponent.ts`), new RegExp(`${event}\\?:`));
      assert.match(manager, new RegExp(`"registrationName" to "${event}"`));
      assert.match(view, new RegExp(`->${event}\\(`));
    }
  }
});

test("the view bindings that TypeScript declares are defined in C++", () => {
  const cpp = read("cpp/runtime/ViewBindings.cpp");
  const ts = read("src/internal/NativeBindings.ts");
  for (const name of ["registerTypesetter", "unregisterTypesetter", "createReplacementHolder"]) {
    assert.match(ts, new RegExp(`\\b${name}\\(`), `${name} is not declared in NativeBindings.ts`);
    assert.match(cpp, new RegExp(`Define\\(runtime, target, "${name}"`), `${name} is not installed`);
  }
  assert.match(read("cpp/runtime/TehreerBindings.cpp"), /InstallViewBindings\(runtime, bindings\)/);
});

test("native holds nothing for the shadow thread but the id table and the holders, each with a why-comment", () => {
  // A mutex or an atomic is only where two threads meet; the files say why.
  for (const file of ["cpp/views/Typesetters.h", "cpp/views/ReplacementHolder.h"]) {
    assert.match(read(file), /mutex/);
  }
  const mutexFiles = ["cpp/views", "cpp/painter", "ios", "android/src/main/cpp"].flatMap((dir) => {
    const names = ["Typesetters.cpp", "ReplacementHolder.cpp", "TextLayout.cpp", "TTextView.mm", "TLabel.mm", "LineView.mm", "PaintCallbacks.cpp"];
    return names.filter((name) => existsSync(join(root, dir, name)) && /std::mutex|std::atomic|NSLock/.test(read(`${dir}/${name}`)));
  });
  assert.deepEqual(mutexFiles.sort(), ["ReplacementHolder.cpp", "Typesetters.cpp"]);
});

test("a text view keeps a view for each line in sight, found with Core's line locator", () => {
  assert.match(read("ios/TTextView.mm"), /TRLineLocatorEnumerateLines\(_locator/);
  assert.match(kotlin("TextContainer"), /locator\.findLines\(/);
  assert.match(kotlin("TextContainer"), /reusable/);
  assert.match(read("ios/TTextView.mm"), /_pool/);
  // The whole text is laid out once for the width, off the main thread, and scrolling does not lay out again.
  assert.match(read("ios/TTextView.mm"), /dispatch_async\(dispatch_get_global_queue/);
  assert.match(kotlin("TTextView"), /TextLayoutTasks\.execute/);
});

test("a view that goes frees what it owns, so nothing is held for React Native's states", () => {
  assert.match(read("ios/TLabel.mm"), /prepareForRecycle[\s\S]*releaseText/);
  assert.match(read("ios/TTextView.mm"), /prepareForRecycle[\s\S]*releaseAll/);
  assert.match(kotlin("TLabelManager"), /onDropViewInstance[\s\S]*view\.release\(\)/);
  assert.match(kotlin("TTextViewManager"), /onDropViewInstance[\s\S]*view\.release\(\)/);
  // No state, so React Native has none to keep.
  assert.ok(!/StateData|getStateData|setStateData/.test(read("cpp/views/TextShadowNode.h")));
});

test("the Android views clip what they draw to their bounds", () => {
  assert.match(kotlin("TLabel"), /clipRect\(0, 0, width, height\)/);
  assert.match(kotlin("TTextView"), /clipRect\(scrollX, scrollY, scrollX \+ width, scrollY \+ height\)/);
});
