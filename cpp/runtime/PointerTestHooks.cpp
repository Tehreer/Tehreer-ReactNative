#include "PointerBuffers.h"

#ifndef NDEBUG

#include "../generated/GeneratedSupport.h"
#include "Errors.h"
#include "HandleObject.h"

#include <atomic>
#include <cstddef>
#include <cstring>
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

// A block of memory with a reference count of its own, standing in for an object of Core that owns
// memory: it is freed when the last reference is released, whichever thread that is.
struct MemoryBlock {
    static constexpr size_t kCapacity = 256;

    std::atomic<int> references{1};
    size_t size = 0;
    alignas(16) unsigned char data[kCapacity];
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

    auto *block = new MemoryBlock();
    block->size = bytes.size;
    std::memset(block->data, 0, sizeof(block->data));
    std::memcpy(block->data, bytes.data, bytes.size);
    gBlocksAlive.fetch_add(1);

    // Until the handle exists the block is ours to release.
    try {
        auto handle = std::make_shared<HandleObject>(block, kProbeGroup, true, &ReleaseBlock, &RetainBlock);
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

    return marshal::MakePointerView(rt, block->data + offset, name.c_str(), elementSize, marshal::ArgAt(args, count, 0));
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
    Define(runtime, target, "testCreateMemoryProbe", 1, CreateMemoryProbe);
    Define(runtime, target, "testGetMemoryProbeView", 4, GetMemoryProbeView);
    Define(runtime, target, "testWriteMemoryProbe", 3, WriteMemoryProbe);
    Define(runtime, target, "testGetMemoryProbeReferences", 1, GetMemoryProbeReferences);
    Define(runtime, target, "testGetMemoryBlockCount", 0, GetMemoryBlockCount);
    Define(runtime, target, "testDropPointerBufferOnOtherThread", 2, DropPointerBufferOnOtherThread);
}

} // namespace tehreer

#endif
