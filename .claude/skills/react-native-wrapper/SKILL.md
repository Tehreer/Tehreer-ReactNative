---
name: react-native-wrapper
description: Rules, conventions and workflow for wrapping Tehreer Core in Tehreer-ReactNative (C++ JSI + TypeScript for React Native, new architecture only, no Skia). Use when the Core API changes and the React Native wrapper has to follow, when adding a TypeScript class, struct layout or JSI binding for a Core object, when adding a native drawing view, when moving logic from the wrapper into Core, or when verifying the wrapper against Web, Android and Cocoa.
---

# Wrap Tehreer Core in Tehreer-ReactNative

The repo is `/Users/mta/Learning/Tehreer-ReactNative` (GitHub `Tehreer/Tehreer-ReactNative`, npm package `tehreer-react-native`, TypeScript, strict). It exposes every public header of Core to React Native through one **C++ JSI layer shared by iOS and Android** and a TypeScript API shaped like Tehreer-Web, Tehreer-Android and Tehreer-Cocoa. Text is drawn by thin native views (Android `Canvas`, iOS `CGContext`); there is no Skia and no WebAssembly. Core is a git submodule at `Libraries/TehreerCore` and is built as the unity build (`Source/Tehreer.c`).

The first spike (issue #3) verified the TurboModule registration, the Core build on both platforms and the version call on the iOS simulator and an Android emulator; those statements below are stated as facts. Where this skill still says **(spike)**, the statement is the intended design, not a verified fact; update the skill when the issue that builds it settles it.

## 1. Principles

1. **Core owns the logic.** Layout, shaping, matching, drawing math, run backgrounds and decorations, cluster and caret math, typeface registry and style matching live in Core. The wrapper never re-implements them. If React Native needs a rule Core lacks, add it to Core (with tests there), then bridge it.
2. **The bridge is thin.** A binding converts arguments, calls one `TR*` function, converts the result. No algorithms, no mirrored state, except what section 6 allows.
3. **TypeScript keeps React Native and web-style terminology, mirroring the Web wrapper.** `Rect {x, y, width, height}`, `Color` as `0xAARRGGBB`, `fromIndex`/`toIndex`, `typeSize`, `strokeRadius`. Core words are mirrored when they say something new. Defaults are Core's. Where Web, Android and Cocoa already agree on a name, use it.
4. **API compatibility is not sacred.** Break the API when that lets the wrapper follow Core more directly; say so in the summary.
5. **Native-only concerns stay in the wrapper:** painting draw callbacks (Android `Canvas`, iOS `CGContext`), Fabric views and measurement, font loading from files and assets, finalizers.
6. **No dependency without asking.** The library has no runtime npm dependency beyond `react` and `react-native` as peers. Dev dependencies are kept minimal. Ask before adding a package, a CocoaPod, a Gradle dependency, or downloading anything.
7. **New architecture only.** Fabric and C++ TurboModules, Hermes. No old bridge, no `NativeModules`.
8. **No Skia.** Not as a dependency, not as an optional one.

## 2. Layout

```
Libraries/TehreerCore/   git submodule of Tehreer-Core (pinned SHA)
cpp/
  generated/             JSI glue generated from Core headers (git-ignored or checked in: decided by the generator issue)
  runtime/               HostObject handles, Struct marshalling, Callbacks, ArrayBuffer helpers
  TehreerModule.*        the Cxx TurboModule that installs the bindings
tehreer-react-native.podspec   at the package root (see section 3)
react-native.config.cjs  autolinking entries of the C++ module for Android
ios/                     TehreerModuleProvider (Objective-C++), CGContext painter, Fabric view
android/                 CMakeLists.txt, build.gradle, TehreerPackage.kt, Canvas painter via JNI, Fabric view
scripts/                 generate-bindings.mjs, fetch-deps, sync-core, generate-unicode-enums.mjs
src/
  index.ts               the public surface
  initialize.ts          initialize(), getVersion()
  specs/                 NativeTehreer.ts, the codegen spec (install() only)
  Color.ts, geometry.ts
  collections/  graphics/  layout/  sfnt/  unicode/  drawing/   (same folders and class names as Tehreer-Web)
  views/                 TLabel, TTextView
  internal/              NativeBindings.ts, NativeFunctions.ts (generated), NativeObject, Struct, Callbacks
example/                 test-runner app used by tests and QA
tests/                   node tests (generator); device tests live in example/
```

One class per file, file named after the class (PascalCase). Everything under `internal/`, `cpp/generated/` and `NativeFunctions.ts` is never public API.

## 3. Bindings

- **Generated.** `scripts/generate-bindings.mjs` (adapted from Tehreer-Web) parses `Libraries/TehreerCore/Headers/Tehreer/*.h` and, for each public function, writes a C++ JSI binding and a typed declaration in `NativeFunctions.ts` with the C signature in a comment. It also reads the classic SheenBidi headers for the `unicode` package. Declared-but-undefined functions go in an `EXCLUDED` set (`TRVersionGetString`, `TRTextGetSheenBidiText`, as in Web). The generator has node tests; a header change that the generator cannot express fails loudly instead of being skipped.
- **Installation (verified).** One C++ TurboModule (`NativeTehreer`, class `facebook::react::TehreerModule`, `cpp/TehreerModule.*`) installs a single host object, `global.__tehreer` (defined with `Object.defineProperty` through JSI: read-only, non-configurable, non-enumerable), holding all bindings, once, from `initialize()`. The module has one codegen method, `install(): boolean`, which receives the `jsi::Runtime&`; everything else is called on the host object. Calls are synchronous JSI calls; nothing is serialized and nothing crosses the old bridge. `cpp/runtime/TehreerBindings.cpp` is the host object (a hand-written `getVersion` and `smokeTest` for now; the generator will fill it).
- **How a library registers a C++ TurboModule (verified on RN 0.88.0).**
  - `package.json` `codegenConfig`: `name` (here `TehreerSpec`, which names the generated `TehreerSpecJSI.h`), `type: "modules"`, `jsSrcsDir: "src/specs"`, `android.javaPackageName`, and `ios.modules.<ModuleName>.className`. There is no `cxxModule*` key in `codegenConfig`: the Android keys live in `react-native.config.cjs`. The spec file must be named `Native*.ts` and must `export default TurboModuleRegistry.get<Spec>("Name")` (the one allowed default export; the lint rule is disabled on that line). `get`, not `getEnforcing`, so importing the library never throws when the module is not linked; `initialize()` throws instead. Codegen produces `Native<Name>CxxSpec<T>`; the module derives from it with CRTP.
  - **iOS:** `ios.modules` maps the module name to an Objective-C++ class (`TehreerModuleProvider`) that conforms to `RCTModuleProvider` and returns `std::make_shared<TehreerModule>(params.jsInvoker)` from `getTurboModule:`. Codegen writes it into `RCTModuleProviders.mm` in the app's `ReactAppDependencyProvider`; no AppDelegate change.
  - **Android:** `react-native.config.cjs` (CommonJS, because `package.json` is `"type": "module"`) sets `dependency.platforms.android.cxxModuleCMakeListsPath` (relative to `android/`), `cxxModuleCMakeListsModuleName` (the CMake target) and `cxxModuleHeaderName` (the header **and** class name: the generated `autolinking.cpp` does `#include <TehreerModule.h>` and `std::make_shared<TehreerModule>(jsInvoker)` inside `facebook::react`, so the class must live in that namespace and have a static `kModuleName`). The app's CMake project adds `android/CMakeLists.txt` as a subdirectory and links the target into `libappmodules.so` with the plain `target_link_libraries` signature (mixing in the keyword signature fails). The CLI drops an Android library that has an `android/` folder with `build.gradle` or a manifest but no `ReactPackage` class, so `android/` has a `TehreerPackage` (it registers no module) and a `build.gradle` that applies `com.facebook.react` for the codegen; without those files the library would be a "pure C++ dependency" instead.
- **Core in each platform (verified).** Android: `android/CMakeLists.txt` does `add_subdirectory(Libraries/TehreerCore)` with `TR_DEPS_DIR=Libraries/Dependencies` (so nothing is fetched by Gradle) and `TR_CONFIG_UNITY=ON`, after switching off FreeType's optional zlib, bzip2, png and harfbuzz lookups. iOS: `tehreer-react-native.podspec` compiles `Tehreer.c` plus FreeType, libunibreak, SheenBidi (unity) and `harfbuzz.cc` from `Libraries/Dependencies` directly into the pod, with the file lists of tehreerCocoa's `Package.swift`; see section 12 for the pitfalls. The podspec lives at the package root because CLI autolinking only globs `*.podspec` there and CocoaPods rejects `source_files` outside the pod root. `scripts/fetch-deps` must run before `pod install` and before the Gradle build (the podspec fails with a message if it did not).
- **Example app resolution.** `example/` depends on `file:..` and Metro runs the library from `src/`: `example/metro.config.js` watches the root, blocks the root `node_modules` (a second React Native breaks the app), maps `tehreer-react-native` to `src/index.ts` and maps the `.js` suffix of relative imports in `src/` to `.ts` (Metro does not do that itself).
- **Off-device JSI tests (tried once, not reproducible from the repo).** A throwaway program linked `cpp/runtime/TehreerBindings.cpp`, Core and its dependencies against the macOS slice of `hermesvm.framework` (from the hermes-engine pod, with `destroot/include`), created a Hermes runtime and printed `1.0.0 true` for `__tehreer.getVersion()` and `smokeTest()`. The harness is not in the repo, so treat the approach as promising, not as a test; the node tests only pin names that C++, TypeScript and the configs share (`tests/native-module.test.ts`).
- **(spike) Open: the packed npm library cannot build.** `Libraries/Dependencies` (FreeType, HarfBuzz, libunibreak, SheenBidi) is fetched by `scripts/fetch-deps` and is not in `files`, and nothing downloads it for a consumer, so a package installed from npm lacks the sources that both the podspec and `android/CMakeLists.txt` compile. Only the repo checkout (and the example app) builds today. A follow-up issue decides how consumers get them; no download is added to the build meanwhile.
- **iOS builds (verified for #5).** The pod builds the example app without errors for `generic/platform=iOS` (arm64), `generic/platform=iOS Simulator` with `ARCHS=arm64`, `ARCHS=x86_64` and `ARCHS="arm64 x86_64"` (a fat `libtehreer-react-native.a`); the x86_64 harfbuzz failure of the spike did not reproduce. The xcodebuild log shows `-x c` with `-std=c89` for Core, `-std=gnu99` for FreeType, SheenBidi and libunibreak, and `-x c++` with no per-file `-std` for `harfbuzz.cc` and the wrapper (C++20 comes from `CLANG_CXX_LANGUAGE_STANDARD`); the wrapper sources (`cpp/`, `ios/`) produce no warnings, Core and the dependencies do. `use_frameworks! :linkage => :dynamic` needs the third-party headers as `project_header_files` (otherwise the framework copies Core's and SheenBidi's same-named headers and fails with "Multiple commands produce"), and then compiles, but the framework link fails until the marshalling functions that the generated bindings declare (`FromHandle`, `FromNumber`, `ToStringView` and others, runtime issue #7) are defined.
- **Not verified:** release builds, reload and Fast Refresh, `use_frameworks!` linking (see above), the contents of the packed npm package, and Android API levels other than 28 (the Medium_Phone_R emulator did not fit on disk).
- **Hermes.** Use only JSI APIs that Hermes supports. No `eval`, no reliance on a WebAssembly runtime.
- **ABI.** The binding calls Core's C functions natively, so structs by value and returned structs follow the platform C ABI (no WASM `ret` pointer tricks). Floats are `float`; JS numbers are doubles; convert at the binding.

## 4. Handles, lifetimes, ownership

- A wrapper extends `NativeObject` and owns **one** Core reference. The JSI side keeps the `TR*Ref` in a `HostObject`; the finalizer releases the reference if `dispose()` was never called. Nothing may depend on the finalizer running. `dispose()` is idempotent; `nativeHandle` throws "already disposed" afterwards. `equals(other)` compares handles.
- **Follow Core's ownership rule.** `Create`/`Copy` returns an owned reference: wrap it with `adopting`. `Get` is not retained: wrap it with `retaining`, which calls `TR*Retain` first. A child therefore never depends on its parent staying alive. The exception is data behind a pointer (section 5), which belongs to its owner and is only valid while the owner lives; the wrapper keeps the owner alive.
- **Internal constructors** use the `adopt` token overload, marked `/** @internal */`. Public constructors create the Core object and throw if creation fails.
- When Core takes an object (typeface, replacement, font features, glyph cache, typesetter) it retains it. A temporary made only for the call is disposed after it. `LineLocator` is the exception: Core does not retain the frame, so the wrapper keeps the frame and the renderer.
- Core objects are immutable and thread safe after creation; `Renderer`, `ShapingEngine`, `FrameResolver` and `TMutableText` are mutable configuration objects. Hermes runs JS on one thread, but views may draw on another: never change a mutable object while something is drawing or shaping with it.
- **Callbacks.** Function pointers handed to Core are static C++ trampolines created once. `userData` is a key into a handler table, never a pointer to a JS value. An exception thrown in a JS handler cannot cross Core's frames: the trampoline records the first error, sets `stop` where Core offers it, and the binding rethrows the error when the Core call returns. Callbacks that only collect (enumerations) return arrays. A callback must not call back into JS after the JS runtime is torn down: the handler table is cleared on teardown.

## 5. Memory: structs, views and lists

- **Structs** that are read or written are described once in the C++ runtime with the C struct's name, and each description is checked at compile time against the real layout with `static_assert(sizeof(...))` and `offsetof`. The TypeScript side has no struct offsets: the binding returns objects or typed arrays. Add a struct description, never read an offset by hand in the generated glue.
- **Lists.** Collections of Core (glyph ids, advances, offsets, cluster map, runs, lines, typefaces) are read-only `List<T>` objects as in Tehreer-Web (`length`, `get`, `at`, `slice`, iteration, `toArray`). Numeric lists are backed by an `ArrayBuffer` that points at Core memory **(spike: external `ArrayBuffer` with a finalizer that releases the owner)** and expose `toTypedArray()`. They read Core memory when an element is asked for, keep their owner alive, and fail with "already disposed" once it is disposed. `IndexedList` makes objects from an index.
- Never convert Core data into arrays or objects in a constructor or cache it in a field: read when the property is asked for.

## 6. State the wrapper may keep

Only what Core cannot give back or must not be re-made on each read: the `Typeface` and the `OpenTypeFeature[]` set on a `ShapingEngine`, the frame and renderer a `LineLocator` was made with, the handlers in the callback table, and the platform image cache of a glyph image. Everything else is asked from Core each time.

## 7. Mapping rules (Core to TypeScript)

Same as the Web wrapper (`web-wrapper` skill, section 7) except where React Native differs:

| Core | Wrapper |
|------|---------|
| `index` + `length` parameters (never `TRRange`) | `fromIndex`/`toIndex`; the wrapper passes `index` and `toIndex - fromIndex`; order is validated in TypeScript, the upper bound is Core's |
| `TRInvalidIndex` / `NULL` | `-1` for an index, `undefined` for an optional object, `RangeError` for an invalid range, `Error` for a failed creation |
| `TRStringView` and text | UTF-16 (`TRStringEncodingUTF16`); indices are JS string indices |
| `TRColor` | `Color` = unsigned `0xAARRGGBB` number |
| `TRPath` | `Path` (verbs + coordinates) created from a native path; `toSvgPathData()` |
| `TRTag` | `SfntTag` = number, `SfntTag.make('head')` |
| Fonts | `FontFile.fromPath()`/`fromAsset()`/`fromBytes()`; no network fetch in the library |

Naming: classes PascalCase, members camelCase, no `I` prefix, no default exports, `T` prefix where Android and Cocoa have it (`TText`, `TMutableText`, `TLabel`, `TTextView`). Booleans read as `is…`/`has…`.

## 8. Text attributes

`TText` and `TMutableText` wrap `TRText`/`TRMutableText` with UTF-16. Attributes are one typed object, `TextAttributes = RunAttributes & ParagraphAttributes`, written by `TextAttributeCodec` with one `TRAttribute` per member. To support a new Core attribute: add it to the codec table with its kind, to `RunAttributes` or `ParagraphAttributes`, and a test that stores and reads it back. `userData` is a number (an application token). `Replacement` takes a `ReplacementDelegate { computeRoom(layoutWidth), draw?(context, bounds) }`.

## 9. Drawing and views

Core draws; the wrapper provides primitives.

- **Draw callbacks.** `GlyphRun.draw`, `ComposedLine.draw`, `ComposedFrame.draw` call `TRGlyphRunDraw`, `TRComposedLineDraw`, `TRComposedFrameDraw` with `TRDrawCallbacks` implemented **natively** by the platform painter (Android `Canvas`, iOS `CGContext`). Drawing never round-trips glyph by glyph through JS in the view path. A JS-visible drawing surface (`DrawingContext` with the same callbacks) exists for custom rendering and tests, and is the slower path.
- **Origins and scale** follow Core (run: start on its baseline; line: origin of its container; frame: top left). Core multiplies positions by `renderScale`; the platform transform applies after.
- **Fabric views.** `TLabel` and `TTextView` are Fabric components. Measurement runs in a C++ shadow node that calls Core synchronously from Yoga's measure function, so sizing never goes through JS. The native view paints the composed frame it is given. **(spike for the shadow node and state handoff)**
- **Glyph images.** Alpha images are tinted per color, ARGB images are unpremultiplied (iOS) or drawn with the right alpha mode (Android); cache the platform bitmap on the glyph image through `TRGlyphImageSetNativeData` and destroy it in the destroy callback.

## 10. Updating the wrapper after a Core change

1. **Identify the change.** `git diff <old>..<new> -- Headers/Tehreer` in the submodule. Read the Doxygen of every changed function: ownership, range semantics, out parameters, `stop`.
2. **Bump the submodule** with `scripts/sync-core` (fetch the SHA, check it out, stage the pointer). Unpushed Core commits are fetched with `git fetch /Users/mta/Learning/Tehreer-Core main` inside the submodule.
3. **Regenerate** bindings (`node scripts/generate-bindings.mjs`). A removed or renamed function shows as a type error in TypeScript and a compile error in C++; a new one as a new member of `NativeFunctions`.
4. **Fix call sites,** then structs (`static_assert`s fail until the C++ description agrees with the header).
5. **Adopt, don't just port.** Delete wrapper logic that Core now owns. Add members for new capabilities with the names of section 7 and a test. Keep Web, Android and Cocoa in step.
6. **Test** (section 11), update `README.md` if a convention or limitation changed.
7. **Commit** only when asked: tag `[lib]`, `[test]`, `[native]`, `[ios]`, `[android]`, `[ci]` or `[docs]`, imperative summary; stage files explicitly.

## 11. Testing

`typecheck`, `lint`, `test`, `test:ios` and `test:android` exist (the last two run `scripts/test-device.mjs`, which builds the example app on the booted simulator or emulator, starts Metro, launches the app and checks the `TEHREER_RESULT` line that `example/App.tsx` logs; the full suites come with the example-app issue). The intended set is:

```bash
npm run typecheck          # tsc for library and tests
npm run lint
npm test                   # generator and pure-TypeScript tests (node:test)
npm run test:ios           # builds the example app, runs the device test suite in the iOS simulator
npm run test:android       # same on the Android emulator
```

- Fixtures are Core's fonts (`Libraries/TehreerCore/Tests/Fonts`).
- Device tests run inside the example app, one suite per package, with a results reporter that the scripts parse. They cover: handle release (including the finalizer path), callbacks and errors thrown from handlers, struct layouts, lists after owner disposal, memory growth, and drawing through a recording painter.
- Views are checked by a screenshot of the example app in the simulator and the emulator, looked at, not only compared.
- Do not weaken or delete a test to get green; report suspected conflicts.

## 12. Gotchas

- Do not hold a raw pointer from Core (a buffer from a `*Ptr()` getter) across a call that can free its owner; keep the owner alive with the list or view that exposes it.
- A float that Core returns arrives as a double of a 32-bit float; compare with a tolerance in tests.
- Unsigned results (`TRColor`, `TRTag`) must be converted with `>>> 0` when they pass through a signed 32-bit value.
- `TRVersionGetString` is declared but never implemented; use the `TEHREER_VERSION_STRING` macro.
- SFNT tags may contain a space (`URD `).
- Core objects freed from a finalizer may run on a non-JS thread: finalizers only call `TR*Release` (thread safe) and never touch JS.
- iOS pod: Core and SheenBidi both have a `Source/Core/` with headers of the same names, so each needs its own Source folder as a per-subspec `-I` flag, never in the shared `HEADER_SEARCH_PATHS`. Core ships `Headers/Tehreer/module.modulemap`; with clang modules on, SheenBidi's names become ambiguous, so the pod sets `CLANG_ENABLE_MODULES = NO`. C files need a per-subspec `-std` (Core `c89`, dependencies `gnu99`; verified in the build log), and `harfbuzz.cc` must be in a subspec with no `-std` flag (clang rejects it for C++). `pod install` needs `LANG=en_US.UTF-8`.
- Android: the NDK has no libbz2, so FreeType's optional libraries are disabled; `ndkVersion` in `example/android/build.gradle` must name an installed NDK (the template's 27.1 is not).
- Android: C++ standard library and `-fvisibility` settings must match Core's unity build; iOS: Core is compiled as C89 inside an Objective-C++ target, so compile the C files with the C language setting, not as C++.
- Do not change the typeface of a renderer, the settings of a shaping engine, or a mutable text while something is drawing or shaping with it.
