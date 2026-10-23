// Builds the example app against the npm tarball instead of the repository, to prove that what
// `npm pack` ships is enough for a consumer: nothing is read from Libraries/ of the repository and
// nothing is downloaded by the library's build.
//
//   node scripts/test-packed.mjs [--skip-cmake] [--skip-android] [--skip-ios] [--ios-build]
//                                [--abi <abi>] [--online] [--keep] [--scratch <dir>]
//
// 1. `npm pack` into a scratch folder (this runs prepack and postpack) and measure the tarball.
// 2. Check the tarball: every path that the podspec and the CMake projects read is there, nothing
//    outside the allowlist is, and the license files are.
// 3. Configure and build Core with its own CMake project from the extracted package (host).
// 4. Copy example/ into the scratch folder (the original is never modified), put the extracted
//    package in its node_modules instead of the link to the repository, and
//    - Android: `gradlew :app:assembleDebug` for one ABI, offline unless --online is given, then
//      check that the CMake build read the packed sources and that the APK has libappmodules.so;
//    - iOS: `pod install`, and with --ios-build `xcodebuild` of the pod for the simulator.
// The scratch folder (default $TMPDIR/tehreer-rn-dev-42) is deleted at the end unless --keep is
// given. Prerequisites: scripts/fetch-deps, `npm install` in example/, ANDROID_HOME (or the default
// SDK folder) for Android, CocoaPods for iOS. About 4 GB of free disk space.
import { Buffer } from "node:buffer";
import { spawn, spawnSync } from "node:child_process";
import console from "node:console";
import {
  constants,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, matchesGlob, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { podspecPatterns } from "./packaging/Podspec.mjs";
import { CORE, DEPENDENCIES, isAllowed, restore } from "./packaging/Vendor.mjs";

const repository = fileURLToPath(new URL("..", import.meta.url));
const options = {
  cmake: true,
  android: true,
  ios: true,
  iosBuild: false,
  online: false,
  keep: false,
  abi: "arm64-v8a",
  scratch: join(tmpdir(), "tehreer-rn-dev-42"),
};

const args = process.argv.slice(2);
while (args.length > 0) {
  const option = args.shift();
  if (option === "--skip-cmake") options.cmake = false;
  else if (option === "--skip-android") options.android = false;
  else if (option === "--skip-ios") options.ios = false;
  else if (option === "--ios-build") options.iosBuild = true;
  else if (option === "--online") options.online = true;
  else if (option === "--keep") options.keep = true;
  else if (option === "--abi" && args.length > 0) options.abi = String(args.shift());
  else if (option === "--scratch" && args.length > 0) options.scratch = resolve(String(args.shift()));
  else fail(`unknown argument '${option}'`);
}

const results = [];

function fail(message) {
  console.error(`test-packed: ${message}`);
  process.exit(1);
}

function step(name) {
  console.log(`\n== ${name}`);
}

function pass(message) {
  results.push(message);
  console.log(`ok  ${message}`);
}

/** Runs a command to completion and writes its output to a log file; throws with the tail on failure. */
function run(name, command, commandArgs, { cwd, env = {}, logs }) {
  const log = join(logs, `${name}.log`);
  const started = Date.now();
  console.log(`$ ${command} ${commandArgs.join(" ")}   (log: ${log})`);
  return new Promise((done, reject) => {
    const chunks = [];
    const child = spawn(command, commandArgs, { cwd, env: { ...process.env, ...env } });
    child.stdout.on("data", (data) => chunks.push(data));
    child.stderr.on("data", (data) => chunks.push(data));
    child.on("error", reject);
    child.on("close", (status) => {
      const output = Buffer.concat(chunks).toString("utf8");
      writeFileSync(log, output);
      const seconds = Math.round((Date.now() - started) / 1000);
      if (status !== 0) {
        const tail = output.trimEnd().split("\n").slice(-40).join("\n");
        reject(new Error(`${command} ${commandArgs.join(" ")} failed with status ${status} after ${seconds}s:\n${tail}`));
      } else {
        console.log(`    finished in ${seconds}s`);
        done(output);
      }
    });
  });
}

function walk(directory, prefix = "") {
  const found = [];
  for (const entry of readdirSync(join(directory, prefix), { withFileTypes: true })) {
    const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...walk(directory, path));
    else found.push(path);
  }
  return found;
}

function mebibytes(bytes) {
  return `${(bytes / 1048576).toFixed(2)} MiB`;
}

function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const scratch = options.scratch;
  const logs = join(scratch, "logs");

  step("Preflight");
  const check = spawnSync(process.execPath, [join(repository, "scripts", "pack-vendor.mjs"), "check"], { encoding: "utf8" });
  requireThat(check.status === 0, check.stderr.trim());
  pass("Core and Libraries/Dependencies are complete");

  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(logs, { recursive: true });
  mkdirSync(join(scratch, "pack"));
  mkdirSync(join(scratch, "extract"));

  step("npm pack");
  const packOutput = await run("pack", "npm", ["pack", "--json", "--pack-destination", join(scratch, "pack")], {
    cwd: repository,
    logs,
    env: { npm_config_update_notifier: "false", npm_config_fund: "false", npm_config_audit: "false" },
  });
  const [pack] = JSON.parse(packOutput.slice(packOutput.indexOf("[")));
  const tarball = join(scratch, "pack", pack.filename);
  console.log(`tarball ${pack.filename}: ${pack.size} bytes packed (${mebibytes(pack.size)}), ${pack.unpackedSize} bytes unpacked (${mebibytes(pack.unpackedSize)}), ${pack.entryCount} files`);
  pass(`npm pack: ${mebibytes(pack.size)} packed, ${mebibytes(pack.unpackedSize)} unpacked, ${pack.entryCount} files`);
  requireThat(!existsSync(join(repository, "Libraries", ".Dependencies.full")), "postpack did not restore Libraries/Dependencies");
  pass("postpack restored Libraries/Dependencies");

  step("Check the tarball");
  await run("extract", "tar", ["-xzf", tarball, "-C", join(scratch, "extract")], { cwd: scratch, logs });
  const packageDirectory = join(scratch, "extract", "package");
  const files = walk(packageDirectory);
  const has = (path) => files.includes(path);

  for (const path of CORE.required) requireThat(has(`Libraries/TehreerCore/${path}`), `Core file missing from the package: ${path}`);
  for (const dependency of DEPENDENCIES) {
    for (const path of dependency.required) {
      requireThat(has(`Libraries/Dependencies/${dependency.name}/${path}`), `${dependency.name} file missing from the package: ${path}`);
    }
    const prefix = `Libraries/Dependencies/${dependency.name}/`;
    const strays = files.filter((file) => file.startsWith(prefix) && !isAllowed(dependency, file.slice(prefix.length)));
    requireThat(strays.length === 0, `files outside the allowlist in ${dependency.name}: ${strays.slice(0, 5).join(", ")}`);
    requireThat(
      files.some((file) => file.startsWith(prefix) && /(^|\/)(licen[cs]e|copying)[^/]*$/i.test(file)),
      `no license file of ${dependency.name}`,
    );
  }
  pass("the package has the files Core's CMake project and TR_DEPS_DIR need, and a license file per dependency");

  const unwanted = files.filter((file) => /^Libraries\/TehreerCore\/(Tests|Demo)\//.test(file) || /(^|\/)\.git(\/|$)/.test(file) || /^(tests|example|scripts\/device)\//.test(file));
  requireThat(unwanted.length === 0, `unwanted files in the package: ${unwanted.slice(0, 5).join(", ")}`);
  pass("no Core tests, demo, .git, tests/ or example/ in the package");

  const patterns = podspecPatterns(readFileSync(join(packageDirectory, "tehreer-react-native.podspec"), "utf8"));
  requireThat(patterns.length > 20, "found no podspec source patterns");
  const unmatched = patterns.filter((pattern) => !files.some((file) => matchesGlob(file, pattern)));
  requireThat(unmatched.length === 0, `podspec paths without a file in the package: ${unmatched.join(", ")}`);
  pass(`all ${patterns.length} source paths and globs of the podspec match files of the package`);

  const androidCMake = readFileSync(join(packageDirectory, "android", "CMakeLists.txt"), "utf8");
  requireThat(/set\(TR_DEPS_DIR "\$\{TEHREER_ROOT\}\/Libraries\/Dependencies"/.test(androidCMake), "android/CMakeLists.txt no longer points TR_DEPS_DIR at Libraries/Dependencies");
  for (const glob of ["cpp/*.cpp", "cpp/runtime/*.cpp", "cpp/generated/*.cpp"]) {
    requireThat(files.some((file) => matchesGlob(file, glob)), `android/CMakeLists.txt globs ${glob}, which matches nothing`);
  }
  pass("android/CMakeLists.txt finds TR_DEPS_DIR and its source globs in the package");

  if (options.cmake) {
    step("Core and its dependencies, built with their own CMake project from the package");
    const build = join(scratch, "cmake-core");
    await run("cmake-configure", "cmake", [
      "-S", join(packageDirectory, "Libraries", "TehreerCore"), "-B", build,
      `-DTR_DEPS_DIR=${join(packageDirectory, "Libraries", "Dependencies")}`, "-DCMAKE_BUILD_TYPE=Release",
      "-DFT_DISABLE_ZLIB=ON", "-DFT_DISABLE_BZIP2=ON", "-DFT_DISABLE_PNG=ON", "-DFT_DISABLE_HARFBUZZ=ON",
    ], { cwd: scratch, logs });
    await run("cmake-build", "cmake", ["--build", build, "--target", "Tehreer", "--parallel", "8"], { cwd: scratch, logs });
    requireThat(existsSync(join(build, "libTehreer.a")) || walk(build).some((file) => file.endsWith("libTehreer.a")), "libTehreer.a was not built");
    pass("host CMake configure and build of the Tehreer target from the package");
  }

  if (options.android || options.ios) {
    step("Copy of the example app with the packed library");
    const example = join(scratch, "example");
    const skipped = /(^|\/)(android\/(build|app\/build|\.gradle|\.cxx|app\/\.cxx)|ios\/(Pods|build)|\.git)$/;
    cpSync(join(repository, "example"), example, {
      recursive: true,
      mode: constants.COPYFILE_FICLONE,
      verbatimSymlinks: true,
      filter: (source) => !skipped.test(source.slice(join(repository, "example").length + 1)),
    });
    const installed = join(example, "node_modules", "tehreer-react-native");
    rmSync(installed, { recursive: true, force: true });
    cpSync(packageDirectory, installed, { recursive: true, verbatimSymlinks: true });
    requireThat(!existsSync(join(installed, "node_modules")), "unexpected node_modules in the package");
    pass("example/ copied, node_modules/tehreer-react-native is the extracted tarball");

    if (options.android) await buildAndroid(example, installed, logs);
    if (options.ios) await buildIos(example, logs);
  }
}

async function buildAndroid(example, installed, logs) {
  step(`Android: gradlew :app:assembleDebug (${options.abi})`);
  const sdk = process.env["ANDROID_HOME"] ?? process.env["ANDROID_SDK_ROOT"] ?? join(homedir(), "Library", "Android", "sdk");
  if (!existsSync(sdk)) {
    console.log(`skip  Android SDK not found at ${sdk}`);
    return;
  }
  const gradle = ["--no-daemon", "-PreactNativeArchitectures=" + options.abi, ":app:assembleDebug"];
  if (!options.online) gradle.unshift("--offline");
  await run("gradle", "./gradlew", gradle, {
    cwd: join(example, "android"),
    logs,
    env: { ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk },
  });

  const apks = walk(join(example, "android", "app", "build", "outputs", "apk")).filter((file) => file.endsWith(".apk"));
  requireThat(apks.length > 0, "no APK was built");
  const listing = spawnSync("unzip", ["-l", join(example, "android", "app", "build", "outputs", "apk", apks[0] ?? "")], { encoding: "utf8" }).stdout;
  requireThat(listing.includes(`lib/${options.abi}/libappmodules.so`), `the APK has no lib/${options.abi}/libappmodules.so`);

  // The CMake build of the app must have compiled the sources of the packed library, not of the repository.
  const cxx = join(example, "android", "app", ".cxx");
  const commands = walk(cxx).filter((file) => file.endsWith("compile_commands.json")).map((file) => readFileSync(join(cxx, file), "utf8")).join("\n");
  // CMake records real paths (/private/var on macOS), and HarfBuzz is compiled file by file.
  const packed = realpathSync(installed);
  requireThat(commands.includes(`${packed}/Libraries/TehreerCore/Source/Tehreer.c`), "the CMake build did not compile the packed Core");
  requireThat(commands.includes(`${packed}/Libraries/Dependencies/harfbuzz/src/hb-blob.cc`), "the CMake build did not compile the packed HarfBuzz");
  requireThat(commands.includes(`${packed}/Libraries/Dependencies/freetype/src/base/ftbase.c`), "the CMake build did not compile the packed FreeType");
  requireThat(commands.includes(`${packed}/Libraries/Dependencies/SheenBidi/Source/SheenBidi.c`), "the CMake build did not compile the packed SheenBidi");
  requireThat(commands.includes(`${packed}/Libraries/Dependencies/libunibreak/src/linebreak.c`), "the CMake build did not compile the packed libunibreak");
  requireThat(!commands.includes(repository.replace(/\/$/, "") + "/Libraries"), "the CMake build read Libraries/ of the repository");
  pass(`Android ${options.abi} debug APK built from the packed library (libappmodules.so inside, CMake compiled node_modules/tehreer-react-native/Libraries/**)`);
}

async function buildIos(example, logs) {
  step("iOS: pod install");
  if (spawnSync("pod", ["--version"]).status !== 0) {
    console.log("skip  CocoaPods is not installed");
    return;
  }
  const env = { LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" };
  await run("pod-install", "pod", ["install", "--no-repo-update"], { cwd: join(example, "ios"), logs, env });
  const lock = readFileSync(join(example, "ios", "Podfile.lock"), "utf8");
  requireThat(lock.includes("tehreer-react-native"), "Podfile.lock has no tehreer-react-native");
  requireThat(lock.includes("node_modules/tehreer-react-native"), "the pod does not come from node_modules/tehreer-react-native");
  pass("pod install resolved tehreer-react-native from the packed node_modules copy");

  if (options.iosBuild) {
    step("iOS: xcodebuild of the pod for the simulator");
    await run("xcodebuild", "xcodebuild", [
      "-workspace", join(example, "ios", "TehreerExample.xcworkspace"), "-scheme", "tehreer-react-native",
      "-configuration", "Debug", "-sdk", "iphonesimulator", "-destination", "generic/platform=iOS Simulator",
      "ARCHS=arm64", "ONLY_ACTIVE_ARCH=YES", "CODE_SIGNING_ALLOWED=NO", "build",
    ], { cwd: join(example, "ios"), logs, env });
    pass("xcodebuild of the tehreer-react-native pod for the iOS simulator");
  }
}

let failed = false;
try {
  await main();
} catch (error) {
  failed = true;
  console.error(`\nFAILED: ${error instanceof Error ? error.message : String(error)}`);
} finally {
  // A failed `npm pack` can leave the filtered tree in place.
  try {
    restore(repository);
  } catch (error) {
    console.error(`could not restore Libraries/Dependencies: ${String(error)}`);
    failed = true;
  }
  if (!options.keep) rmSync(options.scratch, { recursive: true, force: true });
  else console.log(`scratch folder kept at ${options.scratch}`);
}

console.log(`\n${results.length} checks passed:`);
for (const message of results) console.log(`  - ${message}`);
if (failed) process.exit(1);
