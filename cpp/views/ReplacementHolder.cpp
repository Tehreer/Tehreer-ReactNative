#include "ReplacementHolder.h"

#include <mutex>
#include <new>
#include <unordered_map>

namespace tehreer::views {

namespace {

struct Table {
    std::mutex mutex;
    // Keyed by the address of the Core replacement, which is what a run reports to the drawer.
    std::unordered_map<const void *, ReplacementHolder *> holders;
};

// Leaked on purpose: a replacement can be finalized on any thread at process exit.
Table &Shared() {
    static Table *table = new Table();
    return *table;
}

// Core may call this from any thread, and the holder is immutable after `Create`.
void ComputeRoom(void *userData, TRFloat /*layoutWidth*/, TRReplacementRoom *room) noexcept {
    *room = static_cast<const ReplacementHolder *>(userData)->room;
}

void Finalize(void *userData) noexcept {
    auto *holder = static_cast<ReplacementHolder *>(userData);
    Table &table = Shared();
    {
        // Constant time: the holder knows its own key. One that never got into the table finds nothing.
        std::lock_guard<std::mutex> lock(table.mutex);
        auto found = table.holders.find(holder->replacement);
        if (found != table.holders.end() && found->second == holder) {
            table.holders.erase(found);
        }
    }
    delete holder;
}

} // namespace

TRReplacementRef ReplacementHolder::Create(TRReplacementKind kind, TRReplacementRoom room, std::vector<ReplacementRect> rects) {
    auto *holder = new ReplacementHolder{room, std::move(rects), nullptr};

    TRReplacementCallbacks callbacks = {};
    callbacks.computeRoom = &ComputeRoom;
    callbacks.finalize = &Finalize;

    // Nothing can reach the replacement before this returns (no text holds it yet), and the table
    // lock is not held across the Core call, because `Finalize` takes it.
    TRReplacementRef replacement = TRReplacementCreate(&callbacks, holder, kind);
    if (replacement == nullptr) {
        // Core made nothing, so it will never call finalize.
        delete holder;
        return nullptr;
    }

    holder->replacement = replacement;
    Table &table = Shared();
    try {
        std::lock_guard<std::mutex> lock(table.mutex);
        table.holders.emplace(replacement, holder);
    } catch (const std::bad_alloc &) {
        // The release calls Finalize, which finds no entry and deletes the holder.
        TRReplacementRelease(replacement);
        return nullptr;
    }
    return replacement;
}

const ReplacementHolder *ReplacementHolder::Find(TRReplacementRef replacement) {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    auto found = table.holders.find(replacement);
    return found == table.holders.end() ? nullptr : found->second;
}

bool ReplacementHolder::IsHolder(TRReplacementRef replacement) {
    return Find(replacement) != nullptr;
}

std::size_t ReplacementHolder::Count() {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    return table.holders.size();
}

} // namespace tehreer::views
