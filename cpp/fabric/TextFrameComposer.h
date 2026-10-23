#pragma once

#include "ComposedFrameBox.h"

#include <cstdint>
#include <limits>
#include <memory>
#include <string_view>

namespace tehreer::fabric {

/**
 * Everything the frame of a plain string depends on. The text is UTF-16, the indices of the frame
 * are code units of it.
 */
struct TextFrameSpec {
    std::u16string_view text;
    /** The tag of a typeface in Core's `TRTypefaceManager`; 0 means none. */
    std::uint32_t typefaceTag = 0;
    float typeSize = 0;
    /** 0 means no limit, as in `TRFrameResolverSetMaxLines`. */
    std::uint32_t maxLines = 0;
    /** The size of the frame; infinity is unbounded (a NaN or negative one Core takes as zero). */
    float width = std::numeric_limits<float>::infinity();
    float height = std::numeric_limits<float>::infinity();
    /**
     * Whether the frame is as wide (tall) as its lines instead of the size above. Measuring fits
     * both, because the measured size is the bounds of the lines; painting at the size Yoga chose
     * does not fit the width, so that the alignment of the lines is kept inside the box.
     */
    bool fitsWidth = true;
    bool fitsHeight = true;
};

enum class ComposeStatus {
    Composed,
    /** No code units: Core does not make a frame of an empty range, and nothing is drawn. */
    EmptyText,
    /** The tag is 0 or no registered typeface has it. */
    MissingTypeface,
    /** Zero, negative or not a finite number. */
    InvalidTypeSize,
    /** Core returned `NULL`, which it does when it is out of memory. */
    Failed,
};

struct TextFrame {
    ComposeStatus status = ComposeStatus::Failed;
    /** Set only when `status` is `Composed`. */
    std::shared_ptr<const ComposedFrameBox> frame;
};

/**
 * Lays a plain string out with Core: Typesetter, FrameResolver, ComposedFrame, the same calls as
 * the JavaScript API (`Typesetter`, `FrameResolver.createFrame`), and the same numbers. It is
 * synchronous, runs no JavaScript and may be called from any thread, which is what Yoga's measure
 * function needs.
 *
 * The text has the one typeface and size given, and no attributes. In particular it has no
 * replacement: the `computeRoom` of a replacement is JavaScript, and Core calls it only on the
 * thread of the runtime that made it (anything else gets a room of zero), which is not the thread
 * Yoga measures on. A caller that composes attributed text must refuse text with a replacement.
 */
TextFrame ComposeFrame(const TextFrameSpec &spec);

} // namespace tehreer::fabric
