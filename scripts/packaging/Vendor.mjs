// Decides which files of Libraries/Dependencies go into the npm package, and swaps a filtered copy
// in for the length of `npm pack`. Used by scripts/pack-vendor.mjs (the prepack and postpack hooks).
//
// Why a swap and not a copy to another folder: the podspec and android/CMakeLists.txt read
// Libraries/Dependencies/<name>, and npm packs paths as they are, so the packed layout can only
// equal the repo layout if the filtered tree takes the place of the full one while npm runs.
// Libraries/TehreerCore is a tracked submodule and is never touched: its allowlist is the `files`
// field of package.json (the node tests keep the two in step), and `check` verifies it exists.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, posix, sep } from "node:path";

/** What the C and C++ builds read: sources, headers, and the textual includes that sit next to them. */
const CODE = [".c", ".cc", ".cpp", ".h", ".hh", ".hpp", ".inc"];

// The names under which the dependencies keep their license, notice and authors files.
const LICENSE_NAME = /^(licen[cs]e|copying|notice|authors)(\.[a-z]+)?$/i;

/**
 * Allowlist of one dependency. `files` are exact paths below the dependency, `trees` are folders
 * from which files with the given extensions are taken, `required` are paths whose absence means
 * the checkout is not the dependency (or is a truncated one). A file named like a license (see
 * LICENSE_NAME) is taken from the root of the dependency and from inside every tree.
 *
 * The lists come from reading what the CMake projects of the dependencies and Core read when
 * TR_DEPS_DIR is set (file(READ), configure_file, include, add_subdirectory) and what the podspec
 * compiles; the packed build test (scripts/test-packed.mjs) is what proves they are complete.
 */
export const DEPENDENCIES = [
  {
    name: "freetype",
    files: [
      "CMakeLists.txt",
      // CMakeLists.txt includes CPack, which fails the configure when its description file
      // (README) is not there.
      "README",
      "docs/FTL.TXT",
      "docs/GPLv2.TXT",
      // Read by CMakeLists.txt: the version (configure.raw), the generated ftconfig.h and the
      // system layer it picks per platform.
      "builds/unix/configure.raw",
      "builds/unix/ftconfig.h.in",
      "builds/unix/freetype2.in",
      "builds/unix/ftsystem.c",
      "builds/windows/ftsystem.c",
      "builds/windows/ftdebug.c",
      "builds/wince/ftdebug.c",
      "builds/mac/freetype-Info.plist",
      "builds/cmake/FindBrotliDec.cmake",
      "builds/cmake/FindHarfBuzz.cmake",
      "builds/cmake/iOS.cmake",
      "src/base/ftver.rc",
    ],
    trees: [
      { dir: "include", extensions: CODE },
      { dir: "src", extensions: CODE },
    ],
    required: ["CMakeLists.txt", "include/ft2build.h", "src/base/ftbase.c", "builds/unix/configure.raw"],
  },
  {
    name: "harfbuzz",
    files: ["CMakeLists.txt", "meson.build", "replace-enum-strings.cmake"],
    // The .in files are templates that CMakeLists.txt reads (hb-features.h.in, the .pc files).
    trees: [{ dir: "src", extensions: [...CODE, ".in"] }],
    required: ["CMakeLists.txt", "meson.build", "src/harfbuzz.cc", "src/hb.h"],
  },
  {
    name: "libunibreak",
    files: [],
    trees: [{ dir: "src", extensions: [".c", ".h"] }],
    required: ["src/linebreak.c", "src/linebreak.h"],
  },
  {
    name: "SheenBidi",
    files: ["CMakeLists.txt", "SheenBidi.cmake.in", "sheenbidi.pc.in"],
    trees: [
      { dir: "Headers", extensions: CODE },
      { dir: "Source", extensions: CODE },
    ],
    required: ["CMakeLists.txt", "Headers/SheenBidi/SheenBidi.h", "Source/SheenBidi.c"],
  },
];

/** Files of Libraries/TehreerCore that the packed builds need, which the `files` field lists. */
export const CORE = {
  name: "TehreerCore",
  required: [
    "CMakeLists.txt",
    "Tehreer.cmake.in",
    "tehreer.pc.in",
    "LICENSE",
    "NOTICE",
    "Headers/Tehreer/Tehreer.h",
    "Source/Tehreer.c",
  ],
};

/** The folder that holds the full tree while the filtered one is in place. */
export const BACKUP_NAME = ".Dependencies.full";

/** An error that is meant for the person running npm: the message says what to do. */
export class VendorError extends Error {
  constructor(message) {
    super(message);
    this.name = "VendorError";
  }
}

function hasExtension(path, extensions) {
  const dot = path.lastIndexOf(".");
  return dot > path.lastIndexOf("/") && extensions.includes(path.slice(dot));
}

/**
 * Whether the file at `path` (relative to the dependency, with `/` separators) goes into the
 * package.
 */
export function isAllowed(spec, path) {
  if (path.split("/").some((part) => part === ".git" || part === "")) return false;
  if (spec.files.includes(path)) return true;

  const directory = posix.dirname(path);
  const inTree = spec.trees.some(
    (tree) => path.startsWith(`${tree.dir}/`) && hasExtension(path, tree.extensions)
  );
  if (inTree) return true;

  const licensed = directory === "." || spec.trees.some((tree) => directory === tree.dir || directory.startsWith(`${tree.dir}/`));
  return licensed && LICENSE_NAME.test(posix.basename(path));
}

/** Every regular file below `directory`, as paths with `/` separators relative to it, sorted. */
function walk(directory, prefix = "") {
  const found = [];
  for (const entry of readdirSync(join(directory, prefix), { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    // Symbolic links are not followed or packed: the dependencies have none that a build reads.
    if (entry.isDirectory()) found.push(...walk(directory, path));
    else if (entry.isFile()) found.push(path);
  }
  return found.sort();
}

function isDirectory(path) {
  return existsSync(path) && statSync(path).isDirectory();
}

/**
 * The allowlisted files of one dependency checkout. Throws a VendorError when the folder is
 * missing, empty, is not the dependency, or has no license file to keep with the sources.
 */
export function listDependency(spec, directory) {
  if (!isDirectory(directory)) {
    throw new VendorError(
      `${directory} is missing. Run \`npm run setup\` (scripts/fetch-deps) to fetch the sources of ${spec.name}.`
    );
  }
  const all = walk(directory);
  if (all.length === 0) {
    throw new VendorError(`${directory} is empty. Run \`npm run setup\` (scripts/fetch-deps).`);
  }
  for (const path of spec.required) {
    if (!all.includes(path)) {
      throw new VendorError(
        `${directory} has no ${path}, so it is not a complete ${spec.name} checkout. Run \`npm run setup\` (scripts/fetch-deps).`
      );
    }
  }
  const files = all.filter((path) => isAllowed(spec, path));
  if (!files.some((path) => LICENSE_NAME.test(posix.basename(path)) || /^docs\/(FTL|GPLv2)\.TXT$/.test(path))) {
    throw new VendorError(`${directory} has no license file; it must not be packed without one.`);
  }
  return files;
}

/** Checks the Core submodule files that the packed builds read. */
export function checkCore(root) {
  const directory = join(root, "Libraries", CORE.name);
  for (const path of CORE.required) {
    if (!existsSync(join(directory, ...path.split("/")))) {
      throw new VendorError(
        `${join(directory, path)} is missing. Run \`git submodule update --init\` to fetch Tehreer Core.`
      );
    }
  }
}

/** `{ [name]: files }` for all four dependencies of `root` (the package folder). */
export function planDependencies(root, directory = join(root, "Libraries", "Dependencies")) {
  if (!isDirectory(directory)) {
    throw new VendorError(
      `${directory} is missing. Run \`npm run setup\` (scripts/fetch-deps) to fetch FreeType, HarfBuzz, libunibreak and SheenBidi.`
    );
  }
  const plan = {};
  for (const spec of DEPENDENCIES) plan[spec.name] = listDependency(spec, join(directory, spec.name));
  return plan;
}

function copyPlan(plan, from, to) {
  let count = 0;
  let bytes = 0;
  for (const [name, files] of Object.entries(plan)) {
    for (const path of files) {
      const source = join(from, name, ...path.split("/"));
      const target = join(to, name, ...path.split("/"));
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(source, target);
      count += 1;
      bytes += statSync(source).size;
    }
  }
  return { count, bytes };
}

/**
 * Puts a filtered copy of Libraries/Dependencies in place and keeps the full tree next to it.
 * A backup left by an interrupted run is restored first, so the full tree is never lost and never
 * filtered twice. Returns the number of files and bytes copied.
 */
export function stage(root) {
  const libraries = join(root, "Libraries");
  const dependencies = join(libraries, "Dependencies");
  const backup = join(libraries, BACKUP_NAME);

  checkCore(root);
  restore(root);
  const plan = planDependencies(root);

  const filtered = join(libraries, ".Dependencies.filtered");
  rmSync(filtered, { recursive: true, force: true });
  try {
    const summary = copyPlan(plan, dependencies, filtered);
    renameSync(dependencies, backup);
    renameSync(filtered, dependencies);
    return summary;
  } catch (error) {
    // Whatever failed, leave Libraries/Dependencies as it was found.
    rmSync(filtered, { recursive: true, force: true });
    if (!isDirectory(dependencies) && isDirectory(backup)) renameSync(backup, dependencies);
    throw error;
  }
}

/**
 * Puts the full tree back. Does nothing when no filtered copy is in place (the backup is the
 * only thing that marks one).
 */
export function restore(root) {
  const libraries = join(root, "Libraries");
  const dependencies = join(libraries, "Dependencies");
  const backup = join(libraries, BACKUP_NAME);
  if (!isDirectory(backup)) return false;

  rmSync(dependencies, { recursive: true, force: true });
  renameSync(backup, dependencies);
  return true;
}

/** `/`-separated form of a path, for messages and comparisons. */
export function toPosix(path) {
  return path.split(sep).join("/");
}
