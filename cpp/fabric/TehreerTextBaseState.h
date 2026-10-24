#pragma once

#include "ComposedFrameBox.h"
#include "FrameRegistry.h"
#include "TextFrameComposer.h"

#include <react/renderer/core/ConcreteState.h>
#include <react/renderer/graphics/Float.h>
#include <react/renderer/graphics/Size.h>

#include <atomic>
#include <memory>
#include <string>

#ifdef RN_SERIALIZABLE_STATE
#include <folly/dynamic.h>
#include <react/renderer/mapbuffer/MapBuffer.h>
#include <react/renderer/mapbuffer/MapBufferBuilder.h>
#endif

namespace facebook::react {

/** What the frame of a state was composed from; a layout pass that finds the same key keeps the state. */
struct TehreerTextBaseFrameKey {
    std::string text;
    int typefaceTag{0};
    Float typeSize{0};
    /** The attributed text, 0 for the plain string above. */
    int textId{0};
    tehreer::fabric::FrameSettings settings;
    /** A scrollable view lays the text out as tall as it is, not as tall as its box. */
    bool scrollable{false};
    /** The size of the box (the content frame that Yoga chose). */
    Size size{};

    bool operator==(const TehreerTextBaseFrameKey &other) const = default;
};

/**
 * The state of a `TehreerTextBase` shadow node: the frame that Core composed for the final box,
 * which the native view reads. The frame is shared and immutable, and its last owner releases it,
 * on whichever thread that is.
 */
class TehreerTextBaseStateData final {
public:
    /** How many state data objects are alive (copies included); for the tests. */
    static std::atomic<int> &LiveCount() noexcept { return tehreer::fabric::ComposedFrameBox::StateCount(); }
    TehreerTextBaseStateData() { LiveCount().fetch_add(1); }
    TehreerTextBaseStateData(const TehreerTextBaseStateData &other)
        : key(other.key), status(other.status), frame(other.frame), text(other.text), isComposed(other.isComposed) { LiveCount().fetch_add(1); }
    TehreerTextBaseStateData(TehreerTextBaseStateData &&other) noexcept
        : key(std::move(other.key)), status(other.status), frame(std::move(other.frame)), text(std::move(other.text)), isComposed(other.isComposed) { LiveCount().fetch_add(1); }
    ~TehreerTextBaseStateData() { LiveCount().fetch_sub(1); }
    TehreerTextBaseStateData &operator=(const TehreerTextBaseStateData &) = default;
    TehreerTextBaseStateData &operator=(TehreerTextBaseStateData &&) = default;
    TehreerTextBaseStateData(
        TehreerTextBaseFrameKey key,
        tehreer::fabric::ComposeStatus status,
        std::shared_ptr<const tehreer::fabric::ComposedFrameBox> frame,
        std::shared_ptr<const tehreer::fabric::ViewText> text)
        : key(std::move(key)), status(status), frame(std::move(frame)), text(std::move(text)), isComposed(true) {
        LiveCount().fetch_add(1);
        // The Kotlin view and JavaScript (`acquireViewFrame`) find the frame by this id.
        tehreer::fabric::FrameRegistry::Register(this->frame);
    }

    TehreerTextBaseFrameKey key;
    tehreer::fabric::ComposeStatus status{tehreer::fabric::ComposeStatus::EmptyText};
    /** Null unless `status` is `Composed`. */
    std::shared_ptr<const tehreer::fabric::ComposedFrameBox> frame;
    /**
     * The attributed text the frame was composed from (null for a plain string). It is what makes
     * the lifetime of the text structural: unregistering an id never empties a node that already
     * has its state, however long that node lives and whatever makes it compose again.
     */
    std::shared_ptr<const tehreer::fabric::ViewText> text;
    /** False for the initial state that React Native makes before the first layout: nothing was composed. */
    bool isComposed{false};

#ifdef RN_SERIALIZABLE_STATE
    // The Android state contract wants these. Java never writes this state, so the update from a
    // dynamic keeps the previous data.
    TehreerTextBaseStateData(const TehreerTextBaseStateData &previous, folly::dynamic /*data*/)
        : key(previous.key), status(previous.status), frame(previous.frame), text(previous.text), isComposed(previous.isComposed) { LiveCount().fetch_add(1); }

    folly::dynamic getDynamic() const {
        return folly::dynamic::object("status", static_cast<int>(status))("lineCount", lineCount())("width", frameWidth())(
            "height", frameHeight());
    }

    /**
     * What a Kotlin view can read without JNI: 0 status, 1 line count, 2 and 3 the bounds of the
     * frame, 4 and 5 the box it was composed for, 6 the id of the frame (0 for none), 7 whether a layout composed this state at all that the
     * painter hands to `FrameRegistry::Find` through JNI. The registry only holds weak references,
     * so the id is valid while the state it was read from is alive.
     */
    MapBuffer getMapBuffer() const {
        MapBufferBuilder builder;
        builder.putInt(0, static_cast<int>(status));
        builder.putInt(1, lineCount());
        builder.putDouble(2, frameWidth());
        builder.putDouble(3, frameHeight());
        builder.putDouble(4, key.size.width);
        builder.putDouble(5, key.size.height);
        builder.putInt(6, frame ? static_cast<int>(frame->id()) : 0);
        builder.putInt(7, isComposed ? 1 : 0);
        return builder.build();
    }
#endif

    int lineCount() const { return frame ? static_cast<int>(frame->lineCount()) : 0; }
    double frameWidth() const { return frame ? frame->width() : 0; }
    double frameHeight() const { return frame ? frame->height() : 0; }
};

using TehreerTextBaseState = ConcreteState<TehreerTextBaseStateData>;

} // namespace facebook::react
