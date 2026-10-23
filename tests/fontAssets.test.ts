import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, beforeEach, test } from "node:test";
import { compileModules, importModule } from "./CompileModules.mjs";

// FontFile.fromAsset decides between three ways to read a bundled font from the URI that React
// Native resolves: fetch the bytes (a debug build, served by Metro), open a file (a release build
// on iOS) or ask the native resolver for a copy of the resource (a release build on Android). The
// decision and its errors are checked here with a mock of React Native; that the real resolver
// and the real URIs work is checked by the device suite (example/tests/AssetTests.ts), in debug and
// release builds.

interface Source {
  readonly uri: string;
}

interface Host {
  resolveAssetSource(asset: number): Source | null;
  fetchBytes(uri: string): Promise<ArrayBuffer>;
  resolveNativeAsset: ((name: string) => Promise<string>) | undefined;
}

type Data = ({ bytes: ArrayBuffer } | { path: string }) & { uri: string };

interface FontFileInstance {
  readonly isDisposed: boolean;
  dispose(): void;
}

interface FontFileClass {
  fromAsset(asset: number | Source): Promise<FontFileInstance>;
  fromAssetOf(host: Host, asset: number | Source): Promise<FontFileInstance>;
}

let out: string;
let loadFontAsset: (host: Host, asset: unknown) => Promise<Data>;
let installAssetHost: (host: Host) => void;
let reactNativeAssetHost: Host;
let FontFile: FontFileClass;

const calls: string[] = [];
let sources: Map<number, Source>;
let responses: Map<string, ArrayBuffer | Error>;
let nativeFiles: Map<string, string | Error> | undefined;
let usable = true;
let nextId = 1;
const handles: { id: number; disposed: boolean }[] = [];

function host(overrides: Partial<Host> = {}): Host {
  return {
    resolveAssetSource(asset) {
      calls.push(`resolve ${asset}`);
      return sources.get(asset) ?? null;
    },
    async fetchBytes(uri) {
      calls.push(`fetch ${uri}`);
      const response = responses.get(uri);
      if (response === undefined || response instanceof Error) {
        throw response ?? new Error("The server answered with status 404.");
      }
      return response;
    },
    resolveNativeAsset: nativeFiles
      ? async (name) => {
          calls.push(`native ${name}`);
          const path = nativeFiles?.get(name);
          if (path === undefined || path instanceof Error) {
            throw path ?? new Error(`The app has no raw resource named '${name}'.`);
          }
          return path;
        }
      : undefined,
    ...overrides,
  };
}

async function rejects(promise: Promise<unknown>, pattern: RegExp, name = "Error"): Promise<Error> {
  try {
    await promise;
  } catch (e) {
    assert.ok(e instanceof Error, String(e));
    assert.match(e.message, pattern);
    assert.equal(e.name, name);
    return e;
  }
  throw new assert.AssertionError({ message: `expected a rejection matching ${pattern}` });
}

before(async () => {
  out = compileModules(["src/graphics/FontFile.ts", "src/internal/FontAssets.ts", "src/internal/ReactNativeAssetHost.ts"]);
  // `react-native` is Flow source that node cannot read; a stub next to the compiled sources takes
  // its place for the one test of the real host.
  const stub = join(out, "node_modules", "react-native");
  mkdirSync(stub, { recursive: true });
  writeFileSync(join(stub, "package.json"), '{"name":"react-native","type":"module","main":"index.js"}');
  writeFileSync(
    join(stub, "index.js"),
    `export const Image = { resolveAssetSource: (asset) => globalThis.__rnStub.sources.get(asset) };
export const TurboModuleRegistry = { get: (name) => globalThis.__rnStub.modules.get(name) ?? null };`,
  );

  ({ loadFontAsset, installAssetHost } = (await importModule(out, "internal/FontAssets.js")) as {
    loadFontAsset: typeof loadFontAsset;
    installAssetHost: typeof installAssetHost;
  });
  FontFile = ((await importModule(out, "graphics/FontFile.js")) as { FontFile: FontFileClass }).FontFile;

  (globalThis as Record<string, unknown>)["__tehreer"] = {
    disposeHandle(h: { disposed: boolean }) {
      h.disposed = true;
    },
    TRFontFileCreateFromMemory(data: ArrayBuffer, length: number) {
      calls.push(`memory ${length}`);
      return usable ? made() : undefined;
    },
    TRFontFileCreateFromPath(path: string) {
      calls.push(`path ${path}`);
      return usable ? made() : undefined;
    },
  };
});

function made() {
  const handle = { id: nextId++, disposed: false };
  handles.push(handle);
  return handle;
}

beforeEach(() => {
  calls.length = 0;
  handles.length = 0;
  sources = new Map();
  responses = new Map();
  nativeFiles = new Map();
  usable = true;
});

after(() => {
  delete (globalThis as Record<string, unknown>)["__tehreer"];
  delete (globalThis as Record<string, unknown>)["__rnStub"];
  rmSync(out, { recursive: true, force: true });
});

test("a debug build fetches the bytes of an http asset and calls nothing else", async () => {
  const bytes = new Uint8Array([1, 2, 3]).buffer;
  sources.set(7, { uri: "http://10.0.2.2:8081/assets/fonts/A.ttf?platform=android&hash=abc" });
  responses.set("http://10.0.2.2:8081/assets/fonts/A.ttf?platform=android&hash=abc", bytes);

  const data = await loadFontAsset(host(), 7);

  assert.deepEqual(data, { bytes, uri: "http://10.0.2.2:8081/assets/fonts/A.ttf?platform=android&hash=abc" });
  assert.deepEqual(calls, ["resolve 7", "fetch http://10.0.2.2:8081/assets/fonts/A.ttf?platform=android&hash=abc"]);
});

test("a file URL is a release build on iOS: its path is decoded and nothing is fetched", async () => {
  sources.set(1, { uri: "file:///var/containers/Bundle/My%20App.app/assets/assets/fonts/A%2B.ttf" });

  const data = await loadFontAsset(host(), 1);
  assert.deepEqual(data, {
    path: "/var/containers/Bundle/My App.app/assets/assets/fonts/A+.ttf",
    uri: "file:///var/containers/Bundle/My%20App.app/assets/assets/fonts/A%2B.ttf",
  });
  assert.deepEqual(calls, ["resolve 1"]);

  const local = await loadFontAsset(host(), { uri: "file://localhost/tmp/a.ttf" });
  assert.equal("path" in local && local.path, "/tmp/a.ttf");
  const absolute = await loadFontAsset(host(), { uri: "/data/user/0/app/files/a.ttf" });
  assert.equal("path" in absolute && absolute.path, "/data/user/0/app/files/a.ttf");
  assert.deepEqual(calls, ["resolve 1"]);
});

test("a bare resource name is a release build on Android: the native resolver gives the path", async () => {
  sources.set(2, { uri: "assets_fonts_robotoregularabc" });
  nativeFiles?.set("assets_fonts_robotoregularabc", "/data/user/0/app/cache/tehreer-assets/1/assets_fonts_robotoregularabc");

  const data = await loadFontAsset(host(), 2);

  assert.deepEqual(data, {
    path: "/data/user/0/app/cache/tehreer-assets/1/assets_fonts_robotoregularabc",
    uri: "assets_fonts_robotoregularabc",
  });
  assert.deepEqual(calls, ["resolve 2", "native assets_fonts_robotoregularabc"]);
});

test("an object with a uri skips the asset registry", async () => {
  responses.set("https://example.test/f.ttf", new ArrayBuffer(4));
  const data = await loadFontAsset(host(), { uri: "https://example.test/f.ttf" });
  assert.equal(data.uri, "https://example.test/f.ttf");
  assert.deepEqual(calls, ["fetch https://example.test/f.ttf"]);
});

test("a number that is not an asset says so", async () => {
  await rejects(loadFontAsset(host(), 99), /Could not load the font: 99 is not an asset/);
  sources.set(5, { uri: "" });
  await rejects(loadFontAsset(host(), 5), /5 is not an asset/);
  assert.deepEqual(calls, ["resolve 99", "resolve 5"]);
});

test("an argument that is neither a number nor an object with a uri is a TypeError", async () => {
  for (const bad of [undefined, null, "font.ttf", {}, { uri: 5 }, [], true]) {
    await rejects(loadFontAsset(host(), bad), /number from require\(\)/, "TypeError");
  }
  assert.deepEqual(calls, []);
});

test("a missing native resolver is reported with the asset name", async () => {
  nativeFiles = undefined;
  await rejects(
    loadFontAsset(host(), { uri: "assets_fonts_a" }),
    /Could not load the font asset assets_fonts_a: The native asset resolver is not linked/,
  );
});

test("a resource that the native resolver cannot find rejects with its message and cause", async () => {
  const error = await rejects(
    loadFontAsset(host(), { uri: "assets_fonts_gone" }),
    /Could not load the font asset assets_fonts_gone: The app has no raw resource named 'assets_fonts_gone'/,
  );
  assert.ok(error.cause instanceof Error);
});

test("a failed or empty download is an error that names the asset", async () => {
  responses.set("http://h/ok.ttf", new ArrayBuffer(0));
  await rejects(loadFontAsset(host(), { uri: "http://h/ok.ttf" }), /Could not load the font asset http:\/\/h\/ok\.ttf: The asset is empty/);
  await rejects(loadFontAsset(host(), { uri: "http://h/gone.ttf" }), /http:\/\/h\/gone\.ttf: The server answered with status 404/);
  responses.set("http://h/net.ttf", new Error("Network request failed"));
  await rejects(loadFontAsset(host(), { uri: "http://h/net.ttf" }), /http:\/\/h\/net\.ttf: Network request failed/);
});

test("a scheme that is not a file or a download, and a broken file URL, are refused", async () => {
  await rejects(loadFontAsset(host(), { uri: "content://x/font.ttf" }), /content:\/\/x\/font\.ttf: Only http\(s\), file and Android resource assets/);
  await rejects(loadFontAsset(host(), { uri: "file:///a/%E0%A4%A.ttf" }), /not a valid file URL/);
  assert.deepEqual(calls, []);
});

test("fromAssetOf reads downloaded bytes with fromBytes and a file with fromPath", async () => {
  responses.set("http://h/a.ttf", new Uint8Array(5).buffer);
  const downloaded = await FontFile.fromAssetOf(host(), { uri: "http://h/a.ttf" });
  const opened = await FontFile.fromAssetOf(host(), { uri: "file:///tmp/a%20b.ttf" });

  assert.deepEqual(calls, ["fetch http://h/a.ttf", "memory 5", "path /tmp/a b.ttf"]);
  assert.equal(handles.length, 2);
  assert.equal(downloaded.isDisposed, false);

  // The caller owns the file and disposes it like any other.
  downloaded.dispose();
  downloaded.dispose();
  assert.equal(downloaded.isDisposed, true);
  assert.equal(handles[0]?.disposed, true);
  assert.equal(opened.isDisposed, false);
  opened.dispose();
});

test("fromAssetOf names the asset when Core finds no usable font, and creates nothing", async () => {
  usable = false;
  responses.set("http://h/a.ttf", new Uint8Array(5).buffer);

  await rejects(FontFile.fromAssetOf(host(), { uri: "http://h/a.ttf" }), /Could not load the font asset http:\/\/h\/a\.ttf: The data does not contain a usable font/);
  await rejects(FontFile.fromAssetOf(host(), { uri: "file:///tmp/x.ttf" }), /Could not load the font asset file:\/\/\/tmp\/x\.ttf: The file does not contain a usable font: \/tmp\/x\.ttf/);
  assert.equal(handles.length, 0);
});

test("fromAsset needs initialize(), which installs the React Native host", async () => {
  await rejects(FontFile.fromAsset(3), /Tehreer is not initialized/);

  const rn = {
    sources: new Map<number, Source>([[3, { uri: "assets_fonts_b" }]]),
    modules: new Map<string, unknown>(),
  };
  (globalThis as Record<string, unknown>)["__rnStub"] = rn;
  // Importing the module reads the native module once, so it is imported after the stub exists.
  const resolved: string[] = [];
  rn.modules.set("NativeTehreerAssets", { resolveAsset: async (name: string) => (resolved.push(name), `/cache/${name}`) });
  ({ reactNativeAssetHost } = (await importModule(out, "internal/ReactNativeAssetHost.js")) as { reactNativeAssetHost: Host });
  installAssetHost(reactNativeAssetHost);

  const file = await FontFile.fromAsset(3);

  assert.deepEqual(resolved, ["assets_fonts_b"]);
  assert.deepEqual(calls, ["path /cache/assets_fonts_b"]);
  file.dispose();
  await rejects(FontFile.fromAsset(4), /4 is not an asset/);
  assert.match(
    (await import("node:fs")).readFileSync(join(import.meta.dirname, "../src/initialize.ts"), "utf8"),
    /installAssetHost\(reactNativeAssetHost\)/,
  );
});

test("the name of the asset module agrees in the spec and in Kotlin, and the package registers it", async () => {
  const { readFileSync } = await import("node:fs");
  const read = (path: string) => readFileSync(join(import.meta.dirname, "..", path), "utf8");
  const kotlin = "android/src/main/java/com/tehreer/reactnative";

  assert.match(read("src/specs/NativeTehreerAssets.ts"), /get<Spec>\("NativeTehreerAssets"\)/);
  assert.match(read("src/internal/ReactNativeAssetHost.ts"), /resolveAsset\(name\)/);
  assert.match(read(`${kotlin}/TehreerAssetsModule.kt`), /const val NAME = "NativeTehreerAssets"/);
  assert.match(read(`${kotlin}/TehreerAssetsModule.kt`), /override fun resolveAsset\(name: String, promise: Promise\)/);
  assert.match(read(`${kotlin}/TehreerPackage.kt`), /TehreerAssetsModule\.NAME/);
});
