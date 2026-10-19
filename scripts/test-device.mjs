// Builds the example app, runs it on the booted iOS simulator or Android emulator, and checks the
// line that App.tsx logs. Usage: node scripts/test-device.mjs <ios|android>
//
// The example app runs its registered suites and logs TEHREER_SUITE, TEHREER_FAIL and one final
// TEHREER_RESULT line (format in AGENTS.md, parser in scripts/device/DeviceResults.mjs). The run
// passes when the result line is consistent and every test of every suite passed; a failure, a
// timeout or a missing result line exits non-zero.
// Prerequisites: scripts/fetch-deps, `npm install` in the root and in example/, `pod install` in
// example/ios for iOS, ANDROID_HOME for Android, a booted simulator or emulator.
import { spawn, spawnSync } from "node:child_process";
import console from "node:console";
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { get } from "node:http";
import process from "node:process";
import { clearTimeout, setTimeout } from "node:timers";
import { fileURLToPath, URL } from "node:url";
import { checkDeviceResults, formatSummary, hasResultLine, parseDeviceLog } from "./device/DeviceResults.mjs";

const example = fileURLToPath(new URL("../example", import.meta.url));
const metroPort = 8081;

// Core is the single source of the version; reading its header keeps the test from going stale.
const header = readFileSync(
  fileURLToPath(new URL("../Libraries/TehreerCore/Headers/Tehreer/TRVersion.h", import.meta.url)),
  "utf8",
);
const version = /#define\s+TEHREER_VERSION_STRING\s+"([^"]+)"/.exec(header)?.[1];
if (!version) throw new Error("TEHREER_VERSION_STRING not found in TRVersion.h");
// Counted from the launch of the app: Metro has built the bundle by then (see warmBundle).
const timeoutMs = 90_000;
const tailLines = 60;

/** The last lines of a log, for the output of a failed run. */
function tail(text) {
  return text.trimEnd().split("\n").slice(-tailLines).join("\n");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env, ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }
}

/** Starts the logger, then `launch`, and resolves with the log up to the first complete TEHREER_RESULT line. */
function waitForResult(loggerCommand, loggerArgs, launch) {
  return new Promise((resolve, reject) => {
    // Its own process group, so that the readers it starts (`xcrun` runs `log stream` in the
    // simulator) are stopped with it.
    const logger = spawn(loggerCommand, loggerArgs, { env: process.env, detached: true });
    let timer;
    let launchTimer;
    let buffered = "";

    function finish(error) {
      clearTimeout(timer);
      clearTimeout(launchTimer);
      // Only the group of the logger child is signalled, never a process found by name.
      try {
        process.kill(-logger.pid, "SIGTERM");
      } catch {
        // Already gone.
      }
      if (error) {
        // The partial log lets the caller still report the suites and failures seen so far.
        error.log = buffered;
        reject(error);
      } else {
        resolve(buffered);
      }
    }

    logger.stdout.on("data", (chunk) => {
      buffered += chunk.toString();
      if (hasResultLine(buffered)) finish();
    });
    logger.on("error", finish);
    logger.on("exit", (code) => {
      if (code !== null && code !== 0) finish(new Error(`the log reader exited with status ${code}`));
    });

    launchTimer = setTimeout(() => {
      try {
        launch();
        timer = setTimeout(() => finish(new Error("timed out waiting for TEHREER_RESULT")), timeoutMs);
      } catch (error) {
        finish(error);
      }
    }, 3000);
  });
}

function metroStatus() {
  return new Promise((resolve) => {
    const request = get({ host: "localhost", port: metroPort, path: "/status", timeout: 1000 }, (response) => {
      let body = "";
      response.on("data", (chunk) => (body += chunk));
      response.on("end", () => resolve(body));
    });
    request.on("error", () => resolve(undefined));
    request.on("timeout", () => request.destroy());
  });
}

async function waitUntil(condition, message, limitMs) {
  const end = Date.now() + limitMs;
  while (Date.now() < end) {
    if (await condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(message);
}

/**
 * The first request builds the JavaScript bundle, which takes minutes on a cold cache. Doing it
 * before the app is launched keeps that time out of the test timeout. A failure is not fatal: the
 * app then requests the bundle itself.
 */
function warmBundle(bundlePlatform) {
  return new Promise((resolve) => {
    const request = get(
      { host: "localhost", port: metroPort, path: `/index.bundle?platform=${bundlePlatform}&dev=true`, timeout: 300_000 },
      (response) => {
        response.resume();
        response.on("end", resolve);
        response.on("error", resolve);
      },
    );
    request.on("error", resolve);
    request.on("timeout", () => {
      request.destroy();
      resolve();
    });
  });
}

/**
 * Runs `body` while Metro serves the example app. Metro is started as node on the CLI directly (no
 * npx or shell in between) in its own process group, which is killed afterwards, so that no stale
 * Metro keeps port 8081 and serves an old bundle to the next run.
 */
async function withMetro(bundlePlatform, body) {
  if ((await metroStatus()) !== undefined) {
    throw new Error(`port ${metroPort} is already served; stop that Metro first`);
  }

  const cli = `${example}/node_modules/react-native/cli.js`;
  // Metro's output is kept so that a failed run can show what it reported.
  const scratch = mkdtempSync(join(tmpdir(), "tehreer-metro-"));
  const metroLog = join(scratch, "metro.log");
  const logFd = openSync(metroLog, "w");
  const metro = spawn(process.execPath, [cli, "start", "--port", String(metroPort)], {
    cwd: example,
    stdio: ["ignore", logFd, logFd],
    detached: true,
  });
  closeSync(logFd);
  try {
    await waitUntil(async () => (await metroStatus()) === "packager-status:running", "Metro did not start", 60_000);
    await warmBundle(bundlePlatform);
    return await body();
  } catch (error) {
    console.error(`--- last lines of the Metro log ---\n${tail(readFileSync(metroLog, "utf8"))}\n---`);
    throw error;
  } finally {
    try {
      process.kill(-metro.pid, "SIGTERM");
    } catch {
      // Already gone.
    }
    await waitUntil(async () => (await metroStatus()) === undefined, `Metro still serves port ${metroPort}`, 10_000);
    rmSync(scratch, { recursive: true, force: true });
  }
}

async function ios() {
  const bundleId = "org.reactjs.native.example.TehreerExample";
  // Building only the architecture of the booted simulator halves the time and the disk use.
  const booted = spawnSync("xcrun", ["simctl", "list", "devices", "booted", "-j"], { encoding: "utf8" });
  const devices = Object.values(JSON.parse(booted.stdout).devices).flat();
  if (devices.length === 0) throw new Error("no booted iOS simulator");
  if (!existsSync(`${example}/ios/Pods`)) {
    run("pod", ["install"], { cwd: `${example}/ios`, env: { ...process.env, LANG: "en_US.UTF-8" } });
  }
  run("xcodebuild", [
    "-workspace", "TehreerExample.xcworkspace", "-scheme", "TehreerExample", "-configuration", "Debug",
    "-sdk", "iphonesimulator", "-destination", `id=${devices[0].udid}`, "ONLY_ACTIVE_ARCH=YES",
    "-derivedDataPath", "build", "CODE_SIGNING_ALLOWED=NO", "build",
  ], { cwd: `${example}/ios` });
  run("xcrun", ["simctl", "install", "booted", `${example}/ios/build/Build/Products/Debug-iphonesimulator/TehreerExample.app`]);

  return withMetro("ios", () => {
    spawnSync("xcrun", ["simctl", "terminate", "booted", bundleId]);
    return waitForResult(
      "xcrun",
      ["simctl", "spawn", "booted", "log", "stream", "--level", "debug", "--predicate", 'process == "TehreerExample"'],
      () => run("xcrun", ["simctl", "launch", "booted", bundleId]),
    );
  });
}

async function android() {
  const sdk = process.env.ANDROID_HOME;
  if (!sdk) throw new Error("ANDROID_HOME is not set");
  const adb = `${sdk}/platform-tools/adb`;

  // Every adb call names the device, so a second attached device cannot receive a different step.
  const listed = spawnSync(adb, ["devices"], { encoding: "utf8" }).stdout
    .split("\n").slice(1).map((line) => line.split("\t")).filter(([, state]) => state?.trim() === "device")
    .map(([name]) => name);
  const serial = process.env.ANDROID_SERIAL ?? (listed.length === 1 ? listed[0] : undefined);
  if (!serial || !listed.includes(serial)) {
    throw new Error(`expected one Android device or ANDROID_SERIAL; found: ${listed.join(", ") || "none"}`);
  }
  const device = (...args) => ["-s", serial, ...args];

  const abi = spawnSync(adb, device("shell", "getprop", "ro.product.cpu.abi"), { encoding: "utf8" }).stdout.trim();
  run("./gradlew", [":app:assembleDebug", `-PreactNativeArchitectures=${abi}`], { cwd: `${example}/android` });
  run(adb, device("reverse", `tcp:${metroPort}`, `tcp:${metroPort}`));
  run(adb, device("install", "-r", `${example}/android/app/build/outputs/apk/debug/app-debug.apk`));
  run(adb, device("logcat", "-c"));

  return withMetro("android", () =>
    waitForResult(adb, device("logcat", "-s", "ReactNativeJS:I"), () =>
      run(adb, device("shell", "am", "start", "-n", "com.tehreerexample/.MainActivity"))));
}

const platform = process.argv[2];
if (platform !== "ios" && platform !== "android") {
  console.error("usage: node scripts/test-device.mjs <ios|android>");
  process.exit(2);
}

function report(log) {
  const parsed = parseDeviceLog(log);
  const summary = formatSummary(parsed);
  if (summary) console.log(summary);
  return parsed;
}

try {
  const log = await (platform === "ios" ? ios() : android());
  const parsed = report(log);
  const problems = checkDeviceResults(parsed, version);
  if (problems.length > 0) {
    console.error(`--- last lines of the device log ---\n${tail(log)}\n---`);
    for (const problem of problems) console.error(`${platform}: ${problem}`);
    console.error(`${platform}: failed`);
    process.exit(1);
  }
  console.log(`${platform}: passed`);
  process.exit(0);
} catch (error) {
  if (typeof error.log === "string") {
    report(error.log);
    console.error(`--- last lines of the device log ---\n${tail(error.log)}\n---`);
  }
  console.error(`${platform}: failed: ${error.message}`);
  process.exit(1);
}
