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

Supported ABIs: `armeabi-v7a`, `arm64-v8a`, `x86` and `x86_64`. The minimum SDK is 24 and the NDK is 28.2.13676358 (the version the example app pins in `example/android/build.gradle`; it is the only NDK that is tested). The module is built with CMake as part of the app's native project, together with Core and its dependencies, and needs `scripts/fetch-deps` to have run first.

The ABIs are not chosen by this library: the app picks them with the `reactNativeArchitectures` property, in `gradle.properties` or on the command line, and React Native builds only those.

```bash
./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a,x86_64
```

The wrapper sources are compiled with `-Wall -Wextra` and must stay free of warnings; `android/CMakeLists.txt` picks up new files in `cpp/`, `cpp/runtime/` and `cpp/generated/` by itself.

`npm run test:android` builds the example app for the connected emulator, starts Metro, launches the app and runs every suite registered in `example/tests/index.ts` (output format in [AGENTS.md](AGENTS.md#device-test-output)). It exits non-zero on a failing test, a timeout or a missing result line.

## iOS

Supported architectures: `arm64` for devices and `arm64` and `x86_64` for the simulator. The deployment target is the one React Native 0.88 supports (iOS 15.1). Core and its dependencies are compiled from source into the pod by `tehreer-react-native.podspec`, together with the wrapper sources in `cpp/` (all subfolders) and `ios/`: the C files are compiled as C (Core as C89, FreeType, SheenBidi and libunibreak as gnu99), `harfbuzz.cc` and the wrapper as C++20. New files in `cpp/` and `ios/` are picked up by the next `pod install`.

```bash
npm run setup                                  # fetches the dependency sources, once
cd example/ios && LANG=en_US.UTF-8 pod install  # CocoaPods needs a UTF-8 locale
xcodebuild -workspace TehreerExample.xcworkspace -scheme TehreerExample -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' ARCHS="arm64 x86_64" ONLY_ACTIVE_ARCH=NO build
```

Use `-sdk iphoneos -destination 'generic/platform=iOS' ARCHS=arm64` for a device build. The wrapper sources must stay free of compiler warnings; warnings from Core and the dependencies are reported by Xcode too and are not fixed here.

`npm run test:ios` builds the example app for the booted simulator, starts Metro, launches the app and runs every suite registered in `example/tests/index.ts` and prints a per-suite summary and the names of failing tests. It exits non-zero on a failing test, a timeout or a missing result line.

## Continuous integration

Workflows live in `.github/workflows/`:

| File | Runs | Triggers | What it does |
|------|------|----------|--------------|
| `ci.yml` (job `checks`) | ubuntu, 15 min limit | every pull request, every push to `main` | `npm ci`, typecheck, lint, `npm run generate:check`, `npm test` with the spec reporter (every test name and its failure details appear in the log) |
| `device-tests.yml` (jobs `ios`, `android`) | macOS and ubuntu with KVM, 60 min limit | only the triggers below | fetches the Core dependencies (`scripts/fetch-deps`), then `npm run test:ios` on a booted simulator and `npm run test:android` on an API 34 x86_64 emulator (`reactivecircus/android-emulator-runner`) |
| `claude-review.yml` | ubuntu | pull requests | automated review; the only workflow with a secret |

Every checkout uses `submodules: recursive`, because the generator and the tests read Core's headers. None of `ci.yml` and `device-tests.yml` uses a secret, and both only request `contents: read`. A new push to a pull request cancels the older `checks` run.

**Why the device tests are separate.** The repository is private, so macOS minutes are billed at ten times the Linux rate, and an emulator on a Linux runner needs several minutes to boot and build. Running them on every push would cost more than they are worth during development. They start only

- by hand: Actions tab, "Device tests", "Run workflow", then pick `all`, `ios` or `android`;
- when the label `device-tests` is added to a pull request (`gh pr edit <number> --add-label device-tests`);
- on every later push to a pull request that carries the label. Remove the label to stop them.

Pull requests from forks never start the device jobs. Run the same tests locally with `npm run test:ios` and `npm run test:android` (see the platform sections above).

**Not verified yet.** A workflow cannot run before it is pushed, and a `pull_request` workflow runs from the version on the pull request branch. At the time of writing neither workflow has run: the YAML parses and `tests/workflows.test.ts` checks its structure, but the first runs on GitHub may still reveal problems (the pinned `android-emulator-runner` version, the emulator image, runner disk space, the simulator boot step). Fix those in the first pull request that triggers them.

## Repository layout

See [AGENTS.md](AGENTS.md) for the layout, conventions and contribution workflow, and `.claude/skills/react-native-wrapper/SKILL.md` for the design rules.

## License

Apache 2.0, see [LICENSE](LICENSE) and [NOTICE](NOTICE).
