#pragma once

#include "ComposedFrameBox.h"

#include <cstdint>
#include <memory>

namespace tehreer::fabric {

/**
 * Hands a frame to a native view that cannot reach the state of its shadow node from Kotlin: the
 * state (which the Android view reads as a map buffer) carries the id of the frame, and the view
 * asks for the frame by it. The registry holds weak references only, so it never keeps a frame
 * alive; a frame removes itself when its last owner lets go. Safe on any thread.
 */
class FrameRegistry final {
public:
    /** Makes the frame findable and returns its id, which is never 0. Registering twice returns the same id. */
    static std::uint32_t Register(const std::shared_ptr<const ComposedFrameBox> &frame);

    /** The frame of an id, or null if it is gone (or the id is 0). The caller owns the share it gets. */
    static std::shared_ptr<const ComposedFrameBox> Find(std::uint32_t id);

    /** Called by the box when it is destroyed. */
    static void Forget(std::uint32_t id) noexcept;
};

} // namespace tehreer::fabric
