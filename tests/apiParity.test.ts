import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = new URL("..", import.meta.url).pathname;
const headersDirectory = join(root, "Libraries/TehreerCore/Headers/Tehreer");
const document = readFileSync(join(root, "docs/api-parity.md"), "utf8");

// The public functions of Core are the declarations marked TR_PUBLIC. A full parse is the job of
// the generator; this test only needs the names, so a declaration is "TR_PUBLIC ... Name(".
function publicFunctions(source: string): string[] {
  const names: string[] = [];
  for (const match of source.matchAll(/^TR_PUBLIC\b[^;{]*?\b(TR\w+)\s*\(/gm)) {
    names.push(match[1] ?? "");
  }
  return names;
}

describe("docs/api-parity.md", { skip: !existsSync(headersDirectory) && "the Core submodule is not initialized" }, () => {
  const headers = readdirSync(headersDirectory).filter((name) => /^TR.*\.h$/.test(name)).sort();

  it("finds the public functions of Core", () => {
    const total = headers.reduce((sum, name) => sum + publicFunctions(readFileSync(join(headersDirectory, name), "utf8")).length, 0);
    assert.ok(total > 0);
  });

  for (const header of headers) {
    it(`lists every public function of ${header}`, () => {
      for (const name of publicFunctions(readFileSync(join(headersDirectory, header), "utf8"))) {
        assert.ok(document.includes(`| \`${name}\` |`), `${name} (${header}) has no row in docs/api-parity.md`);
      }
    });
  }

  it("lists no function that Core does not declare", () => {
    const declared = new Set(headers.flatMap((name) => publicFunctions(readFileSync(join(headersDirectory, name), "utf8"))));
    for (const match of document.matchAll(/^\| `(TR\w+)` \|/gm)) {
      const name = match[1] ?? "";
      assert.ok(declared.has(name), `${name} is in docs/api-parity.md but no header declares it`);
    }
  });
});
