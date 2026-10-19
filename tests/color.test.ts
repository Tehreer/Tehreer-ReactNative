import assert from "node:assert/strict";
import { test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";
import type { Color as ColorApi } from "../src/Color.js";

const out = compileModules(["src/Color.ts"]);
const { Color } = (await importModule(out, "Color.js")) as { Color: typeof ColorApi };

test("colors are unsigned 0xAARRGGBB", () => {
  assert.equal(Color.argb(255, 255, 255, 255), 0xffffffff);
  assert.equal(Color.argb(255, 0, 0, 0), 0xff000000);
  assert.equal(Color.argb(0x80, 0x12, 0x34, 0x56), 0x80123456);
  assert.ok(Color.argb(255, 1, 2, 3) > 0, "an opaque color must not turn negative");
  assert.equal(Color.rgb(1, 2, 3), 0xff010203);
});

test("channels outside 0..255 are masked", () => {
  assert.equal(Color.argb(0x1ff, 0x100, -1, 256), 0xff00ff00);
});

test("the channels of a color are read back", () => {
  const color = 0xf0a1b2c3;
  assert.deepEqual([Color.alpha(color), Color.red(color), Color.green(color), Color.blue(color)], [0xf0, 0xa1, 0xb2, 0xc3]);
});

test("parse understands #rgb, #rrggbb and #aarrggbb and returns unsigned values", () => {
  assert.equal(Color.parse("#fff"), 0xffffffff);
  assert.equal(Color.parse("#123456"), 0xff123456);
  assert.equal(Color.parse("#80ff0000"), 0x80ff0000);
  assert.equal(Color.parse("  #FF000000 "), 0xff000000);
  assert.throws(() => Color.parse("#12"), SyntaxError);
  assert.throws(() => Color.parse("#12345g"), SyntaxError);
});

test("toCss formats opaque and translucent colors", () => {
  assert.equal(Color.toCss(0xff102030), "rgb(16, 32, 48)");
  assert.equal(Color.toCss(Color.argb(0, 1, 2, 3)), "rgba(1, 2, 3, 0)");
});
