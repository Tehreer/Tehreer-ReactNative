#include "PointerBuffers.h"

#include "../generated/GeneratedSupport.h"
#include "../generated/Structs.h"
#include "Errors.h"
#include "StructCodecs.h"

#include <cstring>
#include <limits>
#include <utility>

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

void Define(jsi::Runtime &runtime, jsi::Object &target, const char *name, unsigned int parameters, jsi::HostFunctionType function) {
    target.setProperty(runtime, name, jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, name), parameters, std::move(function)));
}

std::shared_ptr<PointerViewObject> RequireView(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter) {
    std::shared_ptr<PointerViewObject> view = AsPointerView(rt, value);
    if (!view) {
        marshal::Fail(rt, function, parameter, "is not a pointer that Core gave");
    }
    return view;
}

// -1 is TRInvalidIndex for every index and count that JavaScript passes, and none of them can be it.
TRUInteger RequireCount(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter) {
    TRUInteger count = marshal::ToIndex(rt, value, function, parameter);
    if (count == TRInvalidIndex) {
        runtime::FailRange(rt, function, parameter, "must not be -1");
    }
    return count;
}

// Whether `count` elements of `elementSize` bytes fit in a size_t; `count` is not trusted to be small.
void RequireFits(jsi::Runtime &rt, const char *function, size_t count, size_t elementSize) {
    if (elementSize == 0) {
        marshal::Fail(rt, function, "pointer", "has elements of no size");
    }
    if (count > std::numeric_limits<size_t>::max() / elementSize) {
        runtime::FailRange(rt, function, "count", "is too large for the address space");
    }
}

// The ArrayBuffer for nothing: no memory is involved, so no owner is kept.
jsi::Value EmptyBuffer(jsi::Runtime &rt) {
    return rt.global().getPropertyAsFunction(rt, "ArrayBuffer").callAsConstructor(rt, 0);
}

// Wraps Core memory in an ArrayBuffer that keeps its owner alive (see RetainedMemory). Reading
// through a typed array does not run JavaScript, so a getter cannot dispose the owner mid-read, and
// even if it did the memory is held by the buffer's own reference.
jsi::Value CreatePointerBuffer(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "createPointerBuffer";
    std::shared_ptr<PointerViewObject> view = RequireView(rt, marshal::ArgAt(args, count, 0), kFunction, "pointer");
    TRUInteger length = RequireCount(rt, marshal::ArgAt(args, count, 1), kFunction, "count");
    TRUInt32 alignment = marshal::ToNumber<TRUInt32>(rt, marshal::ArgAt(args, count, 2), kFunction, "alignment");

    if (length == 0) {
        // Still refuses a disposed owner, so that "already disposed" does not depend on the count.
        if (view->owner()->isDisposed()) {
            marshal::Fail(rt, kFunction, "pointer", "is already disposed");
        }
        return EmptyBuffer(rt);
    }

    std::shared_ptr<RetainedMemory> memory = RetainMemory(rt, *view, length, alignment, kFunction);
    return jsi::Value(jsi::ArrayBuffer(rt, std::move(memory)));
}

// Converts elements of an array of structs with the codec of their type, so the layout is known to
// the native side only. A reference of its own pins the memory for the whole call, since converting
// an element makes JavaScript objects and a setter somewhere could dispose the owner meanwhile.
jsi::Value ReadPointerStructs(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "readPointerStructs";
    std::shared_ptr<PointerViewObject> view = RequireView(rt, marshal::ArgAt(args, count, 0), kFunction, "pointer");
    TRUInteger length = RequireCount(rt, marshal::ArgAt(args, count, 1), kFunction, "count");
    TRUInteger fromIndex = RequireCount(rt, marshal::ArgAt(args, count, 2), kFunction, "fromIndex");
    TRUInteger toIndex = RequireCount(rt, marshal::ArgAt(args, count, 3), kFunction, "toIndex");

    const generated::StructCodec *codec = FindStructCodec(view->element());
    if (codec == nullptr) {
        marshal::Fail(rt, kFunction, "pointer", "does not hold structs that JavaScript converts");
    }
    if (codec->size != view->elementSize()) {
        marshal::Fail(rt, kFunction, "pointer", "has elements that are not the size of the struct");
    }
    RequireFits(rt, kFunction, length, codec->size);
    if (fromIndex > toIndex || toIndex > length) {
        runtime::FailRange(rt, kFunction, "toIndex", "is not a range within the count");
    }

    alignas(std::max_align_t) unsigned char storage[128];
    if (codec->size > sizeof(storage)) {
        marshal::Fail(rt, kFunction, "pointer", "has elements bigger than the buffer for one");
    }

    std::shared_ptr<HandleObject> keeper = KeepAlive(rt, *view, kFunction, "pointer");
    const auto *base = static_cast<const unsigned char *>(view->address());

    jsi::Array result(rt, toIndex - fromIndex);
    for (TRUInteger index = fromIndex; index < toIndex; index++) {
        // A copy, so the codec reads an aligned struct whatever the alignment of the address is.
        std::memcpy(storage, base + index * codec->size, codec->size);
        result.setValueAtIndex(rt, index - fromIndex, codec->toJs(rt, storage));
    }
    return jsi::Value(rt, result);
}

} // namespace

std::shared_ptr<HandleObject> KeepAlive(jsi::Runtime &rt, const PointerViewObject &view, const char *function, const char *parameter) {
    const std::shared_ptr<HandleObject> &owner = view.owner();
    if (owner->isDisposed()) {
        marshal::Fail(rt, function, parameter, "is already disposed");
    }
    if (!owner->canDuplicate()) {
        marshal::Fail(rt, function, parameter, "has an owner that cannot be kept alive");
    }
    return owner->Duplicate();
}

std::shared_ptr<RetainedMemory> RetainMemory(jsi::Runtime &rt, const PointerViewObject &view, size_t count,
                                             size_t alignment, const char *function) {
    if (alignment != 1 && alignment != 2 && alignment != 4 && alignment != 8) {
        runtime::FailRange(rt, function, "alignment", "must be 1, 2, 4 or 8");
    }
    if (view.owner()->isDisposed()) {
        marshal::Fail(rt, function, "pointer", "is already disposed");
    }
    RequireFits(rt, function, count, view.elementSize());
    if (reinterpret_cast<uintptr_t>(view.address()) % alignment != 0) {
        runtime::FailRange(rt, function, "pointer", "is not aligned for the elements that were asked for");
    }

    // The reference is taken last: everything above can throw, and nothing owns it until the
    // memory object exists. If making that throws, `keeper` is still ours and releases it.
    std::shared_ptr<HandleObject> keeper = KeepAlive(rt, view, function, "pointer");
    return std::make_shared<RetainedMemory>(std::move(keeper), view.address(), count * view.elementSize());
}

void InstallPointerBindings(jsi::Runtime &runtime, jsi::Object &target) {
    Define(runtime, target, "createPointerBuffer", 3, CreatePointerBuffer);
    Define(runtime, target, "readPointerStructs", 4, ReadPointerStructs);
}

} // namespace tehreer
