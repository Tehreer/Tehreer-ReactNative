#pragma once

#include <Tehreer/Tehreer.h>

#include <cstddef>
#include <limits>

namespace tehreer::views {

/**
 * The settings of the frame resolver that the views expose, in the order of the `frameSettings` prop
 * (JavaScript resolves every default, so the native side only reads numbers). The defaults are Core's.
 */
struct FrameSettings {
    TRUInteger maxLines = 0;
    TRTextAlignment textAlignment = TRTextAlignmentLeading;
    bool isTruncationEnabled = false;
    TRBreakMode truncationMode = TRBreakModeLine;
    TRTruncationPlace truncationPlace = TRTruncationPlaceEnd;
    float extraLineSpacing = 0;
    float lineHeightMultiplier = 1;
    bool isJustificationEnabled = false;
    float justificationLevel = 1;

    static constexpr std::size_t kCount = 9;

    /** Reads the prop; fewer numbers than `kCount` leave the rest at the default. */
    template <typename Number>
    static FrameSettings From(const Number *values, std::size_t count) {
        FrameSettings settings;
        if (count >= kCount) {
            settings.maxLines = static_cast<TRUInteger>(values[0]);
            settings.textAlignment = static_cast<TRTextAlignment>(values[1]);
            settings.isTruncationEnabled = values[2] != 0;
            settings.truncationMode = static_cast<TRBreakMode>(values[3]);
            settings.truncationPlace = static_cast<TRTruncationPlace>(values[4]);
            settings.extraLineSpacing = static_cast<float>(values[5]);
            settings.lineHeightMultiplier = static_cast<float>(values[6]);
            settings.isJustificationEnabled = values[7] != 0;
            settings.justificationLevel = static_cast<float>(values[8]);
        }
        return settings;
    }
};

/**
 * Lays a typesetter out into a frame, with the calls that the JavaScript `FrameResolver` makes, so
 * that Yoga's measurement (the shadow thread) and a view (the UI or a layout thread) agree with each
 * other and with the JavaScript API. Runs no JavaScript, and may be called from any thread.
 *
 * @param isScrollable A scrolling view lays out the whole text, however tall, for the width.
 * @param isMeasuring Measuring fits the frame to its lines; painting keeps the box that the layout
 *      chose, so the lines keep their alignment inside it.
 * @return An owned frame, or `NULL` if there is no typesetter or Core is out of memory.
 */
TRComposedFrameRef ComposeFrame(TRTypesetterRef typesetter, float width, float height, const FrameSettings &settings,
                                bool isScrollable, bool isMeasuring);

/**
 * The size of the frame for the largest size Yoga allows, which is what the shadow node returns.
 * Zero by zero when there is no typesetter or no text.
 */
TRSize MeasureText(TRTypesetterRef typesetter, float maxWidth, float maxHeight, const FrameSettings &settings, bool isScrollable);

} // namespace tehreer::views
