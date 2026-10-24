#pragma once

#include "ViewText.h"

#include <Tehreer/TRComposedFrame.h>

#include <atomic>
#include <cstddef>
#include <cstdint>
#include <memory>
#include <mutex>
#include <utility>

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
    /**
     * Takes over one reference, which must not be `NULL`. `source` is the text the frame was
     * composed from (null for a plain string); it is retired together with the frame.
     */
    explicit ComposedFrameBox(TRComposedFrameRef frame, std::shared_ptr<const ViewText> source = nullptr) noexcept
        : _frame(frame),
          _id(NextId()),
          _width(TRComposedFrameGetWidth(frame)),
          _height(TRComposedFrameGetHeight(frame)),
          _lineCount(TRComposedFrameGetLineCount(frame)),
          _source(std::move(source)) {
        LiveCount().fetch_add(1, std::memory_order_relaxed);
    }
    ~ComposedFrameBox() {
        LiveCount().fetch_sub(1, std::memory_order_relaxed);
        FrameRegistryAccess::Forget(_id);
        Retire(false);
    }

    ComposedFrameBox(const ComposedFrameBox &) = delete;
    ComposedFrameBox &operator=(const ComposedFrameBox &) = delete;

    /** How many state data objects of the views are alive; counted by the state, kept here to stay free of React Native's headers. */
    static std::atomic<int> &StateCount() noexcept {
        static std::atomic<int> count{0};
        return count;
    }

    /** How many boxes are alive; for the tests, which look for a state that keeps a frame. */
    static std::atomic<int> &LiveCount() noexcept {
        static std::atomic<int> count{0};
        return count;
    }

    /** Names the frame to a native view (see `FrameRegistry`); never 0, unique for the process. */
    std::uint32_t id() const noexcept { return _id; }

    /**
     * A reference of the frame of its own, which the caller releases (`TRComposedFrameRelease`), or
     * `NULL` after `Retire`. Painters take one for the length of a draw, so that `Retire` on
     * another thread cannot free the frame under them.
     */
    TRComposedFrameRef Acquire() const noexcept {
        std::lock_guard<std::mutex> lock(_mutex);
        return _frame == nullptr ? nullptr : TRComposedFrameRetain(_frame);
    }

    /**
     * Lets go of the frame. React Native keeps the last state of an unmounted node for as long as
     * it likes, and the frame holds Core memory and the data of its replacements, which must not
     * wait for that: a view that stops showing a frame retires it. With `withSource` the text the
     * frame was composed from goes too, which is right only when the node is gone: a frame that a
     * new layout replaced shares its text with the new one. Idempotent, any thread; the size below
     * stays readable.
     */
    void Retire(bool withSource = false) const noexcept {
        {
            std::lock_guard<std::mutex> lock(_mutex);
            if (_frame != nullptr) {
                TRComposedFrameRelease(_frame);
                _frame = nullptr;
            }
        }
        if (withSource && _source) {
            _source->Retire();
        }
    }

    // Read once, when the frame is made, so that they do not need the frame.
    float width() const noexcept { return _width; }
    float height() const noexcept { return _height; }
    std::size_t lineCount() const noexcept { return _lineCount; }

private:
    static std::uint32_t NextId() noexcept {
        static std::atomic<std::uint32_t> last{0};
        std::uint32_t id = last.fetch_add(1, std::memory_order_relaxed) + 1;
        // Wrapping past 2^32 frames would reach 0, which means "no frame".
        return id != 0 ? id : last.fetch_add(1, std::memory_order_relaxed) + 1;
    }

    mutable std::mutex _mutex;
    mutable TRComposedFrameRef _frame;
    std::uint32_t _id;
    float _width;
    float _height;
    std::size_t _lineCount;
    std::shared_ptr<const ViewText> _source;
};

} // namespace tehreer::fabric
