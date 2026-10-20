#include "PointerBuffers.h"

#ifndef NDEBUG

#include "../generated/GeneratedSupport.h"
#include "Errors.h"
#include "HandleObject.h"

#include <atomic>
#include <cstddef>
#include <cstdlib>
#include <cstring>
#include <new>
#include <memory>
#include <thread>
#include <utility>

namespace tehreer {

namespace jsi = facebook::jsi;

namespace {

constexpr const char *kProbeGroup = "TRMemoryProbe";

void Define(jsi::Runtime &runtime, jsi::Object &target, const char *name, unsigned int parameters, jsi::HostFunctionType function) {
    target.setProperty(runtime, name, jsi::Function::createFromHostFunction(
        runtime, jsi::PropNameID::forAscii(runtime, name), parameters, std::move(function)));
}

// An object with a reference count of its own, standing in for an object of Core that owns memory:
// it is freed when the last reference is released, whichever thread that is. The memory is a block
// of its own that a mutable probe can free and replace while the object lives, as a setter of Core
// does (`TRShapingEngineSetOpenTypeFeatures` frees the array that an earlier getter pointed into);
// the old block is filled with 0xDD first so that a read through a stale pointer shows it.
struct MemoryBlock {
    static constexpr size_t kCapacity = 256;
    static constexpr unsigned char kPoison = 0xDD;

    std::atomic<int> references{1};
    size_t size = 0;
    unsigned char *data = nullptr;

    // malloc is aligned for any scalar, which the alignment tests rely on.
    void Assign(const unsigned char *bytes, size_t length) {
        size_t capacity = length < 16 ? 16 : length;
        auto *fresh = static_cast<unsigned char *>(std::malloc(capacity));
        if (fresh == nullptr) {
            throw std::bad_alloc();
        }
        std::memset(fresh, 0, capacity);
        std::memcpy(fresh, bytes, length);

        Free();
        data = fresh;
        size = length;
        capacity_ = capacity;
    }

    void Free() {
        if (data != nullptr) {
            std::memset(data, kPoison, capacity_);
            std::free(data);
            data = nullptr;
        }
    }

    ~MemoryBlock() { Free(); }

private:
    size_t capacity_ = 0;
};

std::atomic<int> gBlocksAlive{0};

void RetainBlock(void *ref) {
    static_cast<MemoryBlock *>(ref)->references.fetch_add(1);
}

void ReleaseBlock(void *ref) {
    auto *block = static_cast<MemoryBlock *>(ref);
    if (block->references.fetch_sub(1) == 1) {
        gBlocksAlive.fetch_sub(1);
        delete block;
    }
}

struct Bytes {
    const unsigned char *data;
    size_t size;
};

Bytes ReadBytes(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter) {
    marshal::ConstBuffer buffer = marshal::ToConstBuffer(rt, value, function, parameter, false);
    return { static_cast<const unsigned char *>(buffer.data), buffer.byteLength };
}

// The block of a probe that is not disposed.
MemoryBlock *RequireBlock(jsi::Runtime &rt, const jsi::Value &value, const char *function, const char *parameter) {
    std::shared_ptr<HandleObject> handle = AsHandleObject(rt, value);
    if (!handle || std::strcmp(handle->group(), kProbeGroup) != 0) {
        marshal::Fail(rt, function, parameter, "is not a memory probe");
    }
    if (handle->isDisposed()) {
        marshal::Fail(rt, function, parameter, "is already disposed");
    }
    return static_cast<MemoryBlock *>(handle->ref());
}

size_t RequireOffset(jsi::Runtime &rt, const jsi::Value &value, const char *function, size_t limit) {
    if (value.isUndefined()) {
        return 0;
    }
    TRUInteger offset = marshal::ToIndex(rt, value, function, "byteOffset");
    if (offset > limit) {
        runtime::FailRange(rt, function, "byteOffset", "is past the end of the block");
    }
    return offset;
}

// A handle whose reference is a block that holds a copy of the bytes. It can be retained, like the
// handle of any object of Core, so everything that a list does to its owner can be done to it.
jsi::Value CreateMemoryProbe(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "testCreateMemoryProbe";
    Bytes bytes = ReadBytes(rt, marshal::ArgAt(args, count, 0), kFunction, "bytes");
    if (bytes.size > MemoryBlock::kCapacity) {
        runtime::FailRange(rt, kFunction, "bytes", "is bigger than a block");
    }

    // Mutable only when asked, as only some objects of Core can change what they own. A list over a
    // mutable owner must not keep a pointer or a length (see CoreMemory).
    const jsi::Value &mutableFlag = marshal::ArgAt(args, count, 1);
    bool isMutable = !mutableFlag.isUndefined() && marshal::ToBoolean(rt, mutableFlag, kFunction, "mutable");

    auto *block = new MemoryBlock();
    gBlocksAlive.fetch_add(1);

    // Until the handle exists the block is ours to release.
    try {
        block->Assign(bytes.data, bytes.size);
        auto handle = std::make_shared<HandleObject>(block, kProbeGroup, isMutable, &ReleaseBlock, &RetainBlock);
        return jsi::Value(jsi::Object::createFromHostObject(rt, std::move(handle)));
    } catch (...) {
        ReleaseBlock(block);
        throw;
    }
}

// The pointer that a `*Ptr()` getter would give for the block, `byteOffset` bytes in, so that a test
// can also make an address that is not aligned.
jsi::Value GetMemoryProbeView(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "testGetMemoryProbeView";
    MemoryBlock *block = RequireBlock(rt, marshal::ArgAt(args, count, 0), kFunction, "probe");
    const jsi::Value &element = marshal::ArgAt(args, count, 1);
    if (!element.isString()) {
        marshal::Fail(rt, kFunction, "element", "must be a string");
    }
    std::string name = element.getString(rt).utf8(rt);
    TRUInteger elementSize = marshal::ToIndex(rt, marshal::ArgAt(args, count, 2), kFunction, "elementSize");
    size_t offset = RequireOffset(rt, marshal::ArgAt(args, count, 3), kFunction, block->size);

    // A zero size has no elements; the functions that read a view refuse it by name.
    size_t elements = elementSize == 0 ? 0 : (block->size - offset) / elementSize;

    return marshal::MakePointerView(rt, block->data + offset, name.c_str(), elementSize, elements, marshal::ArgAt(args, count, 0));
}

// Frees the memory of a mutable probe and gives it new bytes (of any length) elsewhere, while the
// object lives: what a setter of Core does to the array that a getter pointed into.
jsi::Value ReplaceMemoryProbe(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "testReplaceMemoryProbe";
    MemoryBlock *block = RequireBlock(rt, marshal::ArgAt(args, count, 0), kFunction, "probe");
    if (!AsHandleObject(rt, marshal::ArgAt(args, count, 0))->isMutable()) {
        marshal::Fail(rt, kFunction, "probe", "is not mutable");
    }
    Bytes bytes = ReadBytes(rt, marshal::ArgAt(args, count, 1), kFunction, "bytes");
    if (bytes.size > MemoryBlock::kCapacity) {
        runtime::FailRange(rt, kFunction, "bytes", "is bigger than a block");
    }

    block->Assign(bytes.data, bytes.size);
    return jsi::Value::undefined();
}

// Changes the memory that a view shows, to see that a list reads it when it is asked and keeps no copy.
jsi::Value WriteMemoryProbe(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "testWriteMemoryProbe";
    MemoryBlock *block = RequireBlock(rt, marshal::ArgAt(args, count, 0), kFunction, "probe");
    size_t offset = RequireOffset(rt, marshal::ArgAt(args, count, 1), kFunction, block->size);
    Bytes bytes = ReadBytes(rt, marshal::ArgAt(args, count, 2), kFunction, "bytes");
    if (bytes.size > block->size - offset) {
        runtime::FailRange(rt, kFunction, "bytes", "does not fit in the block");
    }

    std::memcpy(block->data + offset, bytes.data, bytes.size);
    return jsi::Value::undefined();
}

jsi::Value GetMemoryProbeReferences(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    MemoryBlock *block = RequireBlock(rt, marshal::ArgAt(args, count, 0), "testGetMemoryProbeReferences", "probe");
    return jsi::Value(static_cast<double>(block->references.load()));
}

jsi::Value GetMemoryBlockCount(jsi::Runtime &, const jsi::Value &, const jsi::Value *, size_t) {
    return jsi::Value(static_cast<double>(gBlocksAlive.load()));
}

// What the engine does when it collects a buffer: the memory object ends on a thread that is not the
// JS thread. It must only give its reference back.
jsi::Value DropPointerBufferOnOtherThread(jsi::Runtime &rt, const jsi::Value &, const jsi::Value *args, size_t count) {
    constexpr const char *kFunction = "testDropPointerBufferOnOtherThread";
    std::shared_ptr<PointerViewObject> view = AsPointerView(rt, marshal::ArgAt(args, count, 0));
    if (!view) {
        marshal::Fail(rt, kFunction, "pointer", "is not a pointer that Core gave");
    }
    TRUInteger length = marshal::ToIndex(rt, marshal::ArgAt(args, count, 1), kFunction, "count");

    std::shared_ptr<RetainedMemory> memory = RetainMemory(rt, *view, length, 1, kFunction);
    std::thread([memory = std::move(memory)]() mutable { memory.reset(); }).join();
    return jsi::Value::undefined();
}

} // namespace

void InstallPointerTestHooks(jsi::Runtime &runtime, jsi::Object &target) {
    Define(runtime, target, "testReplaceMemoryProbe", 2, ReplaceMemoryProbe);
    Define(runtime, target, "testCreateMemoryProbe", 2, CreateMemoryProbe);
    Define(runtime, target, "testGetMemoryProbeView", 4, GetMemoryProbeView);
    Define(runtime, target, "testWriteMemoryProbe", 3, WriteMemoryProbe);
    Define(runtime, target, "testGetMemoryProbeReferences", 1, GetMemoryProbeReferences);
    Define(runtime, target, "testGetMemoryBlockCount", 0, GetMemoryBlockCount);
    Define(runtime, target, "testDropPointerBufferOnOtherThread", 2, DropPointerBufferOnOtherThread);
}

} // namespace tehreer

#endif
