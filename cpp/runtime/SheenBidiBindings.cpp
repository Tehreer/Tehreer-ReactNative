#include "SheenBidiBindings.h"

#include "../generated/GeneratedSupport.h"
#include "Errors.h"
#include "HandleObject.h"

#include <SheenBidi/SBAlgorithm.h>
#include <SheenBidi/SBCodepoint.h>
#include <SheenBidi/SBCodepointSequence.h>
#include <SheenBidi/SBLine.h>
#include <SheenBidi/SBMirrorLocator.h>
#include <SheenBidi/SBParagraph.h>
#include <SheenBidi/SBScript.h>
#include <SheenBidi/SBScriptLocator.h>
#include <SheenBidi/SBVersion.h>

#include <atomic>
#include <cstdint>
#include <cstring>
#include <memory>
#include <string>
#include <utility>

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

constexpr const char *kAlgorithm = "SBAlgorithm";
constexpr const char *kParagraph = "SBParagraph";
constexpr const char *kLine = "SBLine";
constexpr const char *kScriptLocator = "SBScriptLocator";
constexpr const char *kMirrorLocator = "SBMirrorLocator";

#ifndef NDEBUG
// How many texts are alive, for the device tests of the buffer's lifetime (see the test hooks).
std::atomic<int> gLiveTexts{0};
#endif

/**
 * The UTF-16 copy of a string that SheenBidi reads. SheenBidi does not own the buffer of its
 * `SBCodepointSequence`: the algorithm keeps the pointer, and so do the paragraphs it makes (through
 * the algorithm), and the mirror locator reads characters from it when it walks a line. So every
 * object that can need it holds a share of it, and it ends with the last one, whichever order they
 * are released in and on whatever thread. The copy is immutable once made.
 */
struct BidiText {
    explicit BidiText(std::u16string text) : units(std::move(text)) {
#ifndef NDEBUG
        gLiveTexts.fetch_add(1);
#endif
    }
    ~BidiText() {
#ifndef NDEBUG
        gLiveTexts.fetch_sub(1);
#endif
    }
    BidiText(const BidiText &) = delete;
    BidiText &operator=(const BidiText &) = delete;

    const std::u16string units;
};

using TextPtr = std::shared_ptr<const BidiText>;

/**
 * What a handle of this file refers to: one SheenBidi object with one reference of its own, the
 * text it needs, and a count of the handles that share them. Retaining a handle (`Duplicate`, the
 * `Retain` bindings) adds to the count; the SheenBidi object is released and the text let go when
 * the count reaches zero. That makes a paragraph or a line independent of the algorithm that made
 * it: it keeps its own share of the text.
 */
struct Owner {
    std::atomic<size_t> references{1};
    void *object;
    void (*release)(void *object);
    TextPtr text;
};

void RetainOwner(void *ref) {
    static_cast<Owner *>(ref)->references.fetch_add(1, std::memory_order_relaxed);
}

// Runs on any thread, during a collection too, so it releases and nothing else.
void ReleaseOwner(void *ref) {
    Owner *owner = static_cast<Owner *>(ref);
    if (owner->references.fetch_sub(1, std::memory_order_acq_rel) == 1) {
        owner->release(owner->object);
        delete owner;
    }
}

template <class Ref, void (*Release)(Ref)> void ReleaseObject(void *object) {
    Release(static_cast<Ref>(object));
}

// Takes over the one reference of `object`, which is released on every path that fails.
jsi::Value MakeHandle(jsi::Runtime &rt, void *object, void (*release)(void *), TextPtr text, const char *group, bool isMutable) {
    Owner *owner = nullptr;
    try {
        owner = new Owner;
    } catch (...) {
        release(object);
        throw;
    }
    owner->object = object;
    owner->release = release;
    owner->text = std::move(text);

    // Until the handle object exists the owner holds the reference; after that the handle does,
    // and its destructor releases it even if the engine fails to wrap it.
    std::shared_ptr<HandleObject> handle;
    try {
        handle = std::make_shared<HandleObject>(owner, group, isMutable, &ReleaseOwner, &RetainOwner);
    } catch (...) {
        ReleaseOwner(owner);
        throw;
    }
    return jsi::Value(jsi::Object::createFromHostObject(rt, std::move(handle)));
}

Owner *RequireOwner(jsi::Runtime &rt, const jsi::Value *args, size_t count, size_t index, const char *function,
                    const char *parameter, const char *group) {
    const jsi::Value &value = marshal::ArgAt(args, count, index);
    if (marshal::IsNullish(value)) {
        marshal::Fail(rt, function, parameter, "must not be null or undefined");
    }

    std::shared_ptr<HandleObject> handle = AsHandleObject(rt, value);
    if (!handle) {
        marshal::Fail(rt, function, parameter, "is not a Tehreer handle");
    }
    if (handle->isDisposed()) {
        marshal::Fail(rt, function, parameter, "is already disposed");
    }
    if (std::strcmp(handle->group(), group) != 0) {
        std::string message = std::string("must be a ") + group + " handle, not " + handle->group();
        marshal::Fail(rt, function, parameter, message.c_str());
    }

    // The argument keeps the handle object, and so the owner, alive while the binding runs; no
    // JavaScript runs in between.
    return static_cast<Owner *>(handle->ref());
}

TextPtr ToText(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter) {
    marshal::StringViewArg text = marshal::ToStringView(rt, value, function, parameter, false);
    return std::make_shared<const BidiText>(std::move(text.storage));
}

SBCodepointSequence SequenceOf(const BidiText &text) {
    SBCodepointSequence sequence;
    sequence.stringEncoding = SBStringEncodingUTF16;
    sequence.stringBuffer = text.units.data();
    sequence.stringLength = text.units.size();
    return sequence;
}

SBLevel ToBaseLevel(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter) {
    SBLevel level = marshal::ToNumber<TRUInt8>(rt, value, function, parameter);
    // SheenBidi would take any other value as one of the two defaults without a word.
    if (level > SBLevelMax && level != SBLevelDefaultLTR && level != SBLevelDefaultRTL) {
        runtime::FailRange(rt, function, parameter, "is neither a level from 0 to 125 nor a default direction");
    }
    return level;
}

#define TEHREER_BINDING(Name) \
    jsi::Value Bind##Name(jsi::Runtime &rt, const jsi::Value &, [[maybe_unused]] const jsi::Value *args, [[maybe_unused]] size_t count)

// Retains give a new handle that shares the owner: its reference is the handle's, not another
// reference of SheenBidi's object.
jsi::Value RetainHandle(jsi::Runtime &rt, const jsi::Value *args, size_t count, const char *function,
                        const char *parameter, const char *group, bool isMutable) {
    Owner *owner = RequireOwner(rt, args, count, 0, function, parameter, group);
    RetainOwner(owner);

    try {
        auto handle = std::make_shared<HandleObject>(owner, group, isMutable, &ReleaseOwner, &RetainOwner);
        return jsi::Value(jsi::Object::createFromHostObject(rt, std::move(handle)));
    } catch (...) {
        ReleaseOwner(owner);
        throw;
    }
}

template <class Ref> void *Erase(Ref ref) {
    return const_cast<void *>(static_cast<const void *>(ref));
}

jsi::Object MakeObject(jsi::Runtime &rt) {
    return jsi::Object(rt);
}

// ---- Algorithm

TEHREER_BINDING(SBAlgorithmCreate) {
    constexpr const char *kFunction = "SBAlgorithmCreate";
    TextPtr text = ToText(rt, marshal::ArgAt(args, count, 0), kFunction, "text");

    SBCodepointSequence sequence = SequenceOf(*text);
    SBAlgorithmRef algorithm = SBAlgorithmCreate(&sequence);
    if (algorithm == nullptr) {
        return jsi::Value::undefined();
    }

    return MakeHandle(rt, Erase(algorithm), &ReleaseObject<SBAlgorithmRef, SBAlgorithmRelease>, std::move(text), kAlgorithm, false);
}

TEHREER_BINDING(SBAlgorithmGetBidiTypesPtr) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBAlgorithmGetBidiTypesPtr", "algorithm", kAlgorithm);
    const SBBidiType *types = SBAlgorithmGetBidiTypesPtr(static_cast<SBAlgorithmRef>(owner->object));

    // The array has a type for each code unit of the text (see the header of SheenBidi).
    return marshal::MakePointerView(rt, types, "SBBidiType", sizeof(SBBidiType), owner->text->units.size(), marshal::ArgAt(args, count, 0));
}

TEHREER_BINDING(SBAlgorithmGetParagraphBoundary) {
    constexpr const char *kFunction = "SBAlgorithmGetParagraphBoundary";
    Owner *owner = RequireOwner(rt, args, count, 0, kFunction, "algorithm", kAlgorithm);
    SBUInteger offset = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "paragraphOffset");
    SBUInteger length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "suggestedLength");

    // SheenBidi clamps a range that is not inside of the text, so nothing is read past it.
    SBUInteger actualLength = 0;
    SBUInteger separatorLength = 0;
    SBAlgorithmGetParagraphBoundary(static_cast<SBAlgorithmRef>(owner->object), offset, length, &actualLength, &separatorLength);

    jsi::Object result = MakeObject(rt);
    result.setProperty(rt, "actualLength", marshal::FromIndex(rt, actualLength));
    result.setProperty(rt, "separatorLength", marshal::FromIndex(rt, separatorLength));
    return jsi::Value(rt, result);
}

TEHREER_BINDING(SBAlgorithmCreateParagraph) {
    constexpr const char *kFunction = "SBAlgorithmCreateParagraph";
    Owner *owner = RequireOwner(rt, args, count, 0, kFunction, "algorithm", kAlgorithm);
    SBUInteger offset = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "paragraphOffset");
    SBUInteger length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "suggestedLength");
    SBLevel baseLevel = ToBaseLevel(rt, marshal::ArgAt(args, count, 3), kFunction, "baseLevel");

    SBParagraphRef paragraph = SBAlgorithmCreateParagraph(static_cast<SBAlgorithmRef>(owner->object), offset, length, baseLevel);
    if (paragraph == nullptr) {
        return jsi::Value::undefined();
    }

    // The paragraph takes its own share of the text, so it outlives the algorithm's handle.
    return MakeHandle(rt, Erase(paragraph), &ReleaseObject<SBParagraphRef, SBParagraphRelease>, owner->text, kParagraph, false);
}

TEHREER_BINDING(SBAlgorithmRetain) {
    return RetainHandle(rt, args, count, "SBAlgorithmRetain", "algorithm", kAlgorithm, false);
}

// ---- Paragraph

TEHREER_BINDING(SBParagraphGetOffset) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBParagraphGetOffset", "paragraph", kParagraph);
    return marshal::FromIndex(rt, SBParagraphGetOffset(static_cast<SBParagraphRef>(owner->object)));
}

TEHREER_BINDING(SBParagraphGetLength) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBParagraphGetLength", "paragraph", kParagraph);
    return marshal::FromIndex(rt, SBParagraphGetLength(static_cast<SBParagraphRef>(owner->object)));
}

TEHREER_BINDING(SBParagraphGetBaseLevel) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBParagraphGetBaseLevel", "paragraph", kParagraph);
    return marshal::FromNumber<TRUInt8>(rt, SBParagraphGetBaseLevel(static_cast<SBParagraphRef>(owner->object)));
}

TEHREER_BINDING(SBParagraphGetLevelsPtr) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBParagraphGetLevelsPtr", "paragraph", kParagraph);
    SBParagraphRef paragraph = static_cast<SBParagraphRef>(owner->object);

    return marshal::MakePointerView(rt, SBParagraphGetLevelsPtr(paragraph), "SBLevel", sizeof(SBLevel),
                                    SBParagraphGetLength(paragraph), marshal::ArgAt(args, count, 0));
}

TEHREER_BINDING(SBParagraphCreateLine) {
    constexpr const char *kFunction = "SBParagraphCreateLine";
    Owner *owner = RequireOwner(rt, args, count, 0, kFunction, "paragraph", kParagraph);
    SBUInteger offset = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "lineOffset");
    SBUInteger length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "lineLength");

    SBLineRef line = SBParagraphCreateLine(static_cast<SBParagraphRef>(owner->object), offset, length);
    if (line == nullptr) {
        return jsi::Value::undefined();
    }

    return MakeHandle(rt, Erase(line), &ReleaseObject<SBLineRef, SBLineRelease>, owner->text, kLine, false);
}

TEHREER_BINDING(SBParagraphRetain) {
    return RetainHandle(rt, args, count, "SBParagraphRetain", "paragraph", kParagraph, false);
}

// ---- Line

TEHREER_BINDING(SBLineGetOffset) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBLineGetOffset", "line", kLine);
    return marshal::FromIndex(rt, SBLineGetOffset(static_cast<SBLineRef>(owner->object)));
}

TEHREER_BINDING(SBLineGetLength) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBLineGetLength", "line", kLine);
    return marshal::FromIndex(rt, SBLineGetLength(static_cast<SBLineRef>(owner->object)));
}

TEHREER_BINDING(SBLineGetRunCount) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBLineGetRunCount", "line", kLine);
    return marshal::FromIndex(rt, SBLineGetRunCount(static_cast<SBLineRef>(owner->object)));
}

TEHREER_BINDING(SBLineGetRunsPtr) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBLineGetRunsPtr", "line", kLine);
    SBLineRef line = static_cast<SBLineRef>(owner->object);

    return marshal::MakePointerView(rt, SBLineGetRunsPtr(line), "SBRun", sizeof(SBRun), SBLineGetRunCount(line),
                                    marshal::ArgAt(args, count, 0));
}

TEHREER_BINDING(SBLineRetain) {
    return RetainHandle(rt, args, count, "SBLineRetain", "line", kLine, false);
}

// ---- Script locator

TEHREER_BINDING(SBScriptLocatorCreate) {
    SBScriptLocatorRef locator = SBScriptLocatorCreate();
    if (locator == nullptr) {
        return jsi::Value::undefined();
    }

    return MakeHandle(rt, Erase(locator), &ReleaseObject<SBScriptLocatorRef, SBScriptLocatorRelease>, nullptr, kScriptLocator, true);
}

TEHREER_BINDING(SBScriptLocatorLoadCodepoints) {
    constexpr const char *kFunction = "SBScriptLocatorLoadCodepoints";
    Owner *owner = RequireOwner(rt, args, count, 0, kFunction, "locator", kScriptLocator);
    TextPtr text = ToText(rt, marshal::ArgAt(args, count, 1), kFunction, "text");

    // The locator keeps the pointer of the sequence, so the locator's own share of the text is
    // replaced only after it has been given the new one.
    SBCodepointSequence sequence = SequenceOf(*text);
    SBScriptLocatorLoadCodepoints(static_cast<SBScriptLocatorRef>(owner->object), &sequence);
    owner->text = std::move(text);
    return jsi::Value::undefined();
}

TEHREER_BINDING(SBScriptLocatorGetAgent) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBScriptLocatorGetAgent", "locator", kScriptLocator);
    const SBScriptAgent *agent = SBScriptLocatorGetAgent(static_cast<SBScriptLocatorRef>(owner->object));

    // A copy: the agent is inside of the locator and changes with the next move.
    jsi::Object result = MakeObject(rt);
    result.setProperty(rt, "offset", marshal::FromIndex(rt, agent->offset));
    result.setProperty(rt, "length", marshal::FromIndex(rt, agent->length));
    result.setProperty(rt, "script", marshal::FromNumber<TRUInt8>(rt, agent->script));
    return jsi::Value(rt, result);
}

TEHREER_BINDING(SBScriptLocatorMoveNext) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBScriptLocatorMoveNext", "locator", kScriptLocator);
    return marshal::FromBoolean(SBScriptLocatorMoveNext(static_cast<SBScriptLocatorRef>(owner->object)) != SBFalse);
}

TEHREER_BINDING(SBScriptLocatorReset) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBScriptLocatorReset", "locator", kScriptLocator);
    SBScriptLocatorReset(static_cast<SBScriptLocatorRef>(owner->object));
    return jsi::Value::undefined();
}

TEHREER_BINDING(SBScriptLocatorRetain) {
    return RetainHandle(rt, args, count, "SBScriptLocatorRetain", "locator", kScriptLocator, true);
}

// ---- Mirror locator

TEHREER_BINDING(SBMirrorLocatorCreate) {
    SBMirrorLocatorRef locator = SBMirrorLocatorCreate();
    if (locator == nullptr) {
        return jsi::Value::undefined();
    }

    return MakeHandle(rt, Erase(locator), &ReleaseObject<SBMirrorLocatorRef, SBMirrorLocatorRelease>, nullptr, kMirrorLocator, true);
}

// The string buffer that SheenBidi asks for is the text of the line, which the line's handle holds,
// so JavaScript cannot pair a line with another string.
TEHREER_BINDING(SBMirrorLocatorLoadLine) {
    constexpr const char *kFunction = "SBMirrorLocatorLoadLine";
    Owner *owner = RequireOwner(rt, args, count, 0, kFunction, "locator", kMirrorLocator);
    SBMirrorLocatorRef locator = static_cast<SBMirrorLocatorRef>(owner->object);

    const jsi::Value &lineValue = marshal::ArgAt(args, count, 1);
    if (marshal::IsNullish(lineValue)) {
        SBMirrorLocatorLoadLine(locator, nullptr, nullptr);
        owner->text.reset();
        return jsi::Value::undefined();
    }

    Owner *lineOwner = RequireOwner(rt, args, count, 1, kFunction, "line", kLine);
    SBMirrorLocatorLoadLine(locator, static_cast<SBLineRef>(lineOwner->object), lineOwner->text->units.data());
    // The locator retains the line itself, and reads the text until the next load.
    owner->text = lineOwner->text;
    return jsi::Value::undefined();
}

TEHREER_BINDING(SBMirrorLocatorGetAgent) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBMirrorLocatorGetAgent", "locator", kMirrorLocator);
    const SBMirrorAgent *agent = SBMirrorLocatorGetAgent(static_cast<SBMirrorLocatorRef>(owner->object));

    jsi::Object result = MakeObject(rt);
    result.setProperty(rt, "index", marshal::FromIndex(rt, agent->index));
    result.setProperty(rt, "mirror", marshal::FromNumber<TRUInt32>(rt, agent->mirror));
    result.setProperty(rt, "codepoint", marshal::FromNumber<TRUInt32>(rt, agent->codepoint));
    return jsi::Value(rt, result);
}

TEHREER_BINDING(SBMirrorLocatorMoveNext) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBMirrorLocatorMoveNext", "locator", kMirrorLocator);
    return marshal::FromBoolean(SBMirrorLocatorMoveNext(static_cast<SBMirrorLocatorRef>(owner->object)) != SBFalse);
}

TEHREER_BINDING(SBMirrorLocatorReset) {
    Owner *owner = RequireOwner(rt, args, count, 0, "SBMirrorLocatorReset", "locator", kMirrorLocator);
    SBMirrorLocatorReset(static_cast<SBMirrorLocatorRef>(owner->object));
    return jsi::Value::undefined();
}

TEHREER_BINDING(SBMirrorLocatorRetain) {
    return RetainHandle(rt, args, count, "SBMirrorLocatorRetain", "locator", kMirrorLocator, true);
}

// ---- Code points

TEHREER_BINDING(SBCodepointGetBidiType) {
    SBCodepoint codepoint = marshal::ToNumber<TRUInt32>(rt, marshal::ArgAt(args, count, 0), "SBCodepointGetBidiType", "codepoint");
    return marshal::FromNumber<TRUInt8>(rt, SBCodepointGetBidiType(codepoint));
}

TEHREER_BINDING(SBCodepointGetGeneralCategory) {
    SBCodepoint codepoint = marshal::ToNumber<TRUInt32>(rt, marshal::ArgAt(args, count, 0), "SBCodepointGetGeneralCategory", "codepoint");
    return marshal::FromNumber<TRUInt8>(rt, SBCodepointGetGeneralCategory(codepoint));
}

TEHREER_BINDING(SBCodepointGetMirror) {
    SBCodepoint codepoint = marshal::ToNumber<TRUInt32>(rt, marshal::ArgAt(args, count, 0), "SBCodepointGetMirror", "codepoint");
    return marshal::FromNumber<TRUInt32>(rt, SBCodepointGetMirror(codepoint));
}

TEHREER_BINDING(SBCodepointGetScript) {
    SBCodepoint codepoint = marshal::ToNumber<TRUInt32>(rt, marshal::ArgAt(args, count, 0), "SBCodepointGetScript", "codepoint");
    return marshal::FromNumber<TRUInt8>(rt, SBCodepointGetScript(codepoint));
}

jsi::Value DecodeResult(jsi::Runtime &rt, SBCodepoint codepoint, SBUInteger index) {
    jsi::Object result = MakeObject(rt);
    result.setProperty(rt, "result", marshal::FromNumber<TRUInt32>(rt, codepoint));
    result.setProperty(rt, "index", marshal::FromIndex(rt, index));
    return jsi::Value(rt, result);
}

// The four decoders read `length` units of a buffer that JavaScript gives, so the length is checked
// against the buffer before SheenBidi reads. UTF-16 reads through a `uint16_t *`, which a view at an
// odd offset could not provide.
template <size_t UnitSize, class Unit, SBCodepoint (*Read)(const Unit *, SBUInteger, SBUInteger *)>
jsi::Value Decode(jsi::Runtime &rt, const jsi::Value *args, size_t count, const char *function) {
    SBUInteger length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), function, "length");
    SBUInteger index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), function, "index");
    marshal::ConstBuffer buffer = marshal::ToConstBuffer(rt, marshal::ArgAt(args, count, 0), function, "buffer", false);

    marshal::RequireCapacity(rt, function, "length", length, UnitSize, buffer.byteLength);
    // SheenBidi answers an index outside of the buffer with an invalid code point, but a binding
    // must not depend on that: the index is at most the length (the end is a valid position).
    if (index > length) {
        runtime::FailRange(rt, function, "index", "is beyond the length");
    }
    if (reinterpret_cast<uintptr_t>(buffer.data) % alignof(Unit) != 0) {
        runtime::FailRange(rt, function, "buffer", "is not aligned to its code unit");
    }

    SBCodepoint codepoint = Read(static_cast<const Unit *>(buffer.data), length, &index);
    return DecodeResult(rt, codepoint, index);
}

TEHREER_BINDING(SBCodepointDecodeNextFromUTF8) {
    return Decode<1, SBUInt8, SBCodepointDecodeNextFromUTF8>(rt, args, count, "SBCodepointDecodeNextFromUTF8");
}

TEHREER_BINDING(SBCodepointDecodePreviousFromUTF8) {
    return Decode<1, SBUInt8, SBCodepointDecodePreviousFromUTF8>(rt, args, count, "SBCodepointDecodePreviousFromUTF8");
}

TEHREER_BINDING(SBCodepointDecodeNextFromUTF16) {
    return Decode<2, SBUInt16, SBCodepointDecodeNextFromUTF16>(rt, args, count, "SBCodepointDecodeNextFromUTF16");
}

TEHREER_BINDING(SBCodepointDecodePreviousFromUTF16) {
    return Decode<2, SBUInt16, SBCodepointDecodePreviousFromUTF16>(rt, args, count, "SBCodepointDecodePreviousFromUTF16");
}

// The sequence functions take the string itself: a JavaScript string is UTF-16, and the copy lives
// for the call only.
template <SBCodepoint (*Read)(const SBCodepointSequence *, SBUInteger *)>
jsi::Value GetCodepoint(jsi::Runtime &rt, const jsi::Value *args, size_t count, const char *function) {
    SBUInteger index = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), function, "stringIndex");
    TextPtr text = ToText(rt, marshal::ArgAt(args, count, 0), function, "text");

    if (index > text->units.size()) {
        runtime::FailRange(rt, function, "stringIndex", "is beyond the length of the text");
    }

    SBCodepointSequence sequence = SequenceOf(*text);
    SBCodepoint codepoint = Read(&sequence, &index);
    return DecodeResult(rt, codepoint, index);
}

TEHREER_BINDING(SBCodepointSequenceGetCodepointBefore) {
    return GetCodepoint<SBCodepointSequenceGetCodepointBefore>(rt, args, count, "SBCodepointSequenceGetCodepointBefore");
}

TEHREER_BINDING(SBCodepointSequenceGetCodepointAt) {
    return GetCodepoint<SBCodepointSequenceGetCodepointAt>(rt, args, count, "SBCodepointSequenceGetCodepointAt");
}

// ---- Scripts and version

TEHREER_BINDING(SBScriptGetOpenTypeTag) {
    SBScript script = marshal::ToNumber<TRUInt8>(rt, marshal::ArgAt(args, count, 0), "SBScriptGetOpenTypeTag", "script");
// SheenBidi deprecates this in favour of the Unicode tag, but Tehreer-Web, Android and Cocoa expose
// both, and an application picks an OpenType tag for shaping with it.
#pragma GCC diagnostic push
#pragma GCC diagnostic ignored "-Wdeprecated-declarations"
    SBUInt32 tag = SBScriptGetOpenTypeTag(script);
#pragma GCC diagnostic pop
    return marshal::FromNumber<TRUInt32>(rt, tag);
}

TEHREER_BINDING(SBScriptGetUnicodeTag) {
    SBScript script = marshal::ToNumber<TRUInt8>(rt, marshal::ArgAt(args, count, 0), "SBScriptGetUnicodeTag", "script");
    return marshal::FromNumber<TRUInt32>(rt, SBScriptGetUnicodeTag(script));
}

TEHREER_BINDING(SBVersionGetString) {
    return marshal::FromCString(rt, SBVersionGetString());
}

#undef TEHREER_BINDING

// ---- SBRun codec

jsi::Value RunToJs(jsi::Runtime &rt, const void *value) {
    const SBRun &run = *static_cast<const SBRun *>(value);

    jsi::Object result = MakeObject(rt);
    result.setProperty(rt, "offset", marshal::FromIndex(rt, run.offset));
    result.setProperty(rt, "length", marshal::FromIndex(rt, run.length));
    result.setProperty(rt, "level", marshal::FromNumber<TRUInt8>(rt, run.level));
    return jsi::Value(rt, result);
}

void RunFromJs(jsi::Runtime &rt, const jsi::Value &value, const char *function, const std::string &parameter, void *out) {
    jsi::Object object = marshal::ToObject(rt, value, function, parameter.c_str());
    const std::string offset = parameter + ".offset";
    const std::string length = parameter + ".length";
    const std::string level = parameter + ".level";

    SBRun run;
    run.offset = marshal::ToIndex(rt, object.getProperty(rt, "offset"), function, offset.c_str());
    run.length = marshal::ToIndex(rt, object.getProperty(rt, "length"), function, length.c_str());
    run.level = marshal::ToNumber<TRUInt8>(rt, object.getProperty(rt, "level"), function, level.c_str());
    *static_cast<SBRun *>(out) = run;
}

const generated::StructCodec kRunCodec = { "SBRun", sizeof(SBRun), &RunToJs, &RunFromJs };

struct Binding {
    const char *name;
    unsigned int parameters;
    jsi::Value (*function)(jsi::Runtime &, const jsi::Value &, const jsi::Value *, size_t);
};

// One row for each public function of the classic headers that is bound; scripts/generator/sheenbidi.mjs
// lists the rest with the reason, and tests/sheenbidi.test.ts compares both lists with the headers.
const Binding kBindings[] = {
    { "SBAlgorithmCreate", 1, &BindSBAlgorithmCreate },
    { "SBAlgorithmGetBidiTypesPtr", 1, &BindSBAlgorithmGetBidiTypesPtr },
    { "SBAlgorithmGetParagraphBoundary", 3, &BindSBAlgorithmGetParagraphBoundary },
    { "SBAlgorithmCreateParagraph", 4, &BindSBAlgorithmCreateParagraph },
    { "SBAlgorithmRetain", 1, &BindSBAlgorithmRetain },
    { "SBParagraphGetOffset", 1, &BindSBParagraphGetOffset },
    { "SBParagraphGetLength", 1, &BindSBParagraphGetLength },
    { "SBParagraphGetBaseLevel", 1, &BindSBParagraphGetBaseLevel },
    { "SBParagraphGetLevelsPtr", 1, &BindSBParagraphGetLevelsPtr },
    { "SBParagraphCreateLine", 3, &BindSBParagraphCreateLine },
    { "SBParagraphRetain", 1, &BindSBParagraphRetain },
    { "SBLineGetOffset", 1, &BindSBLineGetOffset },
    { "SBLineGetLength", 1, &BindSBLineGetLength },
    { "SBLineGetRunCount", 1, &BindSBLineGetRunCount },
    { "SBLineGetRunsPtr", 1, &BindSBLineGetRunsPtr },
    { "SBLineRetain", 1, &BindSBLineRetain },
    { "SBScriptLocatorCreate", 0, &BindSBScriptLocatorCreate },
    { "SBScriptLocatorLoadCodepoints", 2, &BindSBScriptLocatorLoadCodepoints },
    { "SBScriptLocatorGetAgent", 1, &BindSBScriptLocatorGetAgent },
    { "SBScriptLocatorMoveNext", 1, &BindSBScriptLocatorMoveNext },
    { "SBScriptLocatorReset", 1, &BindSBScriptLocatorReset },
    { "SBScriptLocatorRetain", 1, &BindSBScriptLocatorRetain },
    { "SBMirrorLocatorCreate", 0, &BindSBMirrorLocatorCreate },
    { "SBMirrorLocatorLoadLine", 2, &BindSBMirrorLocatorLoadLine },
    { "SBMirrorLocatorGetAgent", 1, &BindSBMirrorLocatorGetAgent },
    { "SBMirrorLocatorMoveNext", 1, &BindSBMirrorLocatorMoveNext },
    { "SBMirrorLocatorReset", 1, &BindSBMirrorLocatorReset },
    { "SBMirrorLocatorRetain", 1, &BindSBMirrorLocatorRetain },
    { "SBCodepointGetBidiType", 1, &BindSBCodepointGetBidiType },
    { "SBCodepointGetGeneralCategory", 1, &BindSBCodepointGetGeneralCategory },
    { "SBCodepointGetMirror", 1, &BindSBCodepointGetMirror },
    { "SBCodepointGetScript", 1, &BindSBCodepointGetScript },
    { "SBCodepointDecodeNextFromUTF8", 3, &BindSBCodepointDecodeNextFromUTF8 },
    { "SBCodepointDecodePreviousFromUTF8", 3, &BindSBCodepointDecodePreviousFromUTF8 },
    { "SBCodepointDecodeNextFromUTF16", 3, &BindSBCodepointDecodeNextFromUTF16 },
    { "SBCodepointDecodePreviousFromUTF16", 3, &BindSBCodepointDecodePreviousFromUTF16 },
    { "SBCodepointSequenceGetCodepointBefore", 2, &BindSBCodepointSequenceGetCodepointBefore },
    { "SBCodepointSequenceGetCodepointAt", 2, &BindSBCodepointSequenceGetCodepointAt },
    { "SBScriptGetOpenTypeTag", 1, &BindSBScriptGetOpenTypeTag },
    { "SBScriptGetUnicodeTag", 1, &BindSBScriptGetUnicodeTag },
    { "SBVersionGetString", 0, &BindSBVersionGetString },
};

} // namespace

const generated::StructCodec &SheenBidiRunCodec() {
    return kRunCodec;
}

void InstallSheenBidiBindings(jsi::Runtime &runtime, jsi::Object &target) {
    for (const Binding &binding : kBindings) {
        target.setProperty(runtime, binding.name, jsi::Function::createFromHostFunction(
            runtime, jsi::PropNameID::forAscii(runtime, binding.name), binding.parameters, binding.function));
    }
}

#ifndef NDEBUG

namespace {

// How many texts are alive: the text of an algorithm lives as long as the algorithm, a paragraph
// or a line of it does, which a test sees by disposing them in turn.
jsi::Value GetLiveTextCount(jsi::Runtime &, const jsi::Value &, const jsi::Value *, size_t) {
    return jsi::Value(static_cast<double>(gLiveTexts.load()));
}

} // namespace

void InstallSheenBidiTestHooks(jsi::Runtime &runtime, jsi::Object &target) {
    target.setProperty(runtime, "testGetBidiTextCount", jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, "testGetBidiTextCount"), 0, &GetLiveTextCount));
}

#endif

} // namespace tehreer
