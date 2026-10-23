#pragma once

#include <Tehreer/TRComposedFrame.h>

#include <atomic>
#include <cstddef>
#include <cstdint>

namespace tehreer::fabric {

// Defined in FrameRegistry.cpp; the box tells the registry when it dies.
struct FrameRegistryAccess {
    static void Forget(std::uint32_t id) noexcept;
};

/**
 * Owns one reference of a composed frame, so that the frame lives exactly as long as the last
 * `shared_ptr<const ComposedFrameBox>` that holds it: the shadow node's state, the state objects
 * of the older revisions that the mounting layer still holds, and a native view that is painting.
 * The destructor only calls `TRComposedFrameRelease`, which is thread safe, because the last owner
 * can be released on the UI thread, the JavaScript thread or a background thread.
 *
 * A frame is immutable, so any thread may read it. Nothing may keep the raw `TRComposedFrameRef`
 * beyond the box that it came from; a painter that needs it for longer retains it itself.
 */
class ComposedFrameBox final {
public:
    /** Takes over one reference, which must not be `NULL`. */
    explicit ComposedFrameBox(TRComposedFrameRef frame) noexcept : _frame(frame), _id(NextId()) {}
    ~ComposedFrameBox() {
        FrameRegistryAccess::Forget(_id);
        TRComposedFrameRelease(_frame);
    }

    ComposedFrameBox(const ComposedFrameBox &) = delete;
    ComposedFrameBox &operator=(const ComposedFrameBox &) = delete;

    /** Names the frame to a native view (see `FrameRegistry`); never 0, unique for the process. */
    std::uint32_t id() const noexcept { return _id; }

    /** Borrowed: valid as long as this box is. */
    TRComposedFrameRef get() const noexcept { return _frame; }

    float width() const noexcept { return TRComposedFrameGetWidth(_frame); }
    float height() const noexcept { return TRComposedFrameGetHeight(_frame); }
    std::size_t lineCount() const noexcept { return TRComposedFrameGetLineCount(_frame); }

private:
    static std::uint32_t NextId() noexcept {
        static std::atomic<std::uint32_t> last{0};
        std::uint32_t id = last.fetch_add(1, std::memory_order_relaxed) + 1;
        // Wrapping past 2^32 frames would reach 0, which means "no frame".
        return id != 0 ? id : last.fetch_add(1, std::memory_order_relaxed) + 1;
    }

    TRComposedFrameRef _frame;
    std::uint32_t _id;
};

} // namespace tehreer::fabric
