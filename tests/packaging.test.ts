import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, matchesGlob } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import {
  BACKUP_NAME,
  CORE,
  DEPENDENCIES,
  isAllowed,
  listDependency,
  planDependencies,
  VendorError
} from "../scripts/packaging/Vendor.mjs";
import { podspecPatterns } from "../scripts/packaging/Podspec.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  files: string[];
  scripts: Record<string, string>;
};
const spec = (name: string) => {
  const found = DEPENDENCIES.find((candidate) => candidate.name === name);
  assert.ok(found, name);
  return found;
};

function withTempDir(body: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "packaging-test-"));
  try {
    body(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function write(base: string, path: string, content = "x\n") {
  mkdirSync(dirname(join(base, path)), { recursive: true });
  writeFileSync(join(base, path), content);
}

/** Writes the files a dependency needs (its `required` list and a license) plus `extra`. */
function writeDependency(base: string, name: string, extra: string[] = []) {
  const dependency = spec(name);
  const license = name === "SheenBidi" ? "LICENSE" : name === "freetype" ? "LICENSE.TXT" : "COPYING";
  for (const path of [...dependency.required, license, ...extra]) write(base, `${name}/${path}`);
}

/** A package folder that has Core and the four dependencies, each with files that must stay out. */
function makeRoot(base: string) {
  for (const path of CORE.required) write(base, `Libraries/TehreerCore/${path}`);
  write(base, "Libraries/TehreerCore/Tests/Fonts/Big.ttf");
  write(base, "Libraries/TehreerCore/Demo/Main.c");
  const junk = ["test/a.cc", "docs/guide.md", "util/tool.py", ".github/ci.yml", "src/generate.py", "README.md", "Makefile"];
  for (const dependency of DEPENDENCIES) {
    writeDependency(join(base, "Libraries", "Dependencies"), dependency.name, junk);
    write(join(base, "Libraries", "Dependencies"), `${dependency.name}/.git/HEAD`);
  }
  // A source file of each kind the builds read, so the tests can tell it from the junk.
  write(join(base, "Libraries", "Dependencies"), "harfbuzz/src/hb-extra.hh");
  write(join(base, "Libraries", "Dependencies"), "freetype/docs/FTL.TXT");
  write(join(base, "Libraries", "Dependencies"), "freetype/builds/unix/ftconfig.h.in");
}

function runVendor(base: string, command: string) {
  const result = spawnSync(process.execPath, [join(root, "scripts", "pack-vendor.mjs"), command, "--root", base], {
    encoding: "utf8"
  });
  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
}

function list(base: string, directory = join(base, "Libraries", "Dependencies")): string[] {
  const found: string[] = [];
  const visit = (relative: string) => {
    for (const entry of readdirSync(join(directory, relative), { withFileTypes: true })) {
      const path = relative === "" ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) visit(path);
      else found.push(path);
    }
  };
  visit("");
  return found.sort();
}

test("sources, headers and the files the CMake projects read are allowed", () => {
  const freetype = spec("freetype");
  for (const path of [
    "src/base/ftbase.c", "include/freetype/freetype.h", "include/ft2build.h", "CMakeLists.txt",
    "builds/unix/ftconfig.h.in", "builds/cmake/iOS.cmake", "src/autofit/afblue.h", "docs/FTL.TXT", "LICENSE.TXT"
  ]) {
    assert.equal(isAllowed(freetype, path), true, path);
  }
  const harfbuzz = spec("harfbuzz");
  for (const path of ["src/harfbuzz.cc", "src/hb-ot-layout.hh", "src/hb-features.h.in", "src/OT/Layout/GSUB/Ligature.hh", "src/ms-use/COPYING", "COPYING", "AUTHORS", "meson.build"]) {
    assert.equal(isAllowed(harfbuzz, path), true, path);
  }
  assert.equal(isAllowed(spec("SheenBidi"), "Source/Data/SBBidiTypeLookup.h"), true);
  assert.equal(isAllowed(spec("SheenBidi"), "NOTICE"), true);
  assert.equal(isAllowed(spec("libunibreak"), "src/linebreakdata.c"), true);
  assert.equal(isAllowed(spec("libunibreak"), "LICENCE"), true);
});

test("tests, docs, tools, scripts, data and git metadata are not allowed", () => {
  const unwanted: Record<string, string[]> = {
    freetype: ["tests/main.c", "docs/CHANGES", "src/tools/ftrandom/ftrandom.c.orig", "src/autofit/afblue.dat", "src/gzip/patches/freetype-zlib.diff", "builds/windows/vc2010/freetype.sln", ".git/HEAD", "README.git"],
    harfbuzz: ["test/api/test-buffer.cc", "util/hb-shape.cc", "perf/benchmark.cc", "docs/usermanual.xml", "src/gen-ucd-table.py", "src/ArabicPUATraditional.txt", "src/hb-ot-shaper-use-machine.rl", ".github/workflows/ci.yml", "README.md", "src/.git/config"],
    libunibreak: ["src/tests.c.in", "src/GraphemeBreakTest.txt", "src/generate_word_break.py", "doc/index.html", "src/Makefile.am"],
    SheenBidi: ["Tests/Main.cpp", "Tools/Parser/Parser.cpp", "Tests/Data/BidiTest.txt", "README.md", "Makefile", ".github/workflows/ci.yml"]
  };
  for (const [name, paths] of Object.entries(unwanted)) {
    for (const path of paths) assert.equal(isAllowed(spec(name), path), false, `${name}/${path}`);
  }
  // A license-named file is kept only next to the sources, never in a test folder.
  assert.equal(isAllowed(spec("harfbuzz"), "test/COPYING"), false);
  assert.equal(isAllowed(spec("SheenBidi"), "Tests/LICENSE"), false);
});

test("listing a dependency keeps its sources and licenses and drops the rest", () => {
  withTempDir((dir) => {
    writeDependency(dir, "harfbuzz", ["src/hb.hh", "src/hb-ot.cc", "test/x.cc", "docs/y.md", "src/z.py", "src/.git/x"]);
    const files = listDependency(spec("harfbuzz"), join(dir, "harfbuzz"));
    assert.ok(files.includes("src/hb.hh") && files.includes("src/hb-ot.cc") && files.includes("COPYING"));
    assert.deepEqual(files.filter((file) => /^(test|docs)\/|\.py$|\.git/.test(file)), []);
  });
});

test("a missing, empty or incomplete dependency is refused with a message that says what to do", () => {
  withTempDir((dir) => {
    assert.throws(() => listDependency(spec("freetype"), join(dir, "freetype")), (error: unknown) => {
      assert.ok(error instanceof VendorError);
      assert.match(error.message, /missing/);
      assert.match(error.message, /npm run setup/);
      return true;
    });
    mkdirSync(join(dir, "freetype"));
    assert.throws(() => listDependency(spec("freetype"), join(dir, "freetype")), /empty.*npm run setup/);
    mkdirSync(join(dir, "freetype", ".git"));
    write(dir, "freetype/.git/HEAD");
    assert.throws(() => listDependency(spec("freetype"), join(dir, "freetype")), /empty/, "only a .git folder is empty");
    write(dir, "freetype/CMakeLists.txt");
    assert.throws(() => listDependency(spec("freetype"), join(dir, "freetype")), /not a complete freetype checkout/);
  });
});

test("a dependency without any license file is refused", () => {
  withTempDir((dir) => {
    for (const path of spec("libunibreak").required) write(dir, `libunibreak/${path}`);
    assert.throws(() => listDependency(spec("libunibreak"), join(dir, "libunibreak")), /no license file/);
  });
});

test("planDependencies names every dependency of the podspec and of Core's CMake", () => {
  withTempDir((dir) => {
    makeRoot(dir);
    const plan = planDependencies(dir);
    assert.deepEqual(Object.keys(plan).sort(), ["SheenBidi", "freetype", "harfbuzz", "libunibreak"]);
    const coreCMake = readFileSync(join(root, "Libraries", "TehreerCore", "CMakeLists.txt"), "utf8");
    const foreach = /foreach\(DEPENDENCY ([^)]+)\)/.exec(coreCMake)?.[1]?.split(/\s+/).sort();
    assert.deepEqual(Object.keys(plan).sort(), foreach, "TR_DEPS_DIR loop of Core");
  });
});

test("prepack puts a filtered tree in place and postpack puts the full tree back", () => {
  withTempDir((dir) => {
    makeRoot(dir);
    const full = list(dir);

    const prepack = runVendor(dir, "prepack");
    assert.equal(prepack.status, 0, prepack.stderr);
    assert.equal(prepack.stdout, "", "stdout is left to npm --json");
    const filtered = list(dir);
    assert.ok(filtered.includes("harfbuzz/src/hb-extra.hh"));
    assert.ok(filtered.includes("freetype/docs/FTL.TXT"));
    assert.ok(filtered.includes("freetype/builds/unix/ftconfig.h.in"));
    assert.ok(filtered.includes("SheenBidi/LICENSE"));
    assert.deepEqual(filtered.filter((file) => /\/(test|docs\/guide|util|\.github|\.git)\b|\.py$|README|Makefile/.test(file)), []);
    assert.ok(existsSync(join(dir, "Libraries", BACKUP_NAME, "harfbuzz", "test", "a.cc")), "the full tree is kept");

    const postpack = runVendor(dir, "postpack");
    assert.equal(postpack.status, 0, postpack.stderr);
    assert.deepEqual(list(dir), full);
    assert.equal(existsSync(join(dir, "Libraries", BACKUP_NAME)), false);
    assert.equal(runVendor(dir, "postpack").status, 0, "postpack without a backup is a no-op");
  });
});

test("prepack after an interrupted run restores the full tree first and never filters twice", () => {
  withTempDir((dir) => {
    makeRoot(dir);
    const full = list(dir);
    assert.equal(runVendor(dir, "prepack").status, 0);
    // The second prepack finds the backup of the first and must still see the junk to drop.
    assert.equal(runVendor(dir, "prepack").status, 0);
    assert.equal(runVendor(dir, "postpack").status, 0);
    assert.deepEqual(list(dir), full);
  });
});

test("prepack fails with a clear message when Core is missing, and changes nothing", () => {
  withTempDir((dir) => {
    makeRoot(dir);
    rmSync(join(dir, "Libraries", "TehreerCore", "Source"), { recursive: true });
    const before = list(dir);
    const result = runVendor(dir, "prepack");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /git submodule update --init/);
    assert.deepEqual(list(dir), before);
    assert.equal(existsSync(join(dir, "Libraries", BACKUP_NAME)), false);
  });
});

test("prepack fails when Libraries/Dependencies is missing or empty", () => {
  withTempDir((dir) => {
    makeRoot(dir);
    rmSync(join(dir, "Libraries", "Dependencies"), { recursive: true });
    const missing = runVendor(dir, "prepack");
    assert.notEqual(missing.status, 0);
    assert.match(missing.stderr, /npm run setup/);

    mkdirSync(join(dir, "Libraries", "Dependencies"));
    const empty = runVendor(dir, "prepack");
    assert.notEqual(empty.status, 0);
    assert.match(empty.stderr, /npm run setup/);
    assert.equal(existsSync(join(dir, "Libraries", BACKUP_NAME)), false);
  });
});

test("prepack fails when one dependency is empty and leaves the full tree in place", () => {
  withTempDir((dir) => {
    makeRoot(dir);
    rmSync(join(dir, "Libraries", "Dependencies", "SheenBidi"), { recursive: true });
    mkdirSync(join(dir, "Libraries", "Dependencies", "SheenBidi"));
    const result = runVendor(dir, "prepack");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /SheenBidi/);
    assert.ok(existsSync(join(dir, "Libraries", "Dependencies", "harfbuzz", "test", "a.cc")));
  });
});

test("package.json packs Core by allowlist, packs Dependencies, and runs the hooks", () => {
  const files = manifest.files;
  assert.ok(!files.includes("Libraries/TehreerCore"), "the whole submodule (tests, fonts, demo) must not be packed");
  assert.ok(files.includes("Libraries/Dependencies"));
  assert.ok(!files.some((entry) => /Tests|Demo/.test(entry)));
  for (const path of CORE.required) {
    const covered = files.some((entry) => `Libraries/TehreerCore/${path}` === entry || `Libraries/TehreerCore/${path}`.startsWith(`${entry}/`));
    assert.ok(covered, `${path} of Core is not covered by files`);
  }
  assert.match(manifest.scripts["prepack"] ?? "", /pack-vendor\.mjs prepack/);
  assert.match(manifest.scripts["postpack"] ?? "", /pack-vendor\.mjs postpack/);
  assert.match(manifest.scripts["test:packed"] ?? "", /test-packed\.mjs/);
});

interface PackedFile {
  path: string;
}

function dryRunPack(cwd: string): { files: string[]; stderr: string } {
  const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, npm_config_update_notifier: "false", npm_config_fund: "false", npm_config_audit: "false" },
    maxBuffer: 64 * 1024 * 1024
  });
  assert.equal(result.status, 0, result.stderr);
  const [pack] = JSON.parse(result.stdout) as { files: PackedFile[] }[];
  assert.ok(pack);
  return { files: pack.files.map((file) => file.path), stderr: result.stderr };
}

/** Copies what `npm pack` of this package reads into a scratch folder, so the real tree is not swapped. */
function copyPackage(target: string, dependencies: boolean) {
  const skip = (source: string) => !/(^|\/)(\.git|node_modules)(\/|$)/.test(source.slice(root.length));
  for (const entry of ["package.json", "tehreer-react-native.podspec", "react-native.config.cjs", "LICENSE", "NOTICE", "android", "cpp", "ios", "scripts/pack-vendor.mjs", "scripts/packaging"]) {
    cpSync(join(root, entry), join(target, entry), { recursive: true, filter: skip });
  }
  cpSync(join(root, "Libraries", "TehreerCore"), join(target, "Libraries", "TehreerCore"), { recursive: true, filter: skip });
  if (dependencies) cpSync(join(root, "Libraries", "Dependencies"), join(target, "Libraries", "Dependencies"), { recursive: true, filter: skip });
  // Build output of a developer machine: the repository ignores it, but `files` would pack it.
  for (const path of ["android/build/outputs/x.aar", "android/.cxx/y.o", "android/.gradle/z.bin", "android/local.properties"]) write(target, path);
  // The repository ignores the folder; the package must contain it all the same.
  writeFileSync(join(target, ".gitignore"), "Libraries/Dependencies\nnode_modules\nbuild\n");
}

test("npm pack packs the dependencies although the repository ignores them, and nothing else", { skip: !existsSync(join(root, "Libraries", "Dependencies", "freetype", "CMakeLists.txt")) }, () => {
  withTempDir((dir) => {
    copyPackage(dir, true);
    const full = list(dir);
    const { files } = dryRunPack(dir);

    // The podspec and android/CMakeLists.txt read these paths.
    for (const required of [
      "Libraries/TehreerCore/Source/Tehreer.c",
      "Libraries/TehreerCore/Headers/Tehreer/Tehreer.h",
      "Libraries/TehreerCore/CMakeLists.txt",
      "Libraries/TehreerCore/LICENSE",
      "Libraries/Dependencies/freetype/src/base/ftbase.c",
      "Libraries/Dependencies/freetype/include/ft2build.h",
      "Libraries/Dependencies/freetype/CMakeLists.txt",
      "Libraries/Dependencies/freetype/docs/FTL.TXT",
      "Libraries/Dependencies/harfbuzz/src/harfbuzz.cc",
      "Libraries/Dependencies/harfbuzz/CMakeLists.txt",
      "Libraries/Dependencies/harfbuzz/COPYING",
      "Libraries/Dependencies/libunibreak/src/linebreak.c",
      "Libraries/Dependencies/libunibreak/LICENCE",
      "Libraries/Dependencies/SheenBidi/Source/SheenBidi.c",
      "Libraries/Dependencies/SheenBidi/Headers/SheenBidi/SheenBidi.h",
      "Libraries/Dependencies/SheenBidi/LICENSE",
      "Libraries/Dependencies/SheenBidi/NOTICE",
      "tehreer-react-native.podspec",
      "android/CMakeLists.txt",
      "NOTICE"
    ]) {
      assert.ok(files.includes(required), `${required} is not packed`);
    }

    const dependencyFiles = files.filter((path) => path.startsWith("Libraries/Dependencies/"));
    assert.ok(dependencyFiles.length > 500);
    const stray = dependencyFiles.filter((path) => {
      const [, , name, ...rest] = path.split("/");
      return !isAllowed(spec(name ?? ""), rest.join("/"));
    });
    assert.deepEqual(stray, [], "only sources and license files of the dependencies are packed");
    assert.deepEqual(files.filter((path) => /^android\/(build\/|\.cxx|\.gradle|local\.properties)/.test(path)), [], "build output of android/");
    assert.deepEqual(files.filter((path) => /(^|\/)(\.git|\.gitignore|node_modules|Tests|Demo)(\/|$)/.test(path)), []);
    assert.deepEqual(files.filter((path) => path.startsWith("Libraries/TehreerCore/") && !/^Libraries\/TehreerCore\/(Headers|Source)\//.test(path)).sort(), [
      "Libraries/TehreerCore/CMakeLists.txt",
      "Libraries/TehreerCore/LICENSE",
      "Libraries/TehreerCore/NOTICE",
      "Libraries/TehreerCore/Tehreer.cmake.in",
      "Libraries/TehreerCore/tehreer.pc.in"
    ]);

    // The hooks ran and left the full tree where it was.
    assert.deepEqual(list(dir), full);
    assert.equal(existsSync(join(dir, "Libraries", BACKUP_NAME)), false);
  });
});

test("every file the podspec lists is in the plan or in Core's allowlist", { skip: !existsSync(join(root, "Libraries", "Dependencies", "freetype", "CMakeLists.txt")) }, () => {
  const plan = planDependencies(root);
  const packed = new Set<string>();
  for (const [name, files] of Object.entries(plan)) for (const file of files) packed.add(`Libraries/Dependencies/${name}/${file}`);
  const core = (path: string) => manifest.files.filter((entry) => entry.startsWith("Libraries/TehreerCore")).some((entry) => path === entry || path.startsWith(`${entry}/`));
  const coreFiles = (directory: string): string[] =>
    readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) =>
      entry.isDirectory() ? coreFiles(`${directory}/${entry.name}`) : [`${directory}/${entry.name}`]
    );
  for (const file of coreFiles("Libraries/TehreerCore").filter(core)) packed.add(file);

  const podspec = readFileSync(join(root, "tehreer-react-native.podspec"), "utf8");
  const patterns = podspecPatterns(podspec);
  assert.ok(patterns.length > 20, "the podspec patterns were not found");
  for (const pattern of patterns) {
    const matches = [...packed].some((file) => matchesGlob(file, pattern));
    assert.ok(matches, `nothing packed matches ${pattern} of the podspec`);
  }
});
