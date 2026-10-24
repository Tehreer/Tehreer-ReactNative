#include "StaticReplacements.h"

#include <mutex>
#include <utility>
#include <new>
#include <unordered_map>

namespace tehreer::fabric {
namespace {

struct Entry {
    /** The key of this entry in the table; set before the entry is inserted. */
    const void *replacement = nullptr;
    TRReplacementRoom room;
    std::shared_ptr<const ReplacementPaint> paint;
};

struct Table {
    std::mutex mutex;
    // Keyed by the address of the Core replacement, which Core cannot give the userData back for.
    std::unordered_map<const void *, std::shared_ptr<Entry>> entries;
};

// Leaked on purpose: a replacement can be finalized on any thread at process exit.
Table &Shared() {
    static Table *table = new Table();
    return *table;
}

// The userData is the Entry itself: Core never reads it, and the callbacks only use it for the room
// while the replacement is alive, which the table's share of the entry also guarantees.
void ComputeRoom(void *userData, TRFloat /*layoutWidth*/, TRReplacementRoom *room) noexcept {
    *room = static_cast<const Entry *>(userData)->room;
}

void Finalize(void *userData) noexcept {
    Table &table = Shared();
    std::shared_ptr<Entry> dropped;
    {
        // Constant time under the lock: the entry names its own key. An entry that never got into
        // the table (a failed Create) finds nothing, which is fine.
        const void *key = static_cast<const Entry *>(userData)->replacement;
        std::lock_guard<std::mutex> lock(table.mutex);
        auto found = table.entries.find(key);
        if (found != table.entries.end() && found->second.get() == userData) {
            dropped = std::move(found->second);
            table.entries.erase(found);
        }
    }
}

} // namespace

TRReplacementRef StaticReplacements::Create(TRReplacementKind kind, TRReplacementRoom room, std::shared_ptr<const ReplacementPaint> paint) {
    std::shared_ptr<Entry> entry;
    try {
        entry = std::make_shared<Entry>();
        entry->room = room;
        entry->paint = std::move(paint);
    } catch (const std::bad_alloc &) {
        return nullptr;
    }

    TRReplacementCallbacks callbacks = {};
    callbacks.computeRoom = &ComputeRoom;
    callbacks.finalize = &Finalize;

    // The entry is in the table before Core can finalize the replacement, and the table lock is
    // not held across the Core call (finalize takes it).
    Table &table = Shared();
    TRReplacementRef replacement = TRReplacementCreate(&callbacks, entry.get(), kind);
    if (replacement == nullptr) {
        return nullptr;
    }
    entry->replacement = replacement;
    try {
        std::lock_guard<std::mutex> lock(table.mutex);
        table.entries.emplace(replacement, entry);
    } catch (...) {
        // Releasing the only reference calls Finalize, which finds nothing and does no harm.
        TRReplacementRelease(replacement);
        return nullptr;
    }
    return replacement;
}

std::shared_ptr<const ReplacementPaint> StaticReplacements::FindPaint(TRReplacementRef replacement) {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    auto found = table.entries.find(replacement);
    return found == table.entries.end() ? nullptr : found->second->paint;
}

bool StaticReplacements::IsStatic(TRReplacementRef replacement) {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    return table.entries.find(replacement) != table.entries.end();
}

std::size_t StaticReplacements::LiveCount() {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    return table.entries.size();
}

} // namespace tehreer::fabric
