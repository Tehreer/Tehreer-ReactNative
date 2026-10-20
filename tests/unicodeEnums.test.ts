import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import { test } from "node:test";
import { emitUnicodeEnums, GENERATED_MARKER, pascal, readMembers } from "../scripts/generator/unicodeEnums.mjs";
import { compileModules, importModule } from "./CompileModules.mjs";

const root = join(import.meta.dirname, "..");
const sheenBidi = join(root, "Libraries/Dependencies/SheenBidi");
const headers = join(sheenBidi, "Headers/SheenBidi");
const skipNoHeaders = existsSync(headers) ? false : "SheenBidi is not fetched (npm run setup)";

const BIDI = `enum {
    SBBidiTypeNil = 0x00,
    SBBidiTypeL   = 0x01,   /**< Strong: Left-to-Right */
    SBBidiTypeAL  = 0x03,   /**< Strong: Right-to-Left Arabic */
    SBBidiTypePDF = 0x17    /**< Format: Pop Directional Formatting */
};`;
const CATEGORY = `enum {
    SBGeneralCategoryNil = 0x00,
    SBGeneralCategoryLU  = 0x01, /**< Letter: Uppercase Letter */
    SBGeneralCategoryZS  = 0x17  /**< Separator: Space Separator */
};`;
const SCRIPT = `enum {
    SBScriptNil  = 0x00,
    SBScriptZINH = 0x01,    /**< Inherited */
    SBScriptNAGM = 0xa4,    /**< Nag_Mundari */
    SBScriptOLDI = 0x2B,    /**< Old_Italic */
};
#define SBScriptIsCommonOrInherited(s) ((s) == 1)`;

test("names are made of the words of a comment", () => {
  assert.equal(pascal("Left-to-Right Isolate"), "LeftToRightIsolate");
  assert.equal(pascal("Old_Italic"), "OldItalic");
  assert.equal(pascal("Nag_Mundari"), "NagMundari");
  assert.equal(pascal("Common"), "Common");
});

test("the members are the commented constants, with their values in capitals, in file order", () => {
  const afterColon = (comment: string) => comment.replace(/^[^:]*:\s*/, "");
  assert.deepEqual(readMembers(BIDI, "SBBidiType.h", "SBBidiType", afterColon), [
    { name: "LeftToRight", value: "0x01" },
    { name: "RightToLeftArabic", value: "0x03" },
    { name: "PopDirectionalFormatting", value: "0x17" },
  ]);
  assert.deepEqual(readMembers(SCRIPT, "SBScript.h", "SBScript", (comment) => comment), [
    { name: "Inherited", value: "0x01" },
    { name: "NagMundari", value: "0xA4" },
    { name: "OldItalic", value: "0x2B" },
  ]);
});

test("a header that changes shape stops the generator instead of producing less", () => {
  const same = (comment: string) => comment;
  assert.throws(() => readMembers("enum { SBXNil = 0 };", "SBX.h", "SBX", same), /no constants with the prefix SBX/);
  assert.throws(
    () => readMembers("SBXA = 0x01, /**< One */\nSBXB = 0x02, /**< One */", "SBX.h", "SBX", same),
    /same name/,
  );
  assert.throws(
    () => readMembers("SBXA = 0x01, /**< One */\nSBXB = 0x01, /**< Two */", "SBX.h", "SBX", same),
    /same value/,
  );
  assert.throws(() => emitUnicodeEnums({ bidiType: "", generalCategory: CATEGORY, script: SCRIPT }), /SBBidiType\.h/);
});

test("the output is a generated file of constant objects with the tag functions of Script", () => {
  const text = emitUnicodeEnums({ bidiType: BIDI, generalCategory: CATEGORY, script: SCRIPT });
  assert.ok(text.includes(GENERATED_MARKER));
  assert.ok(text.includes("export const BidiClass = {\n  LeftToRight: 0x01,"));
  assert.ok(text.includes("export type BidiClass = (typeof BidiClass)[keyof typeof BidiClass];"));
  // The category is named after the text behind the colon of its comment.
  assert.ok(text.includes("  UppercaseLetter: 0x01,\n  SpaceSeparator: 0x17,\n} as const;"));
  assert.ok(text.includes("export type Script = (typeof scriptValues)[keyof typeof scriptValues];"));
  assert.ok(text.includes("getOpenTypeTag(script: Script): SfntTag") && text.includes("getUnicodeTag(script: Script): SfntTag"));
  assert.ok(!/\benum\b/.test(text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "")), "only erasable syntax");
  assert.equal(emitUnicodeEnums({ bidiType: BIDI, generalCategory: CATEGORY, script: SCRIPT }), text, "the output is deterministic");
});

test("the checked-in enums are the ones the headers of SheenBidi make", { skip: skipNoHeaders }, () => {
  const read = (name: string) => readFileSync(join(headers, name), "utf8");
  const expected = emitUnicodeEnums({
    bidiType: read("SBBidiType.h"),
    generalCategory: read("SBGeneralCategory.h"),
    script: read("SBScript.h"),
  });
  assert.equal(readFileSync(join(root, "src/unicode/enums.ts"), "utf8"), expected, "run `npm run generate:unicode`");
});

test("the command line checks and writes", { skip: skipNoHeaders }, () => {
  const run = (...args: string[]) => spawnSync(process.execPath, [join(root, "scripts/generate-unicode-enums.mjs"), ...args], { encoding: "utf8" });
  const check = run("--check");
  assert.equal(check.status, 0, check.stderr);
  assert.match(check.stdout, /up to date/);

  // Another header set changes the output, which a check against the checked-in file must report.
  const fake = mkdtempSync(join(tmpdir(), "tehreer-sheenbidi-"));
  const directory = join(fake, "Headers/SheenBidi");
  spawnSync("mkdir", ["-p", directory]);
  for (const name of ["SBBidiType.h", "SBGeneralCategory.h", "SBScript.h"]) {
    writeFileSync(join(directory, name), readFileSync(join(headers, name), "utf8").replace("SBScriptARAB = 0x04,    /**< Arabic */", "SBScriptARAB = 0x04,    /**< Arabian */"));
  }
  const stale = run("--check", "--sheenbidi", fake);
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /stale/);

  assert.equal(run("--sheenbidi", join(fake, "missing")).status, 1);
  assert.equal(run("--nonsense").status, 1);
});

test("the enums have the values of SheenBidi's constants", { skip: skipNoHeaders }, async () => {
  const out = compileModules(["src/unicode/enums.ts"]);
  const enums = (await importModule(out, "unicode/enums.js")) as Record<string, Record<string, number>>;
  const text = ["SBBidiType.h", "SBGeneralCategory.h", "SBScript.h"].map((name) => readFileSync(join(headers, name), "utf8")).join("\n");
  const constant = (name: string) => Number(new RegExp(`\\b${name}\\s*=\\s*(0x[0-9A-Fa-f]+)`).exec(text)?.[1]);

  assert.equal(enums["BidiClass"]?.["LeftToRight"], constant("SBBidiTypeL"));
  assert.equal(enums["BidiClass"]?.["RightToLeftArabic"], constant("SBBidiTypeAL"));
  assert.equal(enums["BidiClass"]?.["WhiteSpace"], constant("SBBidiTypeWS"));
  assert.equal(enums["GeneralCategory"]?.["UppercaseLetter"], constant("SBGeneralCategoryLU"));
  assert.equal(enums["GeneralCategory"]?.["SpaceSeparator"], constant("SBGeneralCategoryZS"));
  assert.equal(enums["Script"]?.["Arabic"], constant("SBScriptARAB"));
  assert.equal(enums["Script"]?.["Latin"], constant("SBScriptLATN"));
  assert.equal(enums["Script"]?.["Common"], constant("SBScriptZYYY"));
  assert.equal(enums["Script"]?.["Inherited"], constant("SBScriptZINH"));
});
