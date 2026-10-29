// The text of benchmarks/RESULTS.md, made from the aggregated runs of benchmarks/run.mjs.
import { compare, digitsFor, formatComparisonTable, formatWrapperTable, number } from "./Results.mjs";

const PAIRS = [
  { platform: "ios", title: "iOS: React Native against Tehreer-Cocoa", rn: "react-native/ios", native: "tehreer-cocoa/ios", nativeName: "Tehreer-Cocoa" },
  { platform: "android", title: "Android: React Native against Tehreer-Android", rn: "react-native/android", native: "tehreer-android/android", nativeName: "Tehreer-Android" },
];

function deviceLines(environment) {
  const lines = [
    `- Date: ${environment.date.slice(0, 10)}`,
    `- Host: ${environment.host.cpu}, macOS ${environment.host.macOS}`,
    `- Tehreer Core: version ${environment.coreVersion}, submodule commit ${environment.coreCommit}; base commit ${environment.wrapperCommit}, measured on that tree plus the benchmark harness of PR #62 (head of branch task/34-benchmarks)`,
    `- Compared wrappers: ${Object.entries(environment.siblingCommits ?? {}).map(([name, commit]) => `${name} ${commit}`).join(", ")}`,
    `- Command: \`node benchmarks/run.mjs\` with \`--runs ${environment.runs}\`: one discarded warm-up launch plus ${environment.runs} counted launches per runner (README.md lists the default of 3; the committed results used 5)`,
    `- Launches per runner: ${environment.runs} (numbers are the median of the launches' medians; the range of the launches is in brackets)`,
  ];
  if (environment.ios) lines.push(`- iOS: simulator ${environment.ios.name}, ${environment.ios.os}`);
  if (environment.android) {
    const { model, avd, release, api, abi } = environment.android;
    lines.push(`- Android: emulator ${avd || "unnamed AVD"} (${model}), Android ${release} (API ${api}), ${abi}`);
  }
  return lines;
}

function buildLines(metas) {
  const rows = ["| Runner | Build |", "|---|---|"];
  for (const [key, meta] of Object.entries(metas)) {
    if (!meta) continue;
    rows.push(`| ${key} | ${meta.build}${meta.engine ? `, JS engine ${meta.engine}` : ""}; ${meta.coreVersion} |`);
  }
  return rows.join("\n");
}

function scenarioTable(definition) {
  const rows = ["| Scenario | Characters | Type size | Width | Layout (warm-up + timed) | Draw (warm-up + timed) |", "|---|---:|---:|---:|---:|---:|"];
  for (const scenario of definition.scenarios) {
    rows.push(`| ${scenario.id} | ${scenario.characters} | ${scenario.typeSize} | ${scenario.width} | ${scenario.layout.warmup} + ${scenario.layout.iterations} | ${scenario.draw.warmup} + ${scenario.draw.iterations} |`);
  }
  return rows.join("\n");
}

const METHOD = `## Method

Every runner executes the steps of [README.md](README.md) on the same scenarios, in Release builds
(optimized native code; React Native: Hermes bytecode). Layout is timed from a prepared styled text to a
frame; draw is the draw call of the frame onto an offscreen canvas with the wrapper's own painter (warm glyph
caches); memory is the native heap in use with a frame alive (typesetter and resolver released, as in the
native runners). Each runner is launched several times; a table cell is the median of the launches' medians with the lowest and highest launch in
brackets. "RN / native" is flagged only when it is above 1.20, both sides are above the noise guard and the
ranges of the launches do not overlap (React Native's best launch is slower or larger than the native
wrapper's worst). The noise guard: a ratio is n/a when a value is not positive or the launches of either
side span an order of magnitude (highest at least 10 times the lowest, a lowest of 0 included); times under
0.02 ms (both sides) keep their ratio but are never flagged. The p90 of a runner's samples is the sample at
index floor(0.9 n) of the sorted ones.

## Caveats

- Simulator and emulator on a laptop, not devices. Absolute numbers are only good for this machine; ratios
  between runners that ran in the same session are the result. The Android emulator is noisy: the first
  launch after an emulator boot was several times slower than later ones (seen while developing this), so the emulator is
  warmed up (one discarded launch of every runner) before the launches that count.
- Core's test fonts are subsets: the Roboto font has only \`a\`, \`b\` and \`c\`, so the Latin texts are words of
  those letters and a space draws \`.notdef\`. The Urdu font is the full Noto Nastaliq Urdu.
- All three wrappers build the same Core sources (the \`Source\` folders of the React Native submodule,
  Tehreer-Cocoa and Tehreer-Android are identical when this was run), so differences come from the
  wrappers, the compiler flags of each build and the platform painters. Line counts and frame heights were
  checked per scenario and are equal between the runners of a platform.
- Layout in React Native includes the cost of the JSI calls and handle objects of the wrapper. Draw includes
  the native painter's calls (React Native: C++ painter calling a JNI Canvas on Android, CGContext on iOS).
- The canvases are not identical: Android a software \`Bitmap\` canvas; iOS a premultiplied \`CGBitmapContext\`
  (Cocoa) against the \`UIGraphicsImageRenderer\` context of the painter test surface (React Native). The
  canvas is not cleared between draws.
- Memory is the native heap only (plus the Java heap for Tehreer-Android, which keeps its layout there). The
  Hermes heap and Java objects of React Native are not counted; the allocator hands out memory in chunks, so
  small scenarios (a few KB) are noisy, and the glyph caches of Core, filled by earlier draws, are shared by
  later scenarios, so the numbers measure what a layout holds, not a cold process.
- Memory definition differs slightly by runner. Each sample is the heap after minus before, with the window
  opened before the styled text is made. React Native and Cocoa release the styled text (and Cocoa its
  autorelease pool) before the heap is read; Tehreer-Android keeps the \`SpannableString\` alive and adds
  the Java heap after \`System.gc()\` to the native heap. The Android runner does not call \`System.gc()\`
  or release objects between scenarios, so a collection or finalizer may land in a timed loop of
  Tehreer-Android, while React Native and Cocoa release explicitly. This was not re-measured; it can only
  inflate Tehreer-Android's times, so the Android draw findings below are not helped by it.
- Memory, what it was ([#64](https://github.com/Tehreer/Tehreer-ReactNative/issues/64),
  [#66](https://github.com/Tehreer/Tehreer-ReactNative/issues/66)). The first tables read the React Native heap
  with the typesetter alive and found it 1.3 to 2.4 times Tehreer-Cocoa's and 1.4 to 1.9 times Tehreer-Android's.
  The steps were measured one by one (KB of native heap, long-latin, median of three launches of the step):
  iOS styled text 292 (158 of it freed when the text is disposed, the rest is the typesetter's copy), typesetter
  773, frame resolver 0, frame 390, typesetter and resolver released -250; Android 357 / 803 / 0 / 522, released
  -313. Tehreer-Cocoa and Tehreer-Android drop the typesetter when their layout function returns (a frame does
  not keep it: Core's lines hold runs, not the typesetter), React Native kept it. With it released, the same
  steps land close to the native runners on long-latin (iOS about 1 MB for both, Android about 1.2 MB for
  both, Tehreer-Android's figure being native plus Java heap). The step-measured values are indicative (a
  few percent off the tables' medians); the tables are the reference. Nothing of the
  wrapper is visible in the numbers: the JS handle objects and the resolver are under 1 KB, and the Hermes heap
  is mapped, not malloc. On Android the old number also added \`mallinfo().hblkhd\` (what the allocator has mapped,
  not in use), which moved a launch by up to 700 KB; it is no longer added. A mounted \`TLabel\`
  or \`TTextView\` keeps its typesetter, which holds about 250 to 410 KB more in the long scenarios (a quarter to a
  third of the frame's figure; shaped data that the frame shares is not counted twice), in Tehreer-Cocoa and
  Tehreer-Android as well.
- Memory, where React Native is well below the native runner (iOS urdu-paragraph 17 against 38 KB; Android
  long-urdu 1037 against 1345 KB). This is not a saving of the wrapper. On Android about 180 KB of
  Tehreer-Android's figure is its Java heap, which the native heap of React Native does not include. For
  the rest the cause was not isolated: the samples are small differences of two heap reads, the allocator
  hands out memory in chunks, and the glyph caches filled by earlier scenarios decide what a layout has to
  allocate, so these rows may depend on the order of the scenarios and on the allocator, not on a
  difference of Core or of the wrapper.
- Findings are tracked in issues: Android draw [#63](https://github.com/Tehreer/Tehreer-ReactNative/issues/63),
  Android memory [#64](https://github.com/Tehreer/Tehreer-ReactNative/issues/64), iOS Urdu layout
  [#65](https://github.com/Tehreer/Tehreer-ReactNative/issues/65) (urdu-paragraph, long-urdu and the
  mixed-bidi layout row), iOS memory [#66](https://github.com/Tehreer/Tehreer-ReactNative/issues/66).
  The iOS latin-label layout (8 microseconds apart) is below the time floor and is not a finding.
- The order of the scenarios is fixed and a runner runs them in one process.
`;

export function formatReport({ environment, metas, aggregates, definition }) {
  const parts = ["# Benchmarks: React Native against the Android and Cocoa wrappers", "", "Generated by `node benchmarks/run.mjs`; method and how to repeat it are in [README.md](README.md).", "", "## Environment", "", ...deviceLines(environment), "", buildLines(metas), "", "## Scenarios", "", scenarioTable(definition), ""];
  const flagged = [];
  for (const pair of PAIRS) {
    const rn = aggregates[pair.rn];
    const native = aggregates[pair.native];
    if (!rn || !native) continue;
    const rows = compare(rn, native);
    parts.push(`## ${pair.title}`, "", "Ratio above 1 means React Native is slower (time) or larger (memory) than the native wrapper.", "", formatComparisonTable(rows, pair.nativeName), "");
    parts.push(`### ${pair.rn}`, "", formatWrapperTable(rn, definition.scenarios), "", `### ${pair.native}`, "", formatWrapperTable(native, definition.scenarios), "");
    for (const row of rows) if (row.flagged) flagged.push({ ...row, platform: pair.platform });
  }
  parts.push("## Where React Native is more than 20% worse", "");
  if (flagged.length === 0) {
    parts.push("None.");
  } else {
    parts.push("| Platform | Scenario | Metric | RN | Native | Ratio |", "|---|---|---|---:|---:|---:|");
    for (const row of flagged) parts.push(`| ${row.platform} | ${row.scenario} | ${row.metric} | ${number(row.reactNative.value, digitsFor(row.metric, Math.min(row.reactNative.value, row.native.value)))} | ${number(row.native.value, digitsFor(row.metric, Math.min(row.reactNative.value, row.native.value)))} | ${number(row.ratio, 2)} |`);
  }
  parts.push("", METHOD);
  return parts.join("\n");
}
