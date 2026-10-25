#include "ComposedFrames.h"

#include <limits>
#include <mutex>
#include <new>
#include <unordered_map>

namespace tehreer::views {
namespace {

struct Table {
    std::mutex mutex;
    std::unordered_map<std::int32_t, TRComposedFrameRef> frames;
    std::int32_t last = 0;
};

// Leaked on purpose: a view can let go of its reference on any thread at process exit.
Table &Shared() {
    static Table *table = new Table();
    return *table;
}

} // namespace

std::int32_t ComposedFrames::Register(TRComposedFrameRef frame) {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    try {
        // Skip the ids that are taken, which only happens after the counter has wrapped.
        do {
            table.last = table.last >= std::numeric_limits<std::int32_t>::max() ? 1 : table.last + 1;
        } while (table.frames.count(table.last) != 0);
        // Retained once it is in the table, so that a failure to grow it leaves no reference behind.
        table.frames.emplace(table.last, frame);
        TRComposedFrameRetain(frame);
    } catch (const std::bad_alloc &) {
        return 0;
    }
    return table.last;
}

void ComposedFrames::Unregister(std::int32_t id) {
    TRComposedFrameRef dropped = nullptr;
    {
        Table &table = Shared();
        std::lock_guard<std::mutex> lock(table.mutex);
        auto found = table.frames.find(id);
        if (found != table.frames.end()) {
            dropped = found->second;
            table.frames.erase(found);
        }
    }
    // Released outside the lock: the last reference destroys the text and its replacements.
    if (dropped != nullptr) {
        TRComposedFrameRelease(dropped);
    }
}

TRComposedFrameRef ComposedFrames::Retain(std::int32_t id) {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    auto found = table.frames.find(id);
    return found == table.frames.end() ? nullptr : TRComposedFrameRetain(found->second);
}

std::size_t ComposedFrames::Count() {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    return table.frames.size();
}

} // namespace tehreer::views
