/*
 * Copyright (C) 2026 Muhammad Tayyab Akram
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// GENERATED FILE. DO NOT EDIT.
// Written by scripts/generate-bindings.mjs from Libraries/TehreerCore/Headers/Tehreer.
// Change the generator or the Core header, then run `npm run generate`.

#ifndef TEHREER_GENERATED_SUPPORT_H
#define TEHREER_GENERATED_SUPPORT_H

#include <cstddef>
#include <cstdint>
#include <exception>
#include <string>
#include <utility>
#include <vector>

#include <jsi/jsi.h>

#include <Tehreer/TRAttribute.h>
#include <Tehreer/TRAttributeList.h>
#include <Tehreer/TRBase.h>
#include <Tehreer/TRComposedFrame.h>
#include <Tehreer/TRComposedLine.h>
#include <Tehreer/TRDrawCallbacks.h>
#include <Tehreer/TRFontFeatures.h>
#include <Tehreer/TRFontFile.h>
#include <Tehreer/TRFrameResolver.h>
#include <Tehreer/TRGeometry.h>
#include <Tehreer/TRGlyphCache.h>
#include <Tehreer/TRGlyphImage.h>
#include <Tehreer/TRGlyphRun.h>
#include <Tehreer/TRLineLocator.h>
#include <Tehreer/TRPath.h>
#include <Tehreer/TRRenderer.h>
#include <Tehreer/TRReplacement.h>
#include <Tehreer/TRShapingEngine.h>
#include <Tehreer/TRShapingResult.h>
#include <Tehreer/TRString.h>
#include <Tehreer/TRText.h>
#include <Tehreer/TRTypeface.h>
#include <Tehreer/TRTypefaceManager.h>
#include <Tehreer/TRTypesetter.h>
#include <Tehreer/TRVersion.h>

namespace tehreer {

namespace jsi = facebook::jsi;

/**
 * The conversions between JavaScript values and Core values that the generated bindings use. The
 * runtime defines everything declared here except the inline parts. Every function that reads a
 * value takes the name of the Core function and of the parameter, and throws a `jsi::JSError`
 * that names both when the value cannot be converted.
 */
namespace marshal {

/** Whether the reference that a Core function returns is already owned by the caller. */
enum class Ownership {
    /** The reference is owned (`Create`, `Copy`, `Retain`): the handle adopts it. */
    Adopt,
    /** The reference is borrowed (`Get`): the handle retains it first. */
    Retain,
};

/**
 * Describes an object reference type. Handles.h specialises it for every reference type of Core.
 * `kGroup` is the same for the types that share one object (`TRTextRef` and
 * `TRMutableTextRef`), so that a handle is accepted for either. `kMutable` is false for a
 * `const` reference type. A handle remembers the `kMutable` of the type it was made from, and
 * `ToHandle<Ref>` refuses a handle that was made from a `const` type when `Ref::kMutable`,
 * since Core documents those objects as immutable; a mutable handle is accepted for either type.
 * `Release` is the only thing a finalizer may call.
 */
template <class Ref> struct HandleTraits;

[[noreturn]] void Fail(jsi::Runtime &rt, const char *function, const char *parameter, const char *message);

/** The argument at `index`, or undefined when fewer were passed. */
const jsi::Value &ArgAt(const jsi::Value *args, size_t count, size_t index);
bool IsNullish(const jsi::Value &value);

/**
 * Numbers. `ToNumber` throws when the value is not a number or not representable as `T`.
 * `TRUInteger` (indices and counts) goes through `ToIndex` and `FromIndex` instead, where -1 is
 * `TRInvalidIndex` in both directions; no other type has that rule, which a template argument could
 * not express on 32-bit targets, where `TRUInteger` and `TRColor` are one C type.
 */
template <class T> T ToNumber(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter);
template <class T> jsi::Value FromNumber(jsi::Runtime &rt, T value);
TRUInteger ToIndex(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter);
jsi::Value FromIndex(jsi::Runtime &rt, TRUInteger value);
bool ToBoolean(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter);
jsi::Value FromBoolean(bool value);

/**
 * Object references. A null or undefined value is `NULL` when `nullable`, else an error. The
 * generated code converts them after every argument that may run JavaScript and before the
 * buffers, so a getter cannot dispose an object between here and the Core call.
 */
template <class Ref> Ref ToHandle(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable);
/**
 * `NULL` becomes undefined. If making the handle throws, an `Adopt`ed reference is released, so
 * no path leaks one.
 */
template <class Ref> jsi::Value FromHandle(jsi::Runtime &rt, Ref ref, Ownership ownership);

/** A UTF-8 string that lives as long as the argument object. */
struct CStringArg {
    std::string storage;
    bool isNull;
    const char *get() const { return isNull ? nullptr : storage.c_str(); }
};
CStringArg ToCString(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable);
/** `NULL` becomes undefined. */
jsi::Value FromCString(jsi::Runtime &rt, const char *string);

/** A UTF-16 view of a JavaScript string that lives as long as the argument object. */
struct StringViewArg {
    std::u16string storage;
    TRStringView view;
    bool isNull;
    const TRStringView *get() const { return isNull ? nullptr : &view; }
};
StringViewArg ToStringView(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable);
/** Decodes the string by its encoding; `NULL` becomes undefined. */
jsi::Value FromStringView(jsi::Runtime &rt, const TRStringView *view);

/**
 * Memory of an `ArrayBuffer` or of a typed array, read by Core during the call only.
 * `data` is null for a null or undefined value when `nullable`.
 *
 * The pointer stays valid only while no JavaScript runs: a getter, a Proxy or a callback could
 * detach or resize the buffer. The generated code therefore converts every other argument first
 * and takes the buffers last, and runs no JavaScript between that and the Core call. The runtime
 * must not run any in these functions either, and must not hand out a pointer of a buffer that is
 * detached or resizable and could change.
 */
struct ConstBuffer {
    const void *data;
    size_t byteLength;
};
struct MutableBuffer {
    void *data;
    size_t byteLength;
};
ConstBuffer ToConstBuffer(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable);
MutableBuffer ToMutableBuffer(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable);

/**
 * Throws a `RangeError` unless `count` units of `unitSize` bytes fit in `byteLength`, so Core
 * never reads or writes past a buffer; the test must not overflow, as `count` can be
 * `TRInvalidIndex`. The generated code does not call it when `unitSize` is zero, which is an
 * invalid encoding: Core documents that it refuses the encoding without reading the buffer.
 */
void RequireCapacity(jsi::Runtime &rt, const char *function, const char *parameter, size_t count, size_t unitSize, size_t byteLength);
/** The same for an array that holds `available` elements. */
void RequireElements(jsi::Runtime &rt, const char *function, const char *parameter, size_t count, size_t available);

/** The size in bytes of a code unit of `encoding`, or zero when it is not valid. */
size_t CodeUnitSize(TRStringEncoding encoding);

jsi::Object ToObject(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter);
jsi::Array ToArray(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter);

/**
 * A pointer into memory that `owner` keeps alive, with the name and the size of its elements.
 * The count is asked from Core separately. `NULL` becomes undefined.
 */
jsi::Value MakePointerView(jsi::Runtime &rt, const void *address, const char *element, size_t elementSize, const jsi::Value &owner);
/** The address of an opaque pointer, as a number (an application token such as `userData`). */
jsi::Value FromToken(jsi::Runtime &rt, const void *pointer);
/** The opposite: a non-negative integer number becomes the opaque pointer it was made from. */
const void *ToToken(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter);

/**
 * Receives what Core passes to the callbacks of an enumeration. Nothing re-enters JavaScript
 * code that the caller wrote: each call is turned into one item, and the items are returned as
 * an array once the Core function has returned. If making an item throws, the first error is kept,
 * the enumeration is stopped through its `stop` flag and the error is rethrown by `Finish`.
 */
struct Collector {
    explicit Collector(jsi::Runtime &runtime) : runtime(runtime) {}

    jsi::Runtime &runtime;
    std::vector<jsi::Value> items;
    std::exception_ptr error;

    bool HasFailed() const { return error != nullptr; }

    jsi::Value Finish() {
        if (error) {
            std::rethrow_exception(error);
        }

        jsi::Array array(runtime, items.size());
        for (size_t index = 0; index < items.size(); index++) {
            array.setValueAtIndex(runtime, index, std::move(items[index]));
        }
        return jsi::Value(runtime, array);
    }
};

/**
 * Callbacks that Core keeps and calls later (a replacement's `computeRoom`) run JavaScript the
 * app wrote, which can throw, and an exception must never unwind through the C frames of Core. The
 * runtime's trampolines catch it and remember the first one; every binding asks for it right after
 * the Core function returns and throws it from there. No JavaScript runs in between, so the
 * checks cost one read of a thread-local.
 */
bool HasCallbackError(jsi::Runtime &rt);
/** Throws the remembered error, the very value the handler threw, and forgets it. */
[[noreturn]] void ThrowCallbackError(jsi::Runtime &rt);
inline void RethrowCallbackError(jsi::Runtime &rt) {
    if (HasCallbackError(rt)) {
        ThrowCallbackError(rt);
    }
}

} // namespace marshal
} // namespace tehreer

#endif
