// The prepack and postpack hooks of package.json: vendors the sources the native builds compile.
//
//   node scripts/pack-vendor.mjs prepack    checks Core, puts a filtered Libraries/Dependencies in place
//   node scripts/pack-vendor.mjs postpack   puts the full Libraries/Dependencies back
//   node scripts/pack-vendor.mjs check      checks that everything is there, changes nothing
//   node scripts/pack-vendor.mjs list       prints the files of the dependencies that would be packed
//
// The tarball must carry Core and the four dependencies because a consumer's pod install and Gradle
// build compile them and nothing may be downloaded then (see scripts/packaging/Vendor.mjs).
// Status goes to stderr: `npm pack --json` prints the lifecycle output on stdout next to its JSON.
// `--root <dir>` runs on another package folder, which the tests use.
import console from "node:console";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { checkCore, planDependencies, restore, stage, VendorError } from "./packaging/Vendor.mjs";

const args = process.argv.slice(2);
const command = args.shift();
let root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

while (args.length > 0) {
  const option = args.shift();
  if (option === "--root" && args.length > 0) root = resolve(String(args.shift()));
  else fail(`unknown argument '${option}'`);
}

function fail(message) {
  console.error(`pack-vendor: ${message}`);
  process.exit(1);
}

try {
  if (command === "prepack") {
    const { count, bytes } = stage(root);
    console.error(`pack-vendor: ${count} dependency files (${(bytes / 1048576).toFixed(1)} MiB) staged for packing`);
  } else if (command === "postpack") {
    console.error(restore(root) ? "pack-vendor: Libraries/Dependencies restored" : "pack-vendor: nothing to restore");
  } else if (command === "check") {
    checkCore(root);
    planDependencies(root);
    console.error("pack-vendor: Core and the dependencies are complete");
  } else if (command === "list") {
    checkCore(root);
    for (const [name, files] of Object.entries(planDependencies(root))) {
      for (const file of files) console.log(`Libraries/Dependencies/${name}/${file}`);
    }
  } else {
    fail("usage: pack-vendor.mjs <prepack|postpack|check|list> [--root <dir>]");
  }
} catch (error) {
  if (error instanceof VendorError) fail(error.message);
  throw error;
}
