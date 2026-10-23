import assert from "node:assert/strict";
import { inflateSync } from "node:zlib";
import { test } from "node:test";
import type * as PngApi from "./device/png.js";

// png.ts imports nothing, so node strips its types and runs it as it is (the variable keeps tsc
// from asking for a `.ts` extension in the specifier).
const source = "./device/png.ts";
const { encodePng, toBase64 } = (await import(source)) as typeof PngApi;

// The visual check of the example app encodes what the native painters drew as a PNG, so that an
// Image can show it. Node's zlib is the reference decoder here.

function decode(png: Uint8Array): { width: number; height: number; rgba: Uint8Array } {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  let offset = 8;
  let width = 0;
  let height = 0;
  const data: Uint8Array[] = [];
  while (offset < png.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    const body = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = new DataView(body.buffer, body.byteOffset).getUint32(0);
      height = new DataView(body.buffer, body.byteOffset).getUint32(4);
    } else if (type === "IDAT") {
      data.push(body);
    }
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const rgba = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row++) {
    assert.equal(raw[row * (width * 4 + 1)], 0, "filter none");
    rgba.set(raw.subarray(row * (width * 4 + 1) + 1, (row + 1) * (width * 4 + 1)), row * width * 4);
  }
  return { width, height, rgba };
}

test("encodePng makes a PNG that zlib and the chunk checks accept, for sizes around the block limit", () => {
  for (const [width, height] of [[1, 1], [3, 2], [64, 64], [129, 130]] as const) {
    const rgba = new Uint8Array(width * height * 4).map((_, index) => (index * 31 + 7) & 0xff);
    const decoded = decode(encodePng(width, height, rgba));
    assert.equal(decoded.width, width);
    assert.equal(decoded.height, height);
    assert.deepEqual(decoded.rgba, rgba);
  }
});

test("toBase64 agrees with Buffer for every padding length", () => {
  for (let length = 0; length < 10; length++) {
    const bytes = Uint8Array.from({ length }, (_, index) => index * 37 + 5);
    assert.equal(toBase64(bytes), Buffer.from(bytes).toString("base64"));
  }
});
