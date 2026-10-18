import assert from "node:assert/strict";
import { test } from "node:test";

import { buildModel, GeneratorError } from "../scripts/generator/model.mjs";
import { parseHeader } from "../scripts/generator/parser.mjs";
import type { BindingPlan, Model, ModelConfig } from "../scripts/generator/types.mjs";

// The base types and the objects that the declarations below use.
const PRELUDE = `
  typedef uint8_t TRUInt8;
  typedef uint16_t TRGlyphID;
  typedef uint32_t TRUInt32;
  typedef uintptr_t TRUInteger;
  typedef float TRFloat;
  typedef TRUInt8 TRBoolean;
  typedef TRUInt32 TRStringEncoding;
  typedef struct _TRPoint { TRFloat x; TRFloat y; } TRPoint;
  typedef struct _TRRect { TRPoint origin; TRFloat width; } TRRect;
  typedef struct _TRStringView { const void *buffer; TRUInteger length; TRStringEncoding encoding; } TRStringView;
  typedef const struct _TRThing *TRThingRef;
  typedef struct _TRText *TRMutableTextRef;
  typedef const struct _TRText *TRTextRef;
  TR_PUBLIC TRThingRef TRThingRetain(TRThingRef thing);
  TR_PUBLIC void TRThingRelease(TRThingRef thing);
  TR_PUBLIC TRTextRef TRTextRetain(TRTextRef text);
  TR_PUBLIC void TRTextRelease(TRTextRef text);
  TR_PUBLIC TRStringEncoding TRTextGetEncoding(TRTextRef text);
`;

function config(overrides: Partial<ModelConfig> = {}): ModelConfig {
  return { excluded: new Set(), manual: new Set(), bounds: {}, scalarOuts: {}, ...overrides };
}

function build(declarations: string, overrides: Partial<ModelConfig> = {}): Model {
  const parsed = parseHeader(`${PRELUDE}\n${declarations}`, { publicMacro: "TR_PUBLIC", prefix: "TR" });
  return buildModel([{ file: "TRTest.h", parsed }], config(overrides));
}

function binding(declarations: string, name: string, overrides: Partial<ModelConfig> = {}): BindingPlan {
  const found = build(declarations, overrides).bindings.find((b) => b.name === name);
  assert.ok(found, `${name} is bound`);
  return found;
}

function kinds(plan: BindingPlan): string[] {
  return plan.params.map((p) => p.kind);
}

function failure(declarations: string, overrides: Partial<ModelConfig> = {}): string {
  try {
    build(declarations, overrides);
  } catch (error) {
    assert.ok(error instanceof GeneratorError, String(error));
    return error.message;
  }
  return assert.fail("the generator accepted a signature that it cannot express");
}

test("numbers, booleans, references and structs are read and returned by value", () => {
  const plan = binding("TR_PUBLIC TRFloat TRThingMeasure(TRThingRef thing, TRUInteger index, TRBoolean flag, TRPoint point);", "TRThingMeasure");
  assert.deepEqual(kinds(plan), ["ref", "number", "bool", "struct"]);
  assert.equal(plan.returns.k, "number");
  assert.equal(plan.result.mode, "value");
});

test("Create and Copy give owned references, Get gives borrowed ones, and anything else is refused", () => {
  const source = `
    TR_PUBLIC TRThingRef TRThingCreate(void);
    TR_PUBLIC TRThingRef TRThingCreateCopy(TRThingRef thing);
    TR_PUBLIC TRThingRef TRThingGetParent(TRThingRef thing);
  `;
  assert.equal(binding(source, "TRThingCreate").returns["ownership"], "owned");
  assert.equal(binding(source, "TRThingCreateCopy").returns["ownership"], "owned");
  assert.equal(binding(source, "TRThingGetParent").returns["ownership"], "borrowed");
  assert.equal(binding(source, "TRThingRetain").returns["ownership"], "owned");

  const message = failure("TR_PUBLIC TRThingRef TRThingFind(TRThingRef thing);");
  assert.match(message, /TRThingFind/);
  assert.match(message, /ownership is unknown/);
});

test("Release is not bound, as a handle releases its own reference", () => {
  const model = build("TR_PUBLIC TRThingRef TRThingCreate(void);");
  assert.ok(!model.bindings.some((b) => b.name === "TRThingRelease"));
  assert.ok(model.releases.includes("TRThingRelease"));
  assert.ok(model.bindings.some((b) => b.name === "TRThingRetain"));
});

test("a mutable and a constant reference to one struct share a group", () => {
  const model = build("TR_PUBLIC void TRTextBegin(TRMutableTextRef text);");
  const groups = Object.fromEntries(model.refs.map((ref) => [ref.name, ref.group]));
  assert.equal(groups["TRMutableTextRef"], "TRText");
  assert.equal(groups["TRTextRef"], "TRText");
});

test("an out parameter becomes part of the result, and a boolean makes it optional", () => {
  const flagged = binding("TR_PUBLIC TRBoolean TRThingGetDistance(TRThingRef thing, TRUInteger index, TRFloat *distance);", "TRThingGetDistance", { scalarOuts: { TRThingGetDistance: ["distance"] } });
  assert.deepEqual(kinds(flagged), ["ref", "number", "out"]);
  assert.equal(flagged.result.mode, "success");
  assert.deepEqual(flagged.params.filter((p) => p.js).map((p) => p.name), ["thing", "index"]);

  const box = binding("TR_PUBLIC void TRThingGetBox(TRThingRef thing, TRRect *box);", "TRThingGetBox", { scalarOuts: { TRThingGetBox: ["box"] } });
  assert.equal(box.result.mode, "outputs");
  assert.equal(box.params[1]?.descriptor?.k, "struct");

  const mixed = binding("TR_PUBLIC TRThingRef TRThingCopyPart(TRThingRef thing, TRUInteger index, TRUInteger *outLength);", "TRThingCopyPart", { scalarOuts: { TRThingCopyPart: ["outLength"] } });
  assert.equal(mixed.result.mode, "object");
  assert.deepEqual(mixed.outputs.map((o) => o.key), ["outLength"]);
});

test("a constant array with a count is checked against its buffer", () => {
  const plan = binding("TR_PUBLIC TRFloat TRThingRun(TRThingRef thing, const TRGlyphID *glyphIDs, const TRFloat *advances, TRUInteger count);", "TRThingRun");
  assert.deepEqual(kinds(plan), ["ref", "inBuffer", "inBuffer", "number"]);
  assert.equal(plan.params[1]?.["count"], "{count}");
  assert.equal(plan.params[1]?.["unit"], "sizeof(TRGlyphID)");
});

test("an array of structs is converted element by element, and a lone struct pointer is optional", () => {
  const plan = binding("TR_PUBLIC void TRThingPlace(TRThingRef thing, const TRPoint *offsets, TRUInteger count, const TRRect *clip);", "TRThingPlace");
  assert.deepEqual(kinds(plan), ["ref", "inStructArray", "number", "structPointer"]);
});

test("a constant scalar pointer without a count is refused unless the bounds say how long it is", () => {
  const source = "TR_PUBLIC void TRThingFill(TRThingRef thing, const TRBoolean *stops, TRFloat *edges);";
  const message = failure(source);
  assert.match(message, /TRThingFill/);
  assert.match(message, /const TRBoolean \*/);

  const plan = binding(source, "TRThingFill", {
    bounds: { TRThingFill: { stops: { count: "9" }, edges: { count: "{thing} + 1" } } },
  });
  assert.deepEqual(kinds(plan), ["ref", "inBuffer", "outBuffer"]);
  assert.equal(plan.params[2]?.["count"], "{thing} + 1");
});

test("the size of a void buffer comes from bytes, an encoding or the text", () => {
  const bytes = binding("TR_PUBLIC TRThingRef TRThingCreateFromMemory(const void *memory, TRUInteger size);", "TRThingCreateFromMemory");
  assert.equal(bytes.params[0]?.["unit"], "1");

  const encoded = binding("TR_PUBLIC TRThingRef TRThingCreateFromText(const void *string, TRUInteger length, TRStringEncoding encoding);", "TRThingCreateFromText");
  assert.equal(encoded.params[0]?.["unit"], "marshal::CodeUnitSize({encoding})");

  const owned = binding("TR_PUBLIC TRBoolean TRTextAppend(TRMutableTextRef text, const void *codeUnitBuffer, TRUInteger codeUnitCount);", "TRTextAppend");
  assert.equal(owned.params[1]?.["unit"], "marshal::CodeUnitSize(TRTextGetEncoding({text}))");

  const written = binding("TR_PUBLIC TRBoolean TRTextCopy(TRTextRef text, TRUInteger index, TRUInteger length, void *buffer);", "TRTextCopy");
  assert.equal(written.params[3]?.kind, "outBuffer");
  assert.equal(written.params[3]?.["count"], "{length}");

  assert.match(failure("TR_PUBLIC void TRThingSetUnits(TRThingRef thing, const void *units, TRUInteger length);"), /TRThingSetUnits.*size of a code unit is unknown/);
  assert.match(failure("TR_PUBLIC void TRThingSetBlob(TRThingRef thing, const void *blob);"), /TRThingSetBlob.*size of the buffer is unknown/);
});

test("text goes in as a string and comes back as one", () => {
  const plan = binding("TR_PUBLIC const TRStringView *TRThingGetName(TRThingRef thing, const char *path, const TRStringView *name);", "TRThingGetName");
  assert.deepEqual(kinds(plan), ["ref", "cstring", "stringView"]);
  assert.equal(plan.returns.k, "stringView");
});

test("a parameter that the documentation allows to be NULL is nullable", () => {
  const plan = binding(`
    /**
     * @param thing The thing.
     * @param clip The clip, or \`NULL\` for none.
     */
    TR_PUBLIC void TRThingSetClip(TRThingRef thing, const TRRect *clip);
  `, "TRThingSetClip");
  assert.equal(plan.params[0]?.nullable, false);
  assert.equal(plan.params[1]?.nullable, true);
});

test("a pointer into Core memory needs its owner as the first parameter", () => {
  const plan = binding("TR_PUBLIC const TRFloat *TRThingGetAdvancesPtr(TRThingRef thing);", "TRThingGetAdvancesPtr");
  assert.equal(plan.returns.k, "pointerView");
  assert.equal(plan.returns["element"], "TRFloat");

  const message = failure("TR_PUBLIC const TRFloat *TRThingGetDefaultsPtr(TRUInteger index);");
  assert.match(message, /TRThingGetDefaultsPtr/);
  assert.match(message, /owner/);
  assert.match(failure("TR_PUBLIC TRFloat *TRThingGetAdvancesPtr(TRThingRef thing);"), /TRThingGetAdvancesPtr.*mutable pointer/);
});

test("an enumeration with a callback is collected into an array", () => {
  const plan = binding(`
    typedef void (*TRThingFunc)(void *userData, TRUInteger index, TRPoint origin, TRBoolean *stop);
    TR_PUBLIC TRBoolean TRThingEnumerate(TRThingRef thing, TRUInteger index, TRThingFunc func, void *userData);
  `, "TRThingEnumerate");
  assert.deepEqual(kinds(plan), ["ref", "number", "callback", "userData"]);
  assert.deepEqual(plan.params.filter((p) => p.js).map((p) => p.name), ["thing", "index"]);
  assert.equal(plan.result.mode, "success");
  assert.deepEqual(plan.outputs.map((o) => o.source), ["collector"]);
});

test("a struct of callbacks is collected with the name of the callback", () => {
  const plan = binding(`
    typedef struct _TRThingCallbacks {
      void (*moveTo)(void *userData, TRFloat x, TRFloat y, TRBoolean *stop);
      void (*close)(void *userData, TRBoolean *stop);
    } TRThingCallbacks;
    TR_PUBLIC TRBoolean TRThingWalk(TRThingRef thing, const TRThingCallbacks *callbacks, void *userData);
  `, "TRThingWalk");
  assert.deepEqual(kinds(plan), ["ref", "callbackStruct", "userData"]);
  assert.deepEqual((plan.params[1]?.["members"] as { name: string }[]).map((m) => m.name), ["moveTo", "close"]);
});

test("the context of a callback may come before the flag, as in the typeface manager", () => {
  const plan = binding(`
    typedef void (*TRThingCallback)(TRThingRef thing, void *context, TRBoolean *stop);
    TR_PUBLIC void TRThingEnumerateAll(TRThingCallback callback, void *context);
  `, "TRThingEnumerateAll");
  assert.equal(plan.result.mode, "outputs");
});

test("excluded and manual functions are not bound", () => {
  const source = "TR_PUBLIC const char *TRVersionGetString(void); TR_PUBLIC void TRThingSetNative(TRThingRef thing, void *data, void (*destroy)(void *data));";
  const model = build(source, { excluded: new Set(["TRVersionGetString"]), manual: new Set(["TRThingSetNative"]) });
  assert.ok(!model.bindings.some((b) => b.name === "TRVersionGetString" || b.name === "TRThingSetNative"));
});

test("a signature that cannot be expressed fails and names the function and the type", () => {
  const cases: [string, RegExp][] = [
    ["TR_PUBLIC void TRThingSetNative(TRThingRef thing, void *data, void (*destroy)(void *data));", /TRThingSetNative.*function pointer/],
    ["TR_PUBLIC void TRThingSetTag(TRThingRef thing, void *userData);", /TRThingSetTag.*opaque pointer without a callback/],
    ["TR_PUBLIC void TRThingSetNames(TRThingRef thing, const char **names);", /TRThingSetNames.*const char \*\*/],
    ["TR_PUBLIC void TRThingSetMystery(TRThingRef thing, TRMystery value);", /TRThingSetMystery.*unknown type "TRMystery"/],
    ["TR_PUBLIC TRMystery TRThingGetMystery(TRThingRef thing);", /TRThingGetMystery.*unknown type "TRMystery"/],
    ["typedef union _TRValue { TRFloat number; TRBoolean flag; } TRValue; TR_PUBLIC void TRThingSetValue(TRThingRef thing, TRValue value);", /TRThingSetValue.*union type "TRValue"/],
    ["typedef union _TRValue { TRFloat number; } TRValue; TR_PUBLIC void TRThingSetValues(TRThingRef thing, const TRValue *values, TRUInteger count);", /TRThingSetValues.*union "TRValue"/],
    ["typedef struct _TRBlob { const void *data; } TRBlob; TR_PUBLIC void TRThingSetBlob(TRThingRef thing, TRBlob blob);", /TRThingSetBlob.*member "data" of struct "TRBlob"/],
    ["typedef void (*TRBadFunc)(TRUInteger index); TR_PUBLIC void TRThingEach(TRBadFunc func);", /TRThingEach.*userData/],
    ["typedef TRFloat (*TRBadFunc)(void *userData); TR_PUBLIC void TRThingEach(TRBadFunc func, void *userData);", /TRThingEach.*must return void/],
    ["typedef void (*TRBadFunc)(void *userData, const char *text); TR_PUBLIC void TRThingEach(TRBadFunc func, void *userData);", /TRThingEach.*callback parameter "text"/],
    ["typedef void (*TRFunc)(void *userData); TR_PUBLIC void TRThingEach(TRFunc one, TRFunc two, void *userData);", /TRThingEach.*only one callback/],
    ["TR_PUBLIC void TRThingSetOutput(TRThingRef thing, TRFloat **output);", /TRThingSetOutput.*TRFloat \*\*/],
    ["TR_PUBLIC void TRThingSetChars(TRThingRef thing, char *chars);", /TRThingSetChars.*size of the buffer|pointer to characters/],
    ["TR_PUBLIC void TRThingFillPoints(TRThingRef thing, TRPoint *points, TRUInteger count);", /TRThingFillPoints.*output array of structs/],
  ];

  for (const [source, expected] of cases) {
    assert.match(failure(source), expected, source);
  }
});

test("a reference type without Retain and Release is refused", () => {
  const parsed = parseHeader("typedef const struct _TRLone *TRLoneRef; TR_PUBLIC void TRLoneUse(TRLoneRef lone);", { publicMacro: "TR_PUBLIC", prefix: "TR" });
  assert.throws(() => buildModel([{ file: "TRLone.h", parsed }], config()), /TRLoneRef.*TRLoneRetain/);
});

test("configuration that names a function no header declares is refused", () => {
  assert.match(failure("TR_PUBLIC void TRThingNop(void);", { excluded: new Set(["TRGone"]) }), /TRGone.*excluded/);
  assert.match(failure("TR_PUBLIC void TRThingNop(void);", { manual: new Set(["TRGone"]) }), /TRGone.*manual/);
  assert.match(failure("TR_PUBLIC void TRThingNop(void);", { bounds: { TRGone: {} } }), /TRGone.*bounds/);
  assert.match(failure("TR_PUBLIC void TRThingNop(TRFloat a);", { bounds: { TRThingNop: { b: { count: "1" } } } }), /TRThingNop.*"b"/);
});

test("the parser and the plan take the macro, prefix and boolean type of another library", () => {
  const options = { publicMacro: "SB_PUBLIC", prefix: "SB" };
  const prelude = `
    typedef uint8_t SBBoolean;
    typedef uintptr_t SBUInteger;
    typedef struct _SBParagraph *SBParagraphRef;
    SB_PUBLIC SBParagraphRef SBParagraphRetain(SBParagraphRef paragraph);
    SB_PUBLIC void SBParagraphRelease(SBParagraphRef paragraph);
  `;
  const config = { ...{ excluded: new Set<string>(), manual: new Set<string>(), bounds: {}, scalarOuts: {} }, booleanTypes: new Set(["SBBoolean"]) };

  const simple = parseHeader(`${prelude} SB_PUBLIC SBBoolean SBParagraphIsRTL(SBParagraphRef paragraph);`, options);
  const model = buildModel([{ file: "SBParagraph.h", parsed: simple }], config);
  assert.equal(model.bindings.find((b) => b.name === "SBParagraphIsRTL")?.returns.k, "bool");

  // A struct that holds a raw buffer, like SBCodepointSequence, is not guessed at.
  const sequence = parseHeader(`${prelude}
    typedef struct _SBCodepointSequence { const void *stringBuffer; SBUInteger stringLength; } SBCodepointSequence;
    SB_PUBLIC SBParagraphRef SBParagraphCreate(const SBCodepointSequence *sequence);
  `, options);
  assert.throws(() => buildModel([{ file: "SBParagraph.h", parsed: sequence }], config),
    /SBParagraphCreate.*"sequence".*const SBCodepointSequence \*.*stringBuffer.*const void \*/);
});

test("MUST NOT be NULL makes a parameter required, and a conditional rule keeps it optional", () => {
  const plan = binding(`
    /**
     * @param thing The thing.
     * @param renderer The renderer. It MUST NOT be \`NULL\`, as every run needs it.
     * @param clip The clip. It must not be \`NULL\`, unless the thing is empty.
     * @param other The other one, which can be \`NULL\`.
     */
    TR_PUBLIC void TRThingUse(TRThingRef thing, TRThingRef renderer, TRThingRef clip, TRThingRef other);
  `, "TRThingUse");
  assert.deepEqual(plan.params.map((p) => p.nullable), [false, false, true, true]);
});

test("the ownership words are matched as whole words of the name", () => {
  const source = `
    TR_PUBLIC TRThingRef TRThingGetTarget(TRThingRef thing);
      `;
  assert.equal(binding(source, "TRThingGetTarget").returns["ownership"], "borrowed");
  assert.match(failure("TR_PUBLIC TRThingRef TRThingForgetIt(TRThingRef thing);"), /TRThingForgetIt.*ownership is unknown/);
  assert.match(failure("TR_PUBLIC TRThingRef TRThingRecreate(TRThingRef thing);"), /TRThingRecreate.*ownership is unknown/);
});

test("a mutable pointer without a count is a single value only if it is listed", () => {
  const source = "TR_PUBLIC void TRThingGetWidths(TRThingRef thing, TRFloat *widths);";
  const message = failure(source);
  assert.match(message, /TRThingGetWidths/);
  assert.match(message, /"widths" of type "TRFloat \*"/);
  assert.match(message, /SCALAR_OUTS/);

  assert.equal(binding(source, "TRThingGetWidths", { scalarOuts: { TRThingGetWidths: ["widths"] } }).params[1]?.kind, "out");
  // A count makes it a buffer, so it needs no entry.
  assert.equal(binding("TR_PUBLIC void TRThingGetWidths(TRThingRef thing, TRFloat *widths, TRUInteger count);", "TRThingGetWidths").params[1]?.kind, "outBuffer");
});

test("the scalar outputs that are listed must exist and be outputs", () => {
  const source = "TR_PUBLIC void TRThingGetOne(TRThingRef thing, TRFloat *one, TRUInteger count);";
  assert.match(failure(source, { scalarOuts: { TRGone: ["a"] } }), /TRGone.*scalar outputs/);
  assert.match(failure(source, { scalarOuts: { TRThingGetOne: ["nothing"] } }), /TRThingGetOne.*"nothing"/);
  assert.match(failure(source, { scalarOuts: { TRThingGetOne: ["one"] } }), /TRThingGetOne.*"one".*not one/);
});

test("an unnamed function pointer parameter is reported as an unsupported callback signature", () => {
  const parsed = () => parseHeader("TR_PUBLIC void TRThingSetCallback(TRThingRef thing, void (*)(void *data));", { publicMacro: "TR_PUBLIC", prefix: "TR" });
  assert.throws(parsed, /TRThingSetCallback.*unsupported callback signature/);
});

test("a data pointer that the return text says Core accepts as NULL is nullable", () => {
  const plan = binding(`
    /**
     * @param thing The thing.
     * @param buffer Receives the data.
     * @param codeUnitBuffer The code units.
     * @param path The path.
     * @param other Receives more.
     * @return
     *      The number copied, which is zero if the buffer is \`NULL\` or \`path\` is \`NULL\`.
     */
    TR_PUBLIC TRUInteger TRThingCopy(TRThingRef thing, void *buffer, TRUInteger capacity, const char *path, TRFloat *other, TRUInteger otherCount);
  `, "TRThingCopy");
  const nullable = Object.fromEntries(plan.params.map((p) => [p.name, p.nullable]));
  assert.equal(nullable["buffer"], true);
  assert.equal(nullable["path"], false, "a string that makes the function fail is not optional");
  assert.equal(nullable["other"], false);
  assert.equal(nullable["thing"], false);

  const named = binding(`
    /**
     * @param codeUnitBuffer The code units.
     * @return \`TRFalse\` if the buffer is \`NULL\`.
     */
    TR_PUBLIC TRBoolean TRThingAppend(TRTextRef thing, const void *codeUnitBuffer, TRUInteger codeUnitCount);
  `, "TRThingAppend", {});
  assert.equal(named.params[1]?.nullable, true);
});

test("a handle remembers whether its type is mutable", () => {
  const model = build("TR_PUBLIC void TRTextBegin(TRMutableTextRef text);");
  const flags = Object.fromEntries(model.refs.map((ref) => [ref.name, ref.const]));
  assert.equal(flags["TRTextRef"], true);
  assert.equal(flags["TRMutableTextRef"], false);
});

test("an enumeration cannot return a reference the caller owns", () => {
  assert.match(failure(`
    typedef void (*TRThingFunc)(void *userData, TRUInteger index, TRBoolean *stop);
    TR_PUBLIC TRThingRef TRThingCreateEach(TRThingRef thing, TRThingFunc func, void *userData);
  `), /TRThingCreateEach.*enumeration cannot also return a reference/);
});
