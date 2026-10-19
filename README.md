# Tehreer-ReactNative

React Native wrapper of [Tehreer Core](https://github.com/Tehreer/Tehreer-Core), a lightweight, dependency-free text engine written in C89. It exposes the public Core API to React Native through one C++ JSI layer shared by iOS and Android, with a TypeScript API shaped like Tehreer-Web, Tehreer-Android and Tehreer-Cocoa.

This package is at the skeleton stage: the native layer and the public API land in later issues.

## Constraints

- New architecture only: Fabric, C++ TurboModule, Hermes. No old bridge.
- No Skia.
- No WebAssembly.
- Core owns all text logic; the wrapper is a thin bridge and never re-implements layout, shaping or matching.
- No runtime dependency. `react` and `react-native` are peer dependencies.

## Development

Requires Node 22.18 or newer (tests run TypeScript directly) and npm.

```bash
npm install
npm run typecheck   # strict tsc over src and tests
npm run lint        # ESLint (flat config)
npm test            # node:test suites in tests/
npm run build       # emit dist/ (JavaScript and declarations) from src/
```

`.npmrc` sets `legacy-peer-deps` so that npm does not install `react` and `react-native` for this skeleton; revisit it when the example app lands.

## Core and its dependencies

Tehreer Core is the git submodule `Libraries/TehreerCore`, pinned to a SHA. After `git clone --recurse-submodules` (or on a clone without submodules), one command gets Core and the sources of FreeType, HarfBuzz, SheenBidi and libunibreak:

```bash
scripts/fetch-deps   # or: npm run setup
```

The dependency versions are read from Core's `CMakeLists.txt` at run time, so they always match what Core pins. Sources land in the git-ignored `Libraries/Dependencies`, laid out for Core's `TR_DEPS_DIR`. Re-running is a no-op unless a pin changed.

To move Core to another commit (this fetches, checks out and stages the pointer):

```bash
scripts/sync-core <sha|ref>
scripts/sync-core main /Users/mta/Learning/Tehreer-Core   # fetch from a local Core instead of origin
```

## Android

Supported ABIs: `armeabi-v7a`, `arm64-v8a`, `x86` and `x86_64`. The minimum SDK is 24 and the NDK is 28.2.13676358 (the version the example app pins in `example/android/build.gradle`). The module is built with CMake as part of the app's native project, together with Core and its dependencies, and needs `scripts/fetch-deps` to have run first.

The ABIs are not chosen by this library: the app picks them with the `reactNativeArchitectures` property, in `gradle.properties` or on the command line, and React Native builds only those.

```bash
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a,x86_64
```

The wrapper sources are compiled with `-Wall -Wextra` and must stay free of warnings; `android/CMakeLists.txt` picks up new files in `cpp/`, `cpp/runtime/` and `cpp/generated/` by itself.

Device tests (`npm run test:ios`, `npm run test:android`) are added together with the example app.

## Repository layout

See [AGENTS.md](AGENTS.md) for the layout, conventions and contribution workflow, and `.claude/skills/react-native-wrapper/SKILL.md` for the design rules.

## License

Apache 2.0, see [LICENSE](LICENSE) and [NOTICE](NOTICE).
