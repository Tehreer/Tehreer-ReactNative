#include "ViewText.h"

#include "StaticReplacements.h"
#include <limits>
#include <new>

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

bool HasOnlyStaticReplacements(TRTextRef text) {
    const TRUInteger length = TRTextGetLength(text);
    TRUInteger index = 0;
    while (index < length) {
        TRUInteger runLength = 0;
        TRAttributeListRef list = TRTextCopyAttributes(text, index, &runLength);
        if (list == nullptr || runLength == 0) {
            if (list != nullptr) {
                TRAttributeListRelease(list);
            }
            // No list or no progress cannot be told from a failure: refuse.
            return false;
        }

        bool isStatic = true;
        const TRUInteger count = TRAttributeListGetCount(list);
        for (TRUInteger i = 0; i < count && isStatic; i++) {
            const TRAttribute *attribute = TRAttributeListGetItem(list, i);
            isStatic = attribute->type != TRAttributeReplacement || StaticReplacements::IsStatic(attribute->value.replacement);
        }
        TRAttributeListRelease(list);
        if (!isStatic) {
            return false;
        }
        index += runLength;
    }
    return true;
}

} // namespace

std::shared_ptr<const ViewText> ViewText::Make(TRTextRef text, TRTypefaceRef typeface, float typeSize) {
    if (!HasOnlyStaticReplacements(text)) {
        return nullptr;
    }
    // The constructor is private, so make_shared cannot reach it.
    return std::shared_ptr<const ViewText>(new ViewText(text, typeface, typeSize));
}

std::uint32_t ViewTextRegistry::Register(std::shared_ptr<const ViewText> text) {
    Table &table = Shared();
    std::lock_guard<std::mutex> lock(table.mutex);
    // The prop is an Int32, so ids stop at INT32_MAX and start over.
    table.last = table.last >= static_cast<std::uint32_t>(std::numeric_limits<std::int32_t>::max()) ? 1 : table.last + 1;
    const std::uint32_t id = table.last;
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
