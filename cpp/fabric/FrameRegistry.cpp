#include "FrameRegistry.h"

#include <mutex>
#include <unordered_map>

namespace tehreer::fabric {
namespace {

struct Registry {
    std::mutex mutex;
    std::unordered_map<std::uint32_t, std::weak_ptr<const ComposedFrameBox>> frames;
};

// Leaked on purpose: the last frame can be released on any thread during process exit.
Registry &Shared() {
    static Registry *registry = new Registry();
    return *registry;
}

} // namespace

std::uint32_t FrameRegistry::Register(const std::shared_ptr<const ComposedFrameBox> &frame) {
    if (!frame) {
        return 0;
    }

    Registry &registry = Shared();
    std::lock_guard<std::mutex> lock(registry.mutex);
    registry.frames[frame->id()] = frame;
    return frame->id();
}

std::shared_ptr<const ComposedFrameBox> FrameRegistry::Find(std::uint32_t id) {
    Registry &registry = Shared();
    std::lock_guard<std::mutex> lock(registry.mutex);
    auto found = registry.frames.find(id);
    // lock() fails for a frame whose last owner is releasing it right now: that is "gone".
    return found == registry.frames.end() ? nullptr : found->second.lock();
}

void FrameRegistryAccess::Forget(std::uint32_t id) noexcept {
    FrameRegistry::Forget(id);
}

void FrameRegistry::Forget(std::uint32_t id) noexcept {
    Registry &registry = Shared();
    std::lock_guard<std::mutex> lock(registry.mutex);
    registry.frames.erase(id);
}

} // namespace tehreer::fabric
