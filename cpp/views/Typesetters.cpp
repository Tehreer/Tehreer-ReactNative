#include "Typesetters.h"

#include <limits>
#include <mutex>
#include <new>
#include <unordered_map>

namespace tehreer::views {
namespace {

struct Table {
    std::mutex mutex;
    std::unordered_map<std::int32_t, TRTypesetterRef> typesetters;
    std::int32_t last = 0;
};

// Leaked on purpose: a view can let go of its reference on any thread at process exit.
Table &Shared() {
    static Table *table = new Table();
    return *table;
}

} // namespace

std::int32_t Typesetters::Register(TRTypesetterRef typesetter) {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    try {
        // Skip the ids that are taken, which only happens after the counter has wrapped.
        do {
            table.last = table.last >= std::numeric_limits<std::int32_t>::max() ? 1 : table.last + 1;
        } while (table.typesetters.count(table.last) != 0);
        // Retained once it is in the table, so that a failure to grow it leaves no reference behind.
        table.typesetters.emplace(table.last, typesetter);
        TRTypesetterRetain(typesetter);
    } catch (const std::bad_alloc &) {
        return 0;
    }
    return table.last;
}

void Typesetters::Unregister(std::int32_t id) {
    TRTypesetterRef dropped = nullptr;
    {
        Table &table = Shared();
        std::lock_guard<std::mutex> lock(table.mutex);
        auto found = table.typesetters.find(id);
        if (found != table.typesetters.end()) {
            dropped = found->second;
            table.typesetters.erase(found);
        }
    }
    // Released outside the lock: the last reference destroys the text and its replacements.
    if (dropped != nullptr) {
        TRTypesetterRelease(dropped);
    }
}

TRTypesetterRef Typesetters::Retain(std::int32_t id) {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    auto found = table.typesetters.find(id);
    return found == table.typesetters.end() ? nullptr : TRTypesetterRetain(found->second);
}

std::size_t Typesetters::Count() {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    return table.typesetters.size();
}

} // namespace tehreer::views
