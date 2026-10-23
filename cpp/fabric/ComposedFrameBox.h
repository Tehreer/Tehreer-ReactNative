#pragma once

#include <Tehreer/TRComposedFrame.h>

#include <cstddef>

namespace tehreer::fabric {

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
    explicit ComposedFrameBox(TRComposedFrameRef frame) noexcept : _frame(frame) {}
    ~ComposedFrameBox() { TRComposedFrameRelease(_frame); }

    ComposedFrameBox(const ComposedFrameBox &) = delete;
    ComposedFrameBox &operator=(const ComposedFrameBox &) = delete;

    /** Borrowed: valid as long as this box is. */
    TRComposedFrameRef get() const noexcept { return _frame; }

    float width() const noexcept { return TRComposedFrameGetWidth(_frame); }
    float height() const noexcept { return TRComposedFrameGetHeight(_frame); }
    std::size_t lineCount() const noexcept { return TRComposedFrameGetLineCount(_frame); }

private:
    TRComposedFrameRef _frame;
};

} // namespace tehreer::fabric
