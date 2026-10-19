#include "../generated/GeneratedSupport.h"
#include "../generated/Handles.h"

#include "HandleObject.h"

#include <cstring>
#include <memory>
#include <string>
#include <type_traits>

namespace tehreer::marshal {

namespace {

template <class Ref> void *PointerFromRef(Ref ref) {
    return const_cast<void *>(static_cast<const void *>(ref));
}

template <class Ref> Ref RefFromPointer(void *pointer) {
    return reinterpret_cast<Ref>(pointer);
}

template <class Ref> void ReleaseRef(void *pointer) {
    HandleTraits<Ref>::Release(RefFromPointer<Ref>(pointer));
}

} // namespace

template <class Ref>
Ref ToHandle(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter, bool nullable) {
    using Traits = HandleTraits<Ref>;

    if (IsNullish(value)) {
        if (nullable) {
            return nullptr;
        }
        Fail(rt, function, parameter, "must not be null or undefined");
    }

    std::shared_ptr<HandleObject> handle = AsHandleObject(rt, value);
    if (!handle) {
        Fail(rt, function, parameter, "is not a Tehreer handle");
    }
    if (handle->isDisposed()) {
        Fail(rt, function, parameter, "is already disposed");
    }
    if (std::strcmp(handle->group(), Traits::kGroup) != 0) {
        std::string message = std::string("must be a ") + Traits::kGroup + " handle, not " + handle->group();
        Fail(rt, function, parameter, message.c_str());
    }
    if (Traits::kMutable && !handle->isMutable()) {
        Fail(rt, function, parameter, "is immutable and cannot be changed");
    }

    return RefFromPointer<Ref>(handle->ref());
}

template <class Ref>
jsi::Value FromHandle(jsi::Runtime &rt, Ref ref, Ownership ownership) {
    using Traits = HandleTraits<Ref>;

    if (ref == nullptr) {
        return jsi::Value::undefined();
    }
    if (ownership == Ownership::Retain) {
        Traits::Retain(ref);
    }

    // Until the object exists nothing owns the reference, so a failure here releases it. After
    // that the object does, and its destructor releases it even if the engine fails to wrap it.
    std::shared_ptr<HandleObject> object;
    try {
        object = std::make_shared<HandleObject>(PointerFromRef(ref), Traits::kGroup, Traits::kMutable, &ReleaseRef<Ref>);
    } catch (...) {
        Traits::Release(ref);
        throw;
    }

    return jsi::Value(jsi::Object::createFromHostObject(rt, std::move(object)));
}

// The generated code only sees the declarations, so every reference type is instantiated here.
// A type missing from this list fails to link; tests/runtime.test.ts compares it with Handles.h.
#define TEHREER_HANDLE_REF(Ref) \
    reinterpret_cast<const void *>(&ToHandle<Ref>), reinterpret_cast<const void *>(&FromHandle<Ref>)

// Taking the addresses in an externally visible array keeps the optimiser from dropping the
// instantiations.
extern const void *const kInstantiatedHandles[];
const void *const kInstantiatedHandles[] = {
    TEHREER_HANDLE_REF(TRAttributeListRef),
    TEHREER_HANDLE_REF(TRComposedFrameRef),
    TEHREER_HANDLE_REF(TRComposedLineRef),
    TEHREER_HANDLE_REF(TRFontFeaturesRef),
    TEHREER_HANDLE_REF(TRFontFileRef),
    TEHREER_HANDLE_REF(TRFrameResolverRef),
    TEHREER_HANDLE_REF(TRGlyphCacheRef),
    TEHREER_HANDLE_REF(TRGlyphImageRef),
    TEHREER_HANDLE_REF(TRGlyphRunRef),
    TEHREER_HANDLE_REF(TRLineLocatorRef),
    TEHREER_HANDLE_REF(TRMutableTextRef),
    TEHREER_HANDLE_REF(TRPathRef),
    TEHREER_HANDLE_REF(TRRendererRef),
    TEHREER_HANDLE_REF(TRReplacementRef),
    TEHREER_HANDLE_REF(TRShapingEngineRef),
    TEHREER_HANDLE_REF(TRShapingResultRef),
    TEHREER_HANDLE_REF(TRTextRef),
    TEHREER_HANDLE_REF(TRTypefaceRef),
    TEHREER_HANDLE_REF(TRTypesetterRef),
};

#undef TEHREER_HANDLE_REF

} // namespace tehreer::marshal
