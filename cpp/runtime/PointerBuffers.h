#pragma once

#include "PointerViews.h"

#include <jsi/jsi.h>

#include <cstddef>
#include <cstdint>
#include <memory>

namespace tehreer {

/**
 * The memory behind an `ArrayBuffer` that points into an object of Core. It holds a reference of
 * its own to that object (a duplicate of the handle that owns the memory), so the memory stays
 * valid for as long as the engine keeps the buffer, whatever happens to the handle: it can be
 * disposed, and the buffer does not need to be touched again for that to be safe. The reference
 * goes back to Core when the engine frees the buffer, which can happen on any thread during a
 * collection, so the destructor releases the reference and does nothing else (no JavaScript).
 *
 * The bytes belong to Core, which documents them as immutable: nothing in JavaScript may write to
 * them. An `ArrayBuffer` cannot be made read-only, so this holds because the library never gives
 * the buffer out: the TypeScript lists read it and copy (`toTypedArray`). The size of a buffer is
 * bounded by the count that the view recorded, never by an argument alone.
 *
 * The reference keeps the Core object alive, not an array that a setter of a mutable object frees
 * while it lives; a list over a mutable owner therefore never keeps a buffer (see `CoreMemory`).
 */
class RetainedMemory final : public facebook::jsi::MutableBuffer {
public:
    RetainedMemory(std::shared_ptr<HandleObject> keeper, const void *data, size_t size)
        : _keeper(std::move(keeper)), _data(static_cast<uint8_t *>(const_cast<void *>(data))), _size(size) {}

    size_t size() const override { return _size; }
    uint8_t *data() override { return _data; }

private:
    std::shared_ptr<HandleObject> _keeper;
    uint8_t *_data;
    size_t _size;
};

/**
 * Checks that the owner of the view is not disposed and can be kept alive, and returns a handle
 * that holds a reference of its own to it. Throws "already disposed" for a disposed owner.
 */
std::shared_ptr<HandleObject> KeepAlive(facebook::jsi::Runtime &rt, const PointerViewObject &view, const char *function, const char *parameter);

/**
 * `count` elements of the view as one block of memory that keeps the owner alive. Throws a
 * `RangeError` if `count` elements do not fit in the address space or the address is not a
 * multiple of `alignment`, which the typed array that will read it needs.
 */
std::shared_ptr<RetainedMemory> RetainMemory(facebook::jsi::Runtime &rt, const PointerViewObject &view, size_t count,
                                             size_t alignment, const char *function);

/** `createPointerBuffer` and `readPointerStructs`, which release builds contain too. */
void InstallPointerBindings(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);

#ifndef NDEBUG
/** The `test*` functions for pointers and lists, which only debug builds contain. */
void InstallPointerTestHooks(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);
#endif

} // namespace tehreer
