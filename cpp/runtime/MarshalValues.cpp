#include "../generated/GeneratedSupport.h"

#include "Errors.h"
#include "TehreerBindings.h"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <limits>
#include <type_traits>

namespace tehreer::marshal {

namespace {

// The largest integer a double holds exactly (Number.MAX_SAFE_INTEGER). A 64-bit parameter is
// refused above it instead of being silently rounded.
constexpr double kMaxSafeInteger = 9007199254740991.0;

// Core declares its enumerations as integer typedefs today; this keeps a real enum working too.
template <class T, bool = std::is_enum_v<T>> struct Representation {
    using Type = T;
};
template <class T> struct Representation<T, true> {
    using Type = std::underlying_type_t<T>;
};

struct RawBuffer {
    void *data;
    size_t byteLength;
};

// Reads the buffer, offset and length of a typed array or a DataView through the getters that the
// installation captured from the engine's own prototypes (see TehreerBindings.cpp). A getter that
// app code defined, or a Proxy trap, is never run: the captured getter checks the object's brand and
// throws for anything that is not a real view.
bool ReadView(jsi::Runtime &rt, const jsi::Object &intrinsics, const char *kind, const jsi::Object &object,
              jsi::Value &buffer, jsi::Value &offset, jsi::Value &length) {
    std::string prefix(kind);
    try {
        buffer = intrinsics.getPropertyAsFunction(rt, (prefix + "Buffer").c_str()).callWithThis(rt, object);
        offset = intrinsics.getPropertyAsFunction(rt, (prefix + "ByteOffset").c_str()).callWithThis(rt, object);
        length = intrinsics.getPropertyAsFunction(rt, (prefix + "ByteLength").c_str()).callWithThis(rt, object);
        return true;
    } catch (const jsi::JSError &) {
        return false;
    }
}

// Resolves an ArrayBuffer, or a view on one (typed array, DataView), to its bytes. The caller runs
// no other JavaScript after the pointer is taken.
RawBuffer ResolveBuffer(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable) {
    if (value.isUndefined() || value.isNull()) {
        if (!nullable) {
            Fail(rt, function, parameter, "must not be null or undefined");
        }
        return { nullptr, 0 };
    }
    if (!value.isObject()) {
        Fail(rt, function, parameter, "must be an ArrayBuffer or a typed array");
    }

    jsi::Object object = value.getObject(rt);
    if (object.isArrayBuffer(rt)) {
        jsi::ArrayBuffer buffer = object.getArrayBuffer(rt);
        return { buffer.data(rt), buffer.size(rt) };
    }

    jsi::Object intrinsics = rt.global().getPropertyAsObject(rt, kBindingsName).getPropertyAsObject(rt, "intrinsics");
    jsi::Value underlying, offset, length;
    if (!ReadView(rt, intrinsics, "typed", object, underlying, offset, length) &&
        !ReadView(rt, intrinsics, "dataView", object, underlying, offset, length)) {
        Fail(rt, function, parameter, "must be an ArrayBuffer or a typed array");
    }
    if (!underlying.isObject() || !underlying.getObject(rt).isArrayBuffer(rt) || !offset.isNumber() || !length.isNumber()) {
        Fail(rt, function, parameter, "must be backed by an ArrayBuffer");
    }

    jsi::ArrayBuffer buffer = underlying.getObject(rt).getArrayBuffer(rt);
    double start = offset.getNumber();
    double bytes = length.getNumber();
    // The engine reports whole numbers; anything else means the view is not what it claims to be.
    if (!(start >= 0) || !(bytes >= 0) || std::trunc(start) != start || std::trunc(bytes) != bytes ||
        start + bytes > static_cast<double>(buffer.size(rt))) {
        Fail(rt, function, parameter, "is not backed by a valid ArrayBuffer range");
    }

    return { buffer.data(rt) + static_cast<size_t>(start), static_cast<size_t>(bytes) };
}

} // namespace

const jsi::Value &ArgAt(const jsi::Value *args, size_t count, size_t index) {
    static const jsi::Value undefined;
    return index < count ? args[index] : undefined;
}

bool IsNullish(const jsi::Value &value) {
    return value.isUndefined() || value.isNull();
}

template <class T>
T ToNumber(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter) {
    using Plain = typename Representation<T>::Type;

    if (!value.isNumber()) {
        Fail(rt, function, parameter, "must be a number");
    }
    double number = value.getNumber();

    if constexpr (std::is_floating_point_v<Plain>) {
        if (std::isnan(number)) {
            runtime::FailRange(rt, function, parameter, "must not be NaN");
        }
        // Infinity is a valid float (an unbounded width); a finite double that is too big for it is not.
        if (std::isfinite(number) && std::fabs(number) > static_cast<double>(std::numeric_limits<Plain>::max())) {
            runtime::FailRange(rt, function, parameter, "is out of range");
        }
        return static_cast<T>(number);
    } else {
        if (!std::isfinite(number) || std::trunc(number) != number) {
            runtime::FailRange(rt, function, parameter, "must be an integer");
        }
        double lowest = std::max(static_cast<double>(std::numeric_limits<Plain>::lowest()), -kMaxSafeInteger);
        double highest = std::min(static_cast<double>(std::numeric_limits<Plain>::max()), kMaxSafeInteger);
        if (number < lowest || number > highest) {
            runtime::FailRange(rt, function, parameter, "is out of range");
        }
        return static_cast<T>(static_cast<Plain>(number));
    }
}

template <class T>
jsi::Value FromNumber(jsi::Runtime &, T value) {
    using Plain = typename Representation<T>::Type;

    return jsi::Value(static_cast<double>(static_cast<Plain>(value)));
}

// Only indices and counts have a -1. It is a function of its own, not a case of ToNumber, because
// on 32-bit targets TRUInteger is the same type as TRUInt32 (colors, tags), whose 0xFFFFFFFF is a
// plain number.
TRUInteger ToIndex(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter) {
    if (value.isNumber() && value.getNumber() == -1.0) {
        return TRInvalidIndex;
    }
    return ToNumber<TRUInteger>(rt, value, function, parameter);
}

jsi::Value FromIndex(jsi::Runtime &rt, TRUInteger value) {
    if (value == TRInvalidIndex) {
        return jsi::Value(-1.0);
    }
    return FromNumber<TRUInteger>(rt, value);
}

bool ToBoolean(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter) {
    if (!value.isBool()) {
        Fail(rt, function, parameter, "must be a boolean");
    }
    return value.getBool();
}

jsi::Value FromBoolean(bool value) {
    return jsi::Value(value);
}

CStringArg ToCString(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable) {
    CStringArg result;
    result.isNull = true;

    if (IsNullish(value)) {
        if (!nullable) {
            Fail(rt, function, parameter, "must not be null or undefined");
        }
        return result;
    }
    if (!value.isString()) {
        Fail(rt, function, parameter, "must be a string");
    }

    result.storage = value.getString(rt).utf8(rt);
    // Core reads up to the first NUL, so the rest of the text would be dropped without notice.
    if (result.storage.find('\0') != std::string::npos) {
        runtime::FailRange(rt, function, parameter, "must not contain a NUL character");
    }
    result.isNull = false;
    return result;
}

jsi::Value FromCString(jsi::Runtime &rt, const char *string) {
    if (string == nullptr) {
        return jsi::Value::undefined();
    }
    return jsi::Value(rt, jsi::String::createFromUtf8(rt, reinterpret_cast<const uint8_t *>(string), std::strlen(string)));
}

StringViewArg ToStringView(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable) {
    StringViewArg result;
    result.isNull = true;
    result.view = {};

    if (IsNullish(value)) {
        if (!nullable) {
            Fail(rt, function, parameter, "must not be null or undefined");
        }
        return result;
    }
    if (!value.isString()) {
        Fail(rt, function, parameter, "must be a string");
    }

    result.storage = value.getString(rt).utf16(rt);
    // The view points into the storage. A string moves its characters only when they are stored
    // inside the string object, so a heap buffer keeps the pointer valid if the result is moved.
    result.storage.reserve(std::max<size_t>(result.storage.size(), 32));
    result.view.buffer = result.storage.data();
    result.view.length = result.storage.size();
    result.view.encoding = TRStringEncodingUTF16;
    result.isNull = false;
    return result;
}

size_t CodeUnitSize(TRStringEncoding encoding) {
    switch (encoding) {
    case TRStringEncodingUTF8:
        return 1;
    case TRStringEncodingUTF16:
        return 2;
    case TRStringEncodingUTF32:
        return 4;
    default:
        return 0;
    }
}

jsi::Value FromStringView(jsi::Runtime &rt, const TRStringView *view) {
    if (view == nullptr || view->buffer == nullptr) {
        return jsi::Value::undefined();
    }

    size_t length = static_cast<size_t>(view->length);
    switch (view->encoding) {
    case TRStringEncodingUTF8:
        return jsi::Value(rt, jsi::String::createFromUtf8(rt, static_cast<const uint8_t *>(view->buffer), length));

    case TRStringEncodingUTF16:
        return jsi::Value(rt, jsi::String::createFromUtf16(rt, static_cast<const char16_t *>(view->buffer), length));

    case TRStringEncodingUTF32: {
        const uint32_t *units = static_cast<const uint32_t *>(view->buffer);
        std::u16string text;
        text.reserve(length);
        for (size_t index = 0; index < length; index++) {
            uint32_t unit = units[index];
            if (unit > 0x10FFFF || (unit >= 0xD800 && unit <= 0xDFFF)) {
                unit = 0xFFFD;
            }
            if (unit >= 0x10000) {
                unit -= 0x10000;
                text.push_back(static_cast<char16_t>(0xD800 + (unit >> 10)));
                text.push_back(static_cast<char16_t>(0xDC00 + (unit & 0x3FF)));
            } else {
                text.push_back(static_cast<char16_t>(unit));
            }
        }
        return jsi::Value(rt, jsi::String::createFromUtf16(rt, text));
    }

    default:
        return jsi::Value::undefined();
    }
}

ConstBuffer ToConstBuffer(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable) {
    RawBuffer raw = ResolveBuffer(rt, value, function, parameter, nullable);
    return { raw.data, raw.byteLength };
}

MutableBuffer ToMutableBuffer(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable) {
    RawBuffer raw = ResolveBuffer(rt, value, function, parameter, nullable);
    return { raw.data, raw.byteLength };
}

void RequireCapacity(jsi::Runtime &rt, const char *function, const char *parameter, size_t count, size_t unitSize, size_t byteLength) {
    // Divides instead of multiplying, since `count` can be TRInvalidIndex.
    if (unitSize != 0 && count > byteLength / unitSize) {
        runtime::FailRange(rt, function, parameter, "is too small for the count that was passed");
    }
}

void RequireElements(jsi::Runtime &rt, const char *function, const char *parameter, size_t count, size_t available) {
    if (count > available) {
        runtime::FailRange(rt, function, parameter, "has fewer elements than the count that was passed");
    }
}

jsi::Object ToObject(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter) {
    if (!value.isObject()) {
        Fail(rt, function, parameter, "must be an object");
    }
    return value.getObject(rt);
}

jsi::Array ToArray(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter) {
    if (value.isObject()) {
        jsi::Object object = value.getObject(rt);
        if (object.isArray(rt)) {
            return object.getArray(rt);
        }
    }
    Fail(rt, function, parameter, "must be an array");
}

jsi::Value MakePointerView(jsi::Runtime &rt, const void *address, const char *element, size_t elementSize, const jsi::Value &owner) {
    if (address == nullptr) {
        return jsi::Value::undefined();
    }

    // The final shape of lists and views belongs to the lists issue. This keeps the address (exact,
    // as a BigInt) next to the owner, so the owner stays reachable for as long as the view is.
    jsi::Object view(rt);
    view.setProperty(rt, "address", jsi::BigInt::fromUint64(rt, static_cast<uint64_t>(reinterpret_cast<uintptr_t>(address))));
    view.setProperty(rt, "element", jsi::String::createFromAscii(rt, element));
    view.setProperty(rt, "elementSize", static_cast<double>(elementSize));
    view.setProperty(rt, "owner", jsi::Value(rt, owner));
    return jsi::Value(std::move(view));
}

jsi::Value FromToken(jsi::Runtime &rt, const void *pointer) {
    // Tokens are numbers that JavaScript stored in them, so they fit; a bigger address (a tagged
    // pointer) would be rounded, which is refused instead of handing out a different token.
    uint64_t address = static_cast<uint64_t>(reinterpret_cast<uintptr_t>(pointer));
    if (address > static_cast<uint64_t>(kMaxSafeInteger)) {
        runtime::FailRange(rt, "FromToken", "token", "does not fit in a JavaScript number");
    }
    return jsi::Value(static_cast<double>(address));
}

const void *ToToken(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter) {
    if (!value.isNumber()) {
        Fail(rt, function, parameter, "must be a number");
    }

    double number = value.getNumber();
    if (!std::isfinite(number) || std::trunc(number) != number || number < 0) {
        runtime::FailRange(rt, function, parameter, "must be a non-negative integer");
    }
    // An address that does not fit a pointer (a token above 4 GiB on a 32-bit target) would wrap
    // into a different token.
    if (number > kMaxSafeInteger || number > static_cast<double>(std::numeric_limits<uintptr_t>::max())) {
        runtime::FailRange(rt, function, parameter, "is out of range");
    }
    return reinterpret_cast<const void *>(static_cast<uintptr_t>(number));
}

// Every type that the generated code converts. The generated code only sees the declarations, so
// they are instantiated here; a type missing from the list fails to link, and tests/runtime.test.ts
// compares the list with the generated files. Duplicates are fine: several names are one type.
#define TEHREER_NUMBER(Type) \
    reinterpret_cast<const void *>(&ToNumber<Type>), reinterpret_cast<const void *>(&FromNumber<Type>)

// Externally visible, so that the optimiser keeps the instantiations.
extern const void *const kInstantiatedNumbers[];
const void *const kInstantiatedNumbers[] = {
    TEHREER_NUMBER(TRAttributeType),
    TEHREER_NUMBER(TRBreakMode),
    TEHREER_NUMBER(TRColor),
    TEHREER_NUMBER(TRDrawStyle),
    TEHREER_NUMBER(TRFloat),
    TEHREER_NUMBER(TRGlyphID),
    TEHREER_NUMBER(TRGlyphImageFormat),
    TEHREER_NUMBER(TRGlyphImageKind),
    TEHREER_NUMBER(TRInt32),
    TEHREER_NUMBER(TRReplacementKind),
    TEHREER_NUMBER(TRShapingOrder),
    TEHREER_NUMBER(TRSlope),
    TEHREER_NUMBER(TRStringEncoding),
    TEHREER_NUMBER(TRStrokeCap),
    TEHREER_NUMBER(TRStrokeJoin),
    TEHREER_NUMBER(TRTag),
    TEHREER_NUMBER(TRTextAlignment),
    TEHREER_NUMBER(TRTruncationPlace),
    TEHREER_NUMBER(TRUInt32),
    TEHREER_NUMBER(TRUInt8),
    TEHREER_NUMBER(TRVerticalAlignment),
    TEHREER_NUMBER(TRWeight),
    TEHREER_NUMBER(TRWidth),
    TEHREER_NUMBER(TRWritingDirection),
};

#undef TEHREER_NUMBER

} // namespace tehreer::marshal
