import assert from "node:assert/strict";
import { test } from "node:test";

import { parseDoc, parseHeader, ParseError, parseType } from "../scripts/generator/parser.mjs";

const options = { publicMacro: "TR_PUBLIC", prefix: "TR" };

test("parseType reads qualifiers, tags and pointers", () => {
  assert.deepEqual(parseType("const TRFoo *"), { base: "TRFoo", const: true, pointer: 1 });
  assert.deepEqual(parseType("void"), { base: "void", const: false, pointer: 0 });
  assert.deepEqual(parseType("const struct _TRRun *"), { base: "_TRRun", const: true, pointer: 1, tag: "struct" });
});

test("the functions marked with the public macro are found, across lines and after comments", () => {
  const { functions } = parseHeader(`
    #ifndef _GUARD_H
    #define _GUARD_H
    #define TRTagMake(a, b) \\
      ((a) | (b))
    TR_EXTERN_C_BEGIN
    /** Gets the width. */
    TR_PUBLIC TRFloat TRThingGetWidth(TRThingRef thing);
    /* Not a doc comment. */
    TR_PUBLIC void TRThingSetSize(TRThingRef thing,
        TRFloat width, // trailing
        TRFloat height);
    TR_PUBLIC TRThingRef TRThingCreate(void);
    TR_EXTERN_C_END
    #endif
  `, options);

  assert.deepEqual(functions.map((fn) => fn.name), ["TRThingGetWidth", "TRThingSetSize", "TRThingCreate"]);
  assert.equal(functions[1]?.signature, "void TRThingSetSize(TRThingRef thing, TRFloat width, TRFloat height)");
  assert.deepEqual(functions[1]?.params.map((p) => p.name), ["thing", "width", "height"]);
  assert.deepEqual(functions[2]?.params, []);
  assert.equal(functions[0]?.returns.base, "TRFloat");
});

test("a pointer return type keeps its pointer and qualifier", () => {
  const { functions } = parseHeader("TR_PUBLIC const TRGlyphID *TRRunGetGlyphIDsPtr(TRRunRef run);", options);
  assert.deepEqual(functions[0]?.returns, { base: "TRGlyphID", const: true, pointer: 1 });
});

test("typedefs are read as aliases, references, structs, unions and function pointers", () => {
  const { typedefs } = parseHeader(`
    typedef uint32_t TRUInt32;
    typedef TRUInt32 TRDrawStyle;
    typedef const struct _TRPath *TRPathRef;
    typedef struct _TRRenderer *TRRendererRef;
    typedef struct _TRPoint {
        TRFloat x;      /**< The horizontal coordinate. */
        TRFloat y;      /**< The vertical coordinate. */
    } TRPoint;
    typedef union _TRValue {
        TRFloat number;
        TRBoolean flag;
    } TRValue;
    typedef void (*TRLineFunc)(void *userData, TRUInteger lineIndex, TRBoolean *stop);
    typedef struct _TRCallbacks {
        void (*moveTo)(void *userData, TRFloat x, TRFloat y, TRBoolean *stop);
        void (*close)(void *userData, const struct _TRRun *run);
    } TRCallbacks;
    enum { TRFalse = 0, TRTrue = 1 };
    struct _TRForward;
  `, options);

  const byName = new Map(typedefs.map((typedef) => [typedef.name, typedef]));
  assert.equal(typedefs.length, 8);
  assert.deepEqual(byName.get("TRDrawStyle"), { kind: "alias", name: "TRDrawStyle", target: { base: "TRUInt32", const: false, pointer: 0 } });
  assert.deepEqual(byName.get("TRPathRef"), { kind: "reference", name: "TRPathRef", tag: "_TRPath", const: true });
  assert.deepEqual(byName.get("TRRendererRef"), { kind: "reference", name: "TRRendererRef", tag: "_TRRenderer", const: false });

  const point = byName.get("TRPoint");
  assert.equal(point?.kind, "struct");
  assert.deepEqual(point && "members" in point ? point.members.map((m) => m.name) : [], ["x", "y"]);
  assert.equal(byName.get("TRValue")?.kind, "union");

  const func = byName.get("TRLineFunc");
  assert.equal(func?.kind, "function");
  assert.deepEqual(func && "params" in func ? func.params.map((p) => p.name) : [], ["userData", "lineIndex", "stop"]);

  const callbacks = byName.get("TRCallbacks");
  assert.deepEqual(callbacks && "members" in callbacks ? callbacks.members.map((m) => m.name) : [], ["moveTo", "close"]);
  const moveTo = callbacks && "members" in callbacks ? callbacks.members[0]?.type : undefined;
  assert.ok(moveTo && "function" in moveTo && moveTo.function);
});

test("the Doxygen comment of a function gives its parameter and return texts", () => {
  const { functions } = parseHeader(`
    /**
     * Gets a thing.
     *
     * @param thing
     *      The thing, or \`NULL\`
     *      for none.
     * @param distance
     *      Receives the distance.
     * @return
     *      \`TRTrue\` if it was given.
     */
    TR_PUBLIC TRBoolean TRThingGet(TRThingRef thing, TRFloat *distance);
  `, options);

  const doc = functions[0]?.doc;
  assert.equal(doc?.params["thing"], "The thing, or `NULL` for none.");
  assert.equal(doc?.params["distance"], "Receives the distance.");
  assert.equal(doc?.returns, "`TRTrue` if it was given.");
  assert.deepEqual(parseDoc(null), { params: {}, returns: "" });
});

test("only a doc comment right before a declaration belongs to it", () => {
  const { functions } = parseHeader(`
    /** @param a Belongs to the first. */
    TR_PUBLIC void TRFirst(TRFloat a);
    TR_PUBLIC void TRSecond(TRFloat a);
  `, options);
  assert.equal(functions[0]?.doc.params["a"], "Belongs to the first.");
  assert.deepEqual(functions[1]?.doc.params, {});
});

test("a public declaration that cannot be read throws a ParseError that names it", () => {
  assert.throws(() => parseHeader("TR_PUBLIC int (*)(void);", options), ParseError);
  assert.throws(() => parseHeader("TR_PUBLIC void TRThingSet(TRThingRef thing, TRFloat);", options), (error: Error) =>
    error instanceof ParseError && error.message.includes("TRThingSet"));
  assert.throws(() => parseHeader("/* never closed", options), ParseError);
});
