import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { after, before, test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";

// The props that TLabel and TTextView resolve before the native side sees them: defaults are Core's,
// the renderer props are named as the properties of the renderer, and a bad highlight range is refused.
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

test("maxLines is a whole number from 0, and the settings are props of the native view by name", () => {
  assert.equal(shared.resolveFrameSettings({ maxLines: -3 }).maxLines, 0);
  assert.equal(shared.resolveFrameSettings({ maxLines: 2.9 }).maxLines, 2);
  assert.deepEqual(shared.resolveFrameSettings({ maxLines: 2, isTruncationEnabled: true, extraLineSpacing: 1.5, isJustificationEnabled: true }), {
    maxLines: 2, textAlignment: 3, isTruncationEnabled: true, truncationMode: 0, truncationPlace: 2,
    extraLineSpacing: 1.5, lineHeightMultiplier: 1, isJustificationEnabled: true, justificationLevel: 1,
  });
});

test("a color is a signed 32-bit number for the native Int32 prop", () => {
  assert.equal(shared.toNativeColor(undefined, 0xff000000), -16777216);
  assert.equal(shared.toNativeColor("#ff0000", 0), 0xffff0000 | 0);
  assert.equal(shared.toNativeColor(0x80112233, 0), 0x80112233 | 0);
});

test("the renderer props are named as the properties of the renderer, and only what is given is passed", () => {
  const none = shared.toNativeRenderer({});
  assert.equal(none.textColor, 0xff000000 | 0);
  assert.ok(Object.entries(none).filter(([name]) => name !== "textColor").every(([, value]) => value === undefined));
  const given = shared.toNativeRenderer({ textColor: "#80112233", drawStyle: 2, strokeColor: 0xff336699, strokeRadius: 1.5, shadowColor: "#66000000", shadowDy: -4 });
  assert.deepEqual(given, {
    textColor: 0x80112233 | 0, drawStyle: 2, strokeColor: 0xff336699 | 0, strokeRadius: 1.5, strokeCap: undefined, strokeJoin: undefined,
    strokeMiter: undefined, glyphShadowColor: 0x66000000, glyphShadowRadius: undefined, glyphShadowDx: undefined, glyphShadowDy: -4,
  });
});

test("highlights get their color, and a bad range is refused before it is drawn", () => {
  assert.deepEqual(shared.resolveHighlights(undefined, undefined), []);
  assert.deepEqual(shared.resolveHighlights([{ fromIndex: 1, toIndex: 4 }], 0x11223344), [{ fromIndex: 1, toIndex: 4, color: 0x11223344 }]);
  assert.equal(shared.resolveHighlights([{ fromIndex: 1, toIndex: 4, color: 0xff000000 }], 0x11223344)[0]?.color, 0xff000000);
  assert.equal(shared.resolveHighlights([{ fromIndex: 0, toIndex: 0 }], undefined)[0]?.color, shared.DEFAULT_HIGHLIGHT_COLOR);
  for (const [fromIndex, toIndex] of [[-1, 2], [3, 2], [Number.NaN, 2], [1, Number.POSITIVE_INFINITY], [1.5, 2]] as const) {
    assert.throws(() => shared.resolveHighlights([{ fromIndex, toIndex }], undefined), RangeError);
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
