import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, before, test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";

// The props that TLabel and TTextView resolve before the native side sees them: defaults are Core's,
// the native `frameSettings` and `highlights` are plain numbers in a fixed order, and a bad range never
// reaches a native view.
let out = "";
let shared: typeof import("../src/views/shared.ts");
let links: typeof import("../src/views/Links.ts");

before(async () => {
  out = compileModules(["src/views/shared.ts", "src/views/Links.ts"]);
  shared = (await importModule(out, "views/shared.js")) as typeof shared;
  links = (await importModule(out, "views/Links.js")) as typeof links;
});
after(() => rmSync(out, { recursive: true, force: true }));

test("the defaults of the frame settings are Core's", () => {
  const settings = shared.resolveFrameSettings({});
  assert.deepEqual(settings, {
    maxLines: 0, textAlignment: 3, isTruncationEnabled: false, truncationMode: 0, truncationPlace: 2,
    extraLineSpacing: 0, lineHeightMultiplier: 1, isJustificationEnabled: false, justificationLevel: 1,
  });
});

test("maxLines is a whole number from 0, and the native settings keep the order of the C++ struct", () => {
  assert.equal(shared.resolveFrameSettings({ maxLines: -3 }).maxLines, 0);
  assert.equal(shared.resolveFrameSettings({ maxLines: 2.9 }).maxLines, 2);
  const flat = shared.toNativeSettings(shared.resolveFrameSettings({ maxLines: 2, isTruncationEnabled: true, extraLineSpacing: 1.5, isJustificationEnabled: true }));
  assert.deepEqual(flat, [2, 3, 1, 0, 2, 1.5, 1, 1, 1]);
});

test("a color is a signed 32-bit number for the native Int32 prop", () => {
  assert.equal(shared.toNativeColor(undefined, 0xff000000), -16777216);
  assert.equal(shared.toNativeColor("#ff0000", 0), 0xffff0000 | 0);
  assert.equal(shared.toNativeColor(0x80112233, 0), 0x80112233 | 0);
});

test("highlights are flattened with their color, and a bad range is refused before it reaches native code", () => {
  assert.deepEqual(shared.toNativeHighlights(undefined, undefined), []);
  assert.deepEqual(shared.toNativeHighlights([{ fromIndex: 1, toIndex: 4 }], 0x11223344), [1, 4, 0x11223344 | 0]);
  assert.deepEqual(shared.toNativeHighlights([{ fromIndex: 1, toIndex: 4, color: 0xff000000 }], 0x11223344), [1, 4, 0xff000000 | 0]);
  assert.equal(shared.toNativeHighlights([{ fromIndex: 0, toIndex: 0 }], undefined)[2], shared.DEFAULT_HIGHLIGHT_COLOR | 0);
  for (const [fromIndex, toIndex] of [[-1, 2], [3, 2], [Number.NaN, 2], [1, Number.POSITIVE_INFINITY], [1.5, 2]] as const) {
    assert.throws(() => shared.toNativeHighlights([{ fromIndex, toIndex }], undefined), RangeError);
  }
});

test("links are the runs that have a userData, and runs next to each other with the same one are one link", () => {
  const runs = [
    { length: 3, attributes: {} },
    { length: 2, attributes: { userData: 7 } },
    { length: 2, attributes: { userData: 7 } },
    { length: 1, attributes: { userData: 9 } },
    { length: 4, attributes: { userData: 0 } },
  ];
  const text = {
    length: runs.reduce((sum, run) => sum + run.length, 0),
    getAttributeRun(index: number) {
      let start = 0;
      for (const run of runs) {
        if (index < start + run.length) {
          return { attributes: run.attributes, length: start + run.length - index };
        }
        start += run.length;
      }
      return undefined;
    },
  };
  const found = links.findLinks(text as never);
  assert.deepEqual(found, [{ userData: 7, fromIndex: 3, toIndex: 7 }, { userData: 9, fromIndex: 7, toIndex: 8 }]);
  assert.equal(links.linkAt(found, 5)?.userData, 7);
  assert.equal(links.linkAt(found, 7)?.userData, 9);
  assert.equal(links.linkAt(found, 8), undefined);
  assert.equal(links.linkAt(found, undefined), undefined);
  assert.deepEqual(links.findLinks(undefined), []);
});
