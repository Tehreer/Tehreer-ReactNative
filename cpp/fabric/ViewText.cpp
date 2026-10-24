#include "ViewText.h"

#include <mutex>
#include <utility>
#include <unordered_map>

namespace tehreer::fabric {
namespace {

struct Table {
    std::mutex mutex;
    std::unordered_map<std::uint32_t, std::shared_ptr<const ViewText>> texts;
    std::uint32_t last = 0;
};

// Leaked on purpose: a text can be released on any thread at process exit.
Table &Shared() {
    static Table *table = new Table();
    return *table;
}

} // namespace

std::uint32_t ViewTextRegistry::Register(std::shared_ptr<const ViewText> text) {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    std::uint32_t id = ++table.last;
    if (id == 0) {
        id = ++table.last;
    }
    table.texts.emplace(id, std::move(text));
    return id;
}

std::shared_ptr<const ViewText> ViewTextRegistry::Find(std::uint32_t id) {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    auto found = table.texts.find(id);
    return found == table.texts.end() ? nullptr : found->second;
}

void ViewTextRegistry::Unregister(std::uint32_t id) noexcept {
    std::shared_ptr<const ViewText> dropped;
    {
        Table &table = Shared();
        std::lock_guard<std::mutex> lock(table.mutex);
        auto found = table.texts.find(id);
        if (found != table.texts.end()) {
            dropped = std::move(found->second);
            table.texts.erase(found);
        }
    }
    // The last share, if this is it, is released outside the lock.
}

std::size_t ViewTextRegistry::Count() {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    return table.texts.size();
}

} // namespace tehreer::fabric
