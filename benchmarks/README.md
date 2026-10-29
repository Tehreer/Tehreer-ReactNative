# Benchmarks against the Android and Cocoa wrappers

Measures layout time, draw time and memory for one fixed set of scenarios on three wrappers of the
same job: this one (React Native), Tehreer-Android and Tehreer-Cocoa. Results and their caveats are in
[RESULTS.md](RESULTS.md). React Native is compared with Tehreer-Android on the Android emulator and
with Tehreer-Cocoa on the iOS simulator; React Native is measured on both.

## Files

| Path | Role |
|------|------|
| `scenarios.json` | The one definition all runners read: fonts (files of Core's `Tests/Fonts`), texts, sizes, widths, warm-up and iteration counts. |
| `run.mjs` | Builds the runners, runs them on the booted simulator and emulator, writes `results.json` and `RESULTS.md`. |
| `lib/` | Scenario validation, BENCH log parsing, statistics, comparison and report text (tested in `tests/benchmarks.test.ts`). |
| `android/` | Gradle project of the Tehreer-Android runner (`BenchActivity.java`). |
| `cocoa/` | Swift package of the Tehreer-Cocoa runner (`Sources/bench/main.swift`), a command line program for the simulator. |
| `../example/index.benchmark.js`, `../example/benchmark/` | The React Native runner. Not in `example/tests/index.ts`, so `npm run test:ios` and `test:android` never run it. |
| `../cpp/painter/BenchmarkHooks.cpp` | Two native functions (`benchDrawFrame`, `benchMemory`), compiled only with `TEHREER_BENCHMARKS`. |

## Run it

Prerequisites are those of `npm run test:ios` / `test:android` (submodule, `scripts/fetch-deps`,
`npm install` in the root and in `example/`, a booted simulator, a running emulator, `ANDROID_HOME`),
plus the two sibling checkouts (`TEHREER_ANDROID`, `TEHREER_COCOA`; defaults are the paths in `run.mjs`).
Everything builds offline from what is already on the machine.

```bash
node benchmarks/run.mjs --scratch /tmp/tehreer-bench          # everything, 3 launches per runner
node benchmarks/run.mjs --platform ios --wrapper native --runs 5
node benchmarks/run.mjs --skip-build                          # reuse the builds in --scratch
```

Nothing is written to the sibling repositories: Tehreer-Android's sources are copied into the scratch
directory, Tehreer-Cocoa is a local Swift package dependency of a package in the scratch directory.
Build outputs are large (several GB): delete the scratch directory when done. The runner signals only
the process groups it started.

How the React Native runner is built: the Xcode bundle step reads `ENTRY_FILE=index.benchmark.js` and
the build passes `GCC_PREPROCESSOR_DEFINITIONS='$(inherited) TEHREER_BENCHMARKS=1'`; Gradle gets
`-PtehreerBenchmarks` (entry file and `-DTEHREER_BENCHMARKS=ON`). Both are Release configurations
(optimized native code, Hermes bytecode); the debug-only `test*` hooks do not exist there, which is why
the draw timer is a hook of its own.

## What is measured

Same steps in the three runners (`example/benchmark/runBenchmark.ts`, `android/.../BenchActivity.java`,
`cocoa/Sources/bench/main.swift`); one unit is one pixel (render scale 1).

- **layoutMs**: from a prepared styled text (RN `TMutableText`, Android `SpannableString`, Cocoa
  `NSAttributedString`, made outside the timer) to a frame: typesetter creation, frame resolver, and
  `createFrame` over the whole text with `fitsVertically` (frame as high as its lines). Objects are
  released outside the timer. Warm-up iterations first, then the timed ones; the number is the median.
- **drawMs**: one draw of that frame onto an offscreen canvas of the platform (RN: the native painter of
  the views over an `android.graphics.Canvas` / UIKit `CGContext`; Android: `ComposedFrame.draw` on a
  `Bitmap` canvas; Cocoa: `ComposedFrame.draw` on a `CGBitmapContext`), canvas created once, white,
  not cleared between draws. Only the draw call is timed, so the canvas and any read back are not in it.
  Warm-up draws fill the glyph caches, so the number is warm steady state.
- **memLayoutKB**: native heap in use (Apple: `malloc_zone_statistics` of all zones; Android:
  `mallinfo`, which is `Debug.getNativeHeapAllocatedSize`) with a typesetter and a frame alive, minus
  the value before the styled text was made. Median of three, each after releasing the previous one.
  The JavaScript heap (Hermes) and the Java heap are not in it.
- **lines / frameHeight** are reported as a sanity check: differing line counts between wrappers mean the
  layouts differ and the timings are not comparable for that scenario.

Each runner logs `BENCH_META`, one `BENCH_RESULT` per scenario (summaries: n, min, median, p90, max) and
`BENCH_DONE` (or `BENCH_ERROR`), format in `lib/Results.mjs`. `run.mjs` launches each runner several
times and reports the median of the launches' medians with the range of the launches.

## Fonts and texts

Core's test fonts are subsets: `Roboto-Regular.abc.ttf` has the glyphs `a`, `b`, `c` only (no space; a
space draws `.notdef`), so Latin scenarios use words made of `abc`. `NotoNastaliqUrdu-Regular.ttf` is the
full Urdu font. The example app serves byte-identical copies of the two fonts (`example/assets/fonts`;
a test compares them with Core's files); Android copies Core's files into the runner's assets and Cocoa
reads them from Core's directory.
