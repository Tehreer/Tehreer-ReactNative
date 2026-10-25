#pragma once

#include <Tehreer/Tehreer.h>

#include <cstddef>
#include <limits>

namespace tehreer::views {

/**
 * The settings of the frame resolver that the label exposes: the props of the same names of
 * `TLinePaint`, which JavaScript resolves (the defaults are Core's), so the native side only reads
 * numbers.
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

    /** Reads the props of the component (`Props` has the members of this struct, by name). */
    template <typename Props>
    static FrameSettings From(const Props &props) {
        FrameSettings settings;
        settings.maxLines = static_cast<TRUInteger>(props.maxLines);
        settings.textAlignment = static_cast<TRTextAlignment>(props.textAlignment);
        settings.isTruncationEnabled = props.isTruncationEnabled;
        settings.truncationMode = static_cast<TRBreakMode>(props.truncationMode);
        settings.truncationPlace = static_cast<TRTruncationPlace>(props.truncationPlace);
        settings.extraLineSpacing = static_cast<float>(props.extraLineSpacing);
        settings.lineHeightMultiplier = static_cast<float>(props.lineHeightMultiplier);
        settings.isJustificationEnabled = props.isJustificationEnabled;
        settings.justificationLevel = static_cast<float>(props.justificationLevel);
        return settings;
    }
};

/**
 * The size of the frame for the largest size Yoga allows, which is what the shadow node returns for
 * a label: the frame is fitted to its lines, as the JavaScript `FrameResolver` does with the same
 * calls. Runs no JavaScript, and may be called from any thread. Zero by zero when there is no
 * typesetter or no text.
 */
TRSize MeasureText(TRTypesetterRef typesetter, float maxWidth, float maxHeight, const FrameSettings &settings);

} // namespace tehreer::views
