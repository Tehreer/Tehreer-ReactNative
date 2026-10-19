// Builds the example app, runs it on the booted iOS simulator or Android emulator, and checks the
// line that App.tsx logs. Usage: node scripts/test-device.mjs <ios|android>
//
// The example app runs its suites and logs the failures (`TEHREER_FAIL <test>: <message>`), then one
// result line: `TEHREER_RESULT version=<Core version> smokeTest=true handles=<passed>/<total>`. The
// run passes when nothing failed and every test passed.
// Prerequisites: scripts/fetch-deps, `npm install` in the root and in example/, `pod install` in
// example/ios for iOS, ANDROID_HOME for Android, a booted simulator or emulator.
import { spawn, spawnSync } from "node:child_process";
import console from "node:console";
import { existsSync, readFileSync } from "node:fs";
import { get } from "node:http";
import process from "node:process";
import { clearTimeout, setTimeout } from "node:timers";
import { fileURLToPath, URL } from "node:url";

const example = fileURLToPath(new URL("../example", import.meta.url));
const metroPort = 8081;

// Core is the single source of the version; reading its header keeps the test from going stale.
const header = readFileSync(
  fileURLToPath(new URL("../Libraries/TehreerCore/Headers/Tehreer/TRVersion.h", import.meta.url)),
  "utf8",
);
const version = /#define\s+TEHREER_VERSION_STRING\s+"([^"]+)"/.exec(header)?.[1];
if (!version) throw new Error("TEHREER_VERSION_STRING not found in TRVersion.h");
const expected = new RegExp(`^TEHREER_RESULT version=${version.replaceAll(".", "\\.")} smokeTest=true handles=(\\d+)/(\\d+)$`);
const timeoutMs = 90_000;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env, ...options });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }
}

/** Starts the logger, then `launch`, and resolves with the first TEHREER_RESULT line. */
function waitForResult(loggerCommand, loggerArgs, launch) {
  return new Promise((resolve, reject) => {
    const logger = spawn(loggerCommand, loggerArgs, { env: process.env });
    const timer = setTimeout(() => finish(new Error("timed out waiting for TEHREER_RESULT")), timeoutMs);
    let buffered = "";

    function finish(error, line) {
      clearTimeout(timer);
      logger.kill();
      if (error) reject(error);
      else resolve(line);
    }

    logger.stdout.on("data", (chunk) => {
      buffered += chunk.toString();
      const match = /TEHREER_RESULT [^\r\n]*/.exec(buffered);
      if (match) {
        const failures = [...buffered.matchAll(/TEHREER_FAIL [^\r\n]*/g)].map((failure) => failure[0].trim());
        finish(undefined, { line: match[0].trim(), failures });
      }
    });
    logger.on("error", finish);

    setTimeout(() => {
      try {
        launch();
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
 * Runs `body` while Metro serves the example app. Metro is started as node on the CLI directly (no
 * npx or shell in between) in its own process group, which is killed afterwards, so that no stale
 * Metro keeps port 8081 and serves an old bundle to the next run.
 */
async function withMetro(body) {
  if ((await metroStatus()) !== undefined) {
    throw new Error(`port ${metroPort} is already served; stop that Metro first`);
  }

  const cli = `${example}/node_modules/react-native/cli.js`;
  const metro = spawn(process.execPath, [cli, "start", "--port", String(metroPort)], {
    cwd: example,
    stdio: "ignore",
    detached: true,
  });
  try {
    await waitUntil(async () => (await metroStatus()) === "packager-status:running", "Metro did not start", 60_000);
    return await body();
  } finally {
    try {
      process.kill(-metro.pid, "SIGTERM");
    } catch {
      // Already gone.
    }
    await waitUntil(async () => (await metroStatus()) === undefined, `Metro still serves port ${metroPort}`, 10_000);
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

  return withMetro(() => {
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

  return withMetro(() =>
    waitForResult(adb, device("logcat", "-s", "ReactNativeJS:I"), () =>
      run(adb, device("shell", "am", "start", "-n", "com.tehreerexample/.MainActivity"))));
}

const platform = process.argv[2];
if (platform !== "ios" && platform !== "android") {
  console.error("usage: node scripts/test-device.mjs <ios|android>");
  process.exit(2);
}

try {
  const { line, failures } = await (platform === "ios" ? ios() : android());
  for (const failure of failures) console.log(failure);
  console.log(line);
  const match = expected.exec(line);
  if (!match || failures.length > 0 || match[1] !== match[2] || match[1] === "0") {
    console.error(`expected: ${expected} with every test passed`);
    process.exit(1);
  }
  console.log(`${platform}: passed`);
  process.exit(0);
} catch (error) {
  console.error(`${platform}: failed: ${error.message}`);
  process.exit(1);
}
