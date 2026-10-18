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
 * `TRMutableTextRef`), so that a handle is accepted for any of them. `Release` is the only thing
 * a finalizer may call.
 */
template <class Ref> struct HandleTraits;

[[noreturn]] void Fail(jsi::Runtime &rt, const char *function, const char *parameter, const char *message);

/** The argument at `index`, or undefined when fewer were passed. */
const jsi::Value &ArgAt(const jsi::Value *args, size_t count, size_t index);
bool IsNullish(const jsi::Value &value);

/**
 * Numbers. `ToNumber` throws when the value is not a number or not representable as `T`. For
 * `TRUInteger`, -1 is `TRInvalidIndex` in both directions.
 */
template <class T> T ToNumber(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter);
template <class T> jsi::Value FromNumber(jsi::Runtime &rt, T value);
bool ToBoolean(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter);
jsi::Value FromBoolean(bool value);

/** Object references. A null or undefined value is `NULL` when `nullable`, else an error. */
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
 * `TRInvalidIndex`. A `unitSize` of zero (an invalid encoding) throws too.
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

} // namespace marshal
} // namespace tehreer

#endif
