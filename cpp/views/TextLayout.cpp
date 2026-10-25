#include "TextLayout.h"

namespace tehreer::views {

TRComposedFrameRef ComposeFrame(TRTypesetterRef typesetter, float width, float height, const FrameSettings &settings,
                                bool isScrollable, bool isMeasuring) {
    if (typesetter == nullptr || TRTypesetterGetCodeUnitCount(typesetter) == 0) {
        return nullptr;
    }

    TRFrameResolverRef resolver = TRFrameResolverCreate();
    if (resolver == nullptr) {
        return nullptr;
    }

    // Yoga's rounding to the pixel grid can leave the box a hair below the measured frame (224.99997
    // for 225), and the last line then no longer fits and is dropped. A slack far below a pixel keeps
    // what the measurement counted without letting another word in.
    const float slack = isMeasuring ? 0.0f : 0.01f;

    TRSize size;
    size.width = width + slack;
    // An unbounded size is infinity in Yoga, which Core takes as unbounded too.
    size.height = isScrollable ? std::numeric_limits<float>::infinity() : height + slack;
    TRFrameResolverSetTypesetter(resolver, typesetter);
    TRFrameResolverSetFrameSize(resolver, size);
    TRFrameResolverSetFitsHorizontally(resolver, isMeasuring ? TRTrue : TRFalse);
    TRFrameResolverSetFitsVertically(resolver, isMeasuring || isScrollable ? TRTrue : TRFalse);
    TRFrameResolverSetMaxLines(resolver, settings.maxLines);
    TRFrameResolverSetTextAlignment(resolver, settings.textAlignment);
    TRFrameResolverSetTruncationEnabled(resolver, settings.isTruncationEnabled ? TRTrue : TRFalse);
    TRFrameResolverSetTruncationMode(resolver, settings.truncationMode);
    TRFrameResolverSetTruncationPlace(resolver, settings.truncationPlace);
    TRFrameResolverSetExtraLineSpacing(resolver, settings.extraLineSpacing);
    TRFrameResolverSetLineHeightMultiplier(resolver, settings.lineHeightMultiplier);
    TRFrameResolverSetJustificationEnabled(resolver, settings.isJustificationEnabled ? TRTrue : TRFalse);
    TRFrameResolverSetJustificationLevel(resolver, settings.justificationLevel);

    TRComposedFrameRef frame = TRFrameResolverCreateFrame(resolver, 0, TRTypesetterGetCodeUnitCount(typesetter));
    TRFrameResolverRelease(resolver);

    return frame;
}

TRSize MeasureText(TRTypesetterRef typesetter, float maxWidth, float maxHeight, const FrameSettings &settings, bool isScrollable) {
    TRSize size = {0, 0};
    TRComposedFrameRef frame = ComposeFrame(typesetter, maxWidth, maxHeight, settings, isScrollable, true);
    if (frame != nullptr) {
        size.width = TRComposedFrameGetWidth(frame);
        size.height = TRComposedFrameGetHeight(frame);
        TRComposedFrameRelease(frame);
    }
    return size;
}

} // namespace tehreer::views
