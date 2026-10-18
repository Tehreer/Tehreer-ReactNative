// Builds the example app, runs it on the booted iOS simulator or Android emulator, and checks the
// line that App.tsx logs. Usage: node scripts/test-device.mjs <ios|android>
//
// The spike's device test is one line: `TEHREER_RESULT version=<Core version> smokeTest=true`.
// Prerequisites: scripts/fetch-deps, `npm install` in the root and in example/, `pod install` in
// example/ios for iOS, ANDROID_HOME for Android, a booted simulator or emulator.
import { spawn, spawnSync } from "node:child_process";
import console from "node:console";
import process from "node:process";
import { clearTimeout, setTimeout } from "node:timers";
import { fileURLToPath, URL } from "node:url";

const example = fileURLToPath(new URL("../example", import.meta.url));
const expected = "TEHREER_RESULT version=1.0.0 smokeTest=true";
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
      if (match) finish(undefined, match[0].trim());
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

function startMetro() {
  const metro = spawn("npx", ["react-native", "start", "--port", "8081"], { cwd: example, stdio: "ignore" });
  return () => metro.kill();
}

async function ios() {
  const bundleId = "org.reactjs.native.example.TehreerExample";
  // Building only the architecture of the booted simulator halves the time and the disk use.
  const booted = spawnSync("xcrun", ["simctl", "list", "devices", "booted", "-j"], { encoding: "utf8" });
  const devices = Object.values(JSON.parse(booted.stdout).devices).flat();
  if (devices.length === 0) throw new Error("no booted iOS simulator");
  run("xcodebuild", [
    "-workspace", "TehreerExample.xcworkspace", "-scheme", "TehreerExample", "-configuration", "Debug",
    "-sdk", "iphonesimulator", "-destination", `id=${devices[0].udid}`, "ONLY_ACTIVE_ARCH=YES",
    "-derivedDataPath", "build", "CODE_SIGNING_ALLOWED=NO", "build",
  ], { cwd: `${example}/ios` });
  run("xcrun", ["simctl", "install", "booted", `${example}/ios/build/Build/Products/Debug-iphonesimulator/TehreerExample.app`]);

  const stopMetro = startMetro();
  try {
    spawnSync("xcrun", ["simctl", "terminate", "booted", bundleId]);
    return await waitForResult(
      "xcrun",
      ["simctl", "spawn", "booted", "log", "stream", "--level", "debug", "--predicate", 'process == "TehreerExample"'],
      () => run("xcrun", ["simctl", "launch", "booted", bundleId]),
    );
  } finally {
    stopMetro();
  }
}

async function android() {
  const sdk = process.env.ANDROID_HOME;
  if (!sdk) throw new Error("ANDROID_HOME is not set");
  const adb = `${sdk}/platform-tools/adb`;

  const abi = spawnSync(adb, ["shell", "getprop", "ro.product.cpu.abi"], { encoding: "utf8" }).stdout.trim();
  if (!abi) throw new Error("no connected Android device");
  run("./gradlew", [":app:assembleDebug", `-PreactNativeArchitectures=${abi}`], { cwd: `${example}/android` });
  run(adb, ["reverse", "tcp:8081", "tcp:8081"]);
  run(adb, ["install", "-r", `${example}/android/app/build/outputs/apk/debug/app-debug.apk`]);
  run(adb, ["logcat", "-c"]);

  const stopMetro = startMetro();
  try {
    return await waitForResult(adb, ["logcat", "-s", "ReactNativeJS:I"], () =>
      run(adb, ["shell", "am", "start", "-n", "com.tehreerexample/.MainActivity"]));
  } finally {
    stopMetro();
  }
}

const platform = process.argv[2];
if (platform !== "ios" && platform !== "android") {
  console.error("usage: node scripts/test-device.mjs <ios|android>");
  process.exit(2);
}

try {
  const line = await (platform === "ios" ? ios() : android());
  console.log(line);
  if (line !== expected) {
    console.error(`expected: ${expected}`);
    process.exit(1);
  }
  console.log(`${platform}: passed`);
  process.exit(0);
} catch (error) {
  console.error(`${platform}: failed: ${error.message}`);
  process.exit(1);
}
