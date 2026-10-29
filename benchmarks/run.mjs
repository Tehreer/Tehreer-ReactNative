// Builds the three runners of benchmarks/scenarios.json, runs them on the booted iOS simulator and the
// running Android emulator, and writes results.json and RESULTS.md. See benchmarks/README.md.
//
//   node benchmarks/run.mjs [--platform ios|android|all] [--wrapper react-native|native|all]
//                           [--runs 3] [--scratch <dir>] [--skip-build] [--out <dir>]
//
// Nothing is built inside the sibling repositories: Tehreer-Android's sources are copied to the scratch
// directory, Tehreer-Cocoa is referenced as a local Swift package by a package in the scratch
// directory. No process is found by name; only the process groups of the children started here are
// signalled.
import { spawn, spawnSync } from "node:child_process";
import console from "node:console";
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { clearTimeout, setTimeout } from "node:timers";
import { fileURLToPath, URL } from "node:url";
import { aggregateRuns, isFinished, parseBenchLog } from "./lib/Results.mjs";
import { formatReport } from "./lib/Report.mjs";
import { validateScenarios } from "./lib/Scenarios.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const home = process.env.HOME ?? "";
const androidSiblingDefault = "/Users/mta/Personal/UrduFeeds/tehreerAndroid";
const cocoaSiblingDefault = "/Users/mta/Personal/UrduFeeds/tehreerCocoa";
const timeoutMs = 15 * 60_000;

function parseArguments(argv) {
  const options = { platform: "all", wrapper: "all", runs: 3, scratch: join(tmpdir(), "tehreer-benchmark"), skipBuild: false, out: join(root, "benchmarks") };
  for (let i = 0; i < argv.length; i++) {
    const argument = argv[i];
    const value = () => {
      const next = argv[++i];
      if (next === undefined) throw new Error(`${argument} needs a value`);
      return next;
    };
    switch (argument) {
      case "--platform": options.platform = value(); break;
      case "--wrapper": options.wrapper = value(); break;
      case "--runs": options.runs = Number(value()); break;
      case "--scratch": options.scratch = value(); break;
      case "--out": options.out = value(); break;
      case "--skip-build": options.skipBuild = true; break;
      default: throw new Error(`unknown argument ${argument}`);
    }
  }
  if (!["ios", "android", "all"].includes(options.platform)) throw new Error("--platform must be ios, android or all");
  if (!["react-native", "native", "all"].includes(options.wrapper)) throw new Error("--wrapper must be react-native, native or all");
  if (!Number.isInteger(options.runs) || options.runs < 1) throw new Error("--runs must be a positive integer");
  return options;
}

function output(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, ...options });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}

/** Runs a build step; its output goes to a log file so that a failure can show the tail. */
function build(step, logFile, command, args, options = {}) {
  console.log(`build: ${step}`);
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, env: process.env, ...options });
  writeFileSync(logFile, `${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  if (result.status !== 0) {
    const tail = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trimEnd().split("\n").slice(-40).join("\n");
    throw new Error(`${step} failed (log: ${logFile})\n${tail}`);
  }
}

/**
 * Starts the log reader, then `launch`, and resolves with the log up to the first complete BENCH_DONE or
 * BENCH_ERROR line. The reader has its own process group, which is the only thing signalled.
 */
function collect(loggerCommand, loggerArgs, launch) {
  return new Promise((resolve, reject) => {
    const logger = spawn(loggerCommand, loggerArgs, { env: process.env, detached: true });
    let buffered = "";
    let timer;
    let launchTimer;
    let finished = false;

    function finish(error) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearTimeout(launchTimer);
      try {
        process.kill(-logger.pid, "SIGTERM");
      } catch {
        // Already gone.
      }
      if (error) {
        error.log = buffered;
        reject(error);
      } else {
        resolve(buffered);
      }
    }

    logger.stdout.on("data", (chunk) => {
      buffered += chunk.toString();
      if (isFinished(buffered)) finish();
    });
    logger.on("error", finish);
    logger.on("exit", (code) => {
      if (code !== null && code !== 0) finish(new Error(`the log reader exited with status ${code}`));
    });
    launchTimer = setTimeout(() => {
      try {
        launch();
        timer = setTimeout(() => finish(new Error("timed out waiting for BENCH_DONE")), timeoutMs);
      } catch (error) {
        finish(error);
      }
    }, 2000);
  });
}

/** Runs a program that prints the BENCH lines to its standard output and exits. */
function spawnAndCollect(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env: process.env, detached: true });
    let buffered = "";
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        // Already gone.
      }
      reject(new Error("timed out waiting for the runner"));
    }, timeoutMs);
    child.stdout.on("data", (chunk) => (buffered += chunk.toString()));
    child.stderr.on("data", (chunk) => (buffered += chunk.toString()));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("exit", () => {
      clearTimeout(timer);
      resolve(buffered);
    });
  });
}

function requireClean(parsed, label, log) {
  if (parsed.error !== undefined) throw new Error(`${label}: the runner reported an error: ${parsed.error}`);
  if (!parsed.done || parsed.problems.length > 0) {
    throw new Error(`${label}: incomplete log (done=${parsed.done}, problems=${parsed.problems.join("; ")})\n${log.slice(-2000)}`);
  }
}

async function runMany(label, runs, once) {
  const parsedRuns = [];
  // One launch more than asked for, the first thrown away: a freshly installed app on a simulator or
  // emulator that has been idle is measurably slower, and that is not what the table is about.
  for (let i = 0; i < runs + 1; i++) {
    console.log(`run: ${label} ${i === 0 ? "warm-up (discarded)" : `${i}/${runs}`}`);
    const log = await once();
    const parsed = parseBenchLog(log);
    requireClean(parsed, label, log);
    if (i > 0) parsedRuns.push(parsed);
  }
  return parsedRuns;
}

// ---------------------------------------------------------------- iOS

function bootedSimulator() {
  const devices = JSON.parse(output("xcrun", ["simctl", "list", "devices", "booted", "-j"])).devices;
  for (const [runtime, list] of Object.entries(devices)) {
    if (list.length > 0) {
      return { udid: list[0].udid, name: list[0].name, os: runtime.replace(/^.*SimRuntime\./, "").replace(/^iOS-/, "iOS ").replace(/-/g, ".") };
    }
  }
  throw new Error("no booted iOS simulator");
}

async function iosReactNative(options, simulator, scenarios) {
  const bundleId = "org.reactjs.native.example.TehreerExample";
  const derived = join(options.scratch, "ios-rn");
  const app = join(derived, "Build/Products/Release-iphonesimulator/TehreerExample.app");
  if (!options.skipBuild) {
    if (!existsSync(join(root, "example/ios/Pods"))) {
      build("pod install", join(options.scratch, "pod.log"), "pod", ["install"], { cwd: join(root, "example/ios"), env: { ...process.env, LANG: "en_US.UTF-8" } });
    }
    // Release, bundled JavaScript (Hermes bytecode), and the benchmark entry and native hooks (-D).
    build("React Native example, iOS Release", join(options.scratch, "ios-rn-build.log"), "xcodebuild", [
      "-workspace", "TehreerExample.xcworkspace", "-scheme", "TehreerExample", "-configuration", "Release",
      "-sdk", "iphonesimulator", "-destination", `id=${simulator.udid}`, "ONLY_ACTIVE_ARCH=YES",
      "-derivedDataPath", derived, "CODE_SIGNING_ALLOWED=NO",
      "GCC_PREPROCESSOR_DEFINITIONS=$(inherited) TEHREER_BENCHMARKS=1", "build",
    ], { cwd: join(root, "example/ios"), env: { ...process.env, ENTRY_FILE: "index.benchmark.js" } });
  }
  output("xcrun", ["simctl", "install", simulator.udid, app]);
  return runMany("react-native/ios", options.runs, () => {
    spawnSync("xcrun", ["simctl", "terminate", simulator.udid, bundleId]);
    return collect("xcrun", ["simctl", "spawn", simulator.udid, "log", "stream", "--level", "debug", "--predicate", 'process == "TehreerExample"'],
      () => output("xcrun", ["simctl", "launch", simulator.udid, bundleId]));
  }).finally(() => spawnSync("xcrun", ["simctl", "terminate", simulator.udid, bundleId])).then((runs) => {
    void scenarios;
    return runs;
  });
}

async function iosCocoa(options, simulator, scenariosPath) {
  const cocoa = process.env.TEHREER_COCOA ?? cocoaSiblingDefault;
  const packageDirectory = join(options.scratch, "cocoa-bench");
  const buildDirectory = join(options.scratch, "cocoa-build");
  const sdk = output("xcrun", ["--sdk", "iphonesimulator", "--show-sdk-path"]).trim();
  if (!options.skipBuild) {
    rmSync(packageDirectory, { recursive: true, force: true });
    cpSync(join(root, "benchmarks/cocoa"), packageDirectory, { recursive: true });
    const manifest = join(packageDirectory, "Package.swift");
    writeFileSync(manifest, readFileSync(manifest, "utf8").replaceAll("TEHREER_COCOA_PATH", cocoa));
    build("Tehreer-Cocoa runner, release", join(options.scratch, "cocoa-build.log"), "swift", [
      "build", "-c", "release", "--package-path", packageDirectory, "--scratch-path", buildDirectory,
      "--sdk", sdk, "--triple", "arm64-apple-ios17.0-simulator",
    ]);
  }
  const binary = join(buildDirectory, "arm64-apple-ios-simulator/release/bench");
  const fonts = join(root, "Libraries/TehreerCore/Tests/Fonts");
  return runMany("tehreer-cocoa/ios", options.runs, () =>
    spawnAndCollect("xcrun", ["simctl", "spawn", simulator.udid, binary, scenariosPath, fonts, "Release", simulator.os]));
}

// ---------------------------------------------------------------- Android

function androidDevice() {
  const sdk = process.env.ANDROID_HOME ?? `${home}/Library/Android/sdk`;
  const adb = `${sdk}/platform-tools/adb`;
  const listed = output(adb, ["devices"]).split("\n").slice(1).map((line) => line.split("\t")).filter(([, state]) => state?.trim() === "device").map(([name]) => name);
  const serial = process.env.ANDROID_SERIAL ?? (listed.length === 1 ? listed[0] : undefined);
  if (!serial || !listed.includes(serial)) throw new Error(`expected one Android device or ANDROID_SERIAL; found: ${listed.join(", ") || "none"}`);
  const device = (...args) => ["-s", serial, ...args];
  const prop = (name) => output(adb, device("shell", "getprop", name)).trim();
  let avd = prop("ro.boot.qemu.avd_name");
  if (!avd) avd = prop("ro.kernel.qemu.avd_name");
  return {
    sdk, adb, serial, device, prop, avd,
    model: prop("ro.product.model"), release: prop("ro.build.version.release"), api: prop("ro.build.version.sdk"), abi: prop("ro.product.cpu.abi"),
  };
}

async function androidReactNative(options, android) {
  const apk = join(root, "example/android/app/build/outputs/apk/release/app-release.apk");
  if (!options.skipBuild) {
    // The folder of the autolinking keeps the module list of the last configuration.
    rmSync(join(root, "example/android/build/generated/autolinking"), { recursive: true, force: true });
    build("React Native example, Android release", join(options.scratch, "android-rn-build.log"), "./gradlew", [
      "--offline", ":app:assembleRelease", "-PtehreerBenchmarks", `-PreactNativeArchitectures=${android.abi}`,
    ], { cwd: join(root, "example/android"), env: { ...process.env, ANDROID_HOME: android.sdk } });
  }
  output(android.adb, android.device("install", "-r", apk));
  return runMany("react-native/android", options.runs, () => {
    spawnSync(android.adb, android.device("shell", "am", "force-stop", "com.tehreerexample"));
    spawnSync("/bin/sleep", ["2"]);
    output(android.adb, android.device("logcat", "-c"));
    return collect(android.adb, android.device("logcat", "-s", "ReactNativeJS:I"), () =>
      output(android.adb, android.device("shell", "am", "start", "-n", "com.tehreerexample/.MainActivity")));
  }).finally(() => spawnSync(android.adb, android.device("shell", "am", "force-stop", "com.tehreerexample")));
}

async function androidNative(options, android) {
  const sibling = process.env.TEHREER_ANDROID ?? androidSiblingDefault;
  const project = join(options.scratch, "android-bench");
  if (!options.skipBuild) {
    rmSync(project, { recursive: true, force: true });
    mkdirSync(project, { recursive: true });
    cpSync(join(root, "benchmarks/android"), project, { recursive: true });
    mkdirSync(join(project, "tehreer-android"));
    for (const entry of ["src", "build.gradle", "gradle.properties", "proguard-rules.pro"]) {
      cpSync(join(sibling, "tehreer-android", entry), join(project, "tehreer-android", entry), { recursive: true });
    }
    for (const entry of ["freetype", "harfbuzz", "sheenbidi", "unibreak", "tehreer-core", "gradle", "gradlew"]) {
      cpSync(join(sibling, entry), join(project, entry), { recursive: true });
    }
    writeFileSync(join(project, "local.properties"), `sdk.dir=${android.sdk}\n`);
    const assets = join(project, "app/src/main/assets");
    mkdirSync(join(assets, "fonts"), { recursive: true });
    copyFileSync(join(root, "benchmarks/scenarios.json"), join(assets, "scenarios.json"));
    const definition = JSON.parse(readFileSync(join(root, "benchmarks/scenarios.json"), "utf8"));
    for (const file of Object.values(definition.fonts)) {
      copyFileSync(join(root, definition.fontsDirectory, file), join(assets, "fonts", file));
    }
    build("Tehreer-Android runner, release", join(options.scratch, "android-native-build.log"), "./gradlew", [
      "--offline", ":app:assembleRelease", `-Pandroid.injected.build.abi=${android.abi}`,
    ], { cwd: project, env: { ...process.env, ANDROID_HOME: android.sdk } });
  }
  // -t: a build with the injected ABI is marked test-only, and that is the APK it leaves.
  output(android.adb, android.device("install", "-r", "-t", join(project, "app/build/intermediates/apk/release/app-release.apk")));
  return runMany("tehreer-android/android", options.runs, () => {
    spawnSync(android.adb, android.device("shell", "am", "force-stop", "com.tehreer.benchmark"));
    spawnSync("/bin/sleep", ["2"]);
    output(android.adb, android.device("logcat", "-c"));
    return collect(android.adb, android.device("logcat", "-s", "TehreerBench:I"), () =>
      output(android.adb, android.device("shell", "am", "start", "-n", "com.tehreer.benchmark/.BenchActivity")));
  }).finally(() => spawnSync(android.adb, android.device("shell", "am", "force-stop", "com.tehreer.benchmark")));
}

// ---------------------------------------------------------------- main

function coreVersion() {
  const header = readFileSync(join(root, "Libraries/TehreerCore/Headers/Tehreer/TRVersion.h"), "utf8");
  return /#define\s+TEHREER_VERSION_STRING\s+"([^"]+)"/.exec(header)?.[1] ?? "unknown";
}

function git(...args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "unknown";
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const scenariosPath = join(root, "benchmarks/scenarios.json");
  const definition = validateScenarios(JSON.parse(readFileSync(scenariosPath, "utf8")));
  mkdirSync(options.scratch, { recursive: true });

  const doIos = options.platform !== "android";
  const doAndroid = options.platform !== "ios";
  const doReactNative = options.wrapper !== "native";
  const doNative = options.wrapper !== "react-native";

  // Every runner's launches are saved as soon as they are done, and the report is made from all the
  // saved runners, so a long run can be split in stages or resumed after a failure.
  mkdirSync(join(options.out, "raw"), { recursive: true });
  const save = (key, runs) => writeFileSync(join(options.out, "raw", `${key.replace("/", "-")}.json`), `${JSON.stringify({ key, runs }, null, 2)}\n`);
  const environmentFile = join(options.out, "raw", "environment.json");
  const environment = existsSync(environmentFile) ? JSON.parse(readFileSync(environmentFile, "utf8")) : {};
  Object.assign(environment, {
    date: new Date().toISOString(),
    host: { cpu: output("sysctl", ["-n", "machdep.cpu.brand_string"]).trim(), macOS: output("sw_vers", ["-productVersion"]).trim() },
    coreVersion: coreVersion(),
    coreCommit: git("-C", join(root, "Libraries/TehreerCore"), "rev-parse", "--short", "HEAD"),
    wrapperCommit: git("rev-parse", "--short", "HEAD"),
    siblingCommits: {
      "Tehreer-Android": git("-C", process.env.TEHREER_ANDROID ?? androidSiblingDefault, "rev-parse", "--short", "HEAD"),
      "Tehreer-Cocoa": git("-C", process.env.TEHREER_COCOA ?? cocoaSiblingDefault, "rev-parse", "--short", "HEAD"),
    },
    runs: options.runs,
  });

  if (doIos) {
    const simulator = bootedSimulator();
    environment.ios = simulator;
    if (doReactNative) save("react-native/ios", await iosReactNative(options, simulator, definition));
    if (doNative) save("tehreer-cocoa/ios", await iosCocoa(options, simulator, scenariosPath));
  }
  if (doAndroid) {
    const android = androidDevice();
    environment.android = { model: android.model, avd: android.avd, release: android.release, api: android.api, abi: android.abi };
    if (doReactNative) save("react-native/android", await androidReactNative(options, android));
    if (doNative) save("tehreer-android/android", await androidNative(options, android));
  }
  writeFileSync(environmentFile, `${JSON.stringify(environment, null, 2)}\n`);

  const raw = {};
  for (const name of readdirSync(join(options.out, "raw")).filter((file) => file !== "environment.json")) {
    const saved = JSON.parse(readFileSync(join(options.out, "raw", name), "utf8"));
    raw[saved.key] = saved.runs;
  }
  const aggregates = Object.fromEntries(Object.entries(raw).map(([key, runs]) => [key, aggregateRuns(runs)]));
  const metas = Object.fromEntries(Object.entries(raw).map(([key, runs]) => [key, runs[0]?.meta]));
  writeFileSync(join(options.out, "results.json"), `${JSON.stringify({ environment, metas, aggregates, raw }, null, 2)}\n`);
  writeFileSync(join(options.out, "RESULTS.md"), formatReport({ environment, metas, aggregates, definition }));
  console.log(`wrote ${join(options.out, "results.json")} and ${join(options.out, "RESULTS.md")}`);
}

try {
  await main();
} catch (error) {
  console.error(`benchmark: ${error.message}`);
  if (typeof error.log === "string") console.error(error.log.slice(-2000));
  process.exit(1);
}
