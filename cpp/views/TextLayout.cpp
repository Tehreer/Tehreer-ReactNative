#include "TextLayout.h"

namespace tehreer::views {

TRSize MeasureText(TRTypesetterRef typesetter, float maxWidth, float maxHeight, const FrameSettings &settings) {
    TRSize measured = {0, 0};
    if (typesetter == nullptr || TRTypesetterGetCodeUnitCount(typesetter) == 0) {
        return measured;
    }

    TRFrameResolverRef resolver = TRFrameResolverCreate();
    if (resolver == nullptr) {
        return measured;
    }

    // An unbounded size is infinity in Yoga, which Core takes as unbounded too.
    TRSize size;
    size.width = maxWidth;
    size.height = maxHeight;
    TRFrameResolverSetTypesetter(resolver, typesetter);
    TRFrameResolverSetFrameSize(resolver, size);
    // Measuring fits the frame to its lines; the JavaScript `composeViewFrame` then lays out the box
    // that Yoga chose, and keeps the lines that were counted here.
    TRFrameResolverSetFitsHorizontally(resolver, TRTrue);
    TRFrameResolverSetFitsVertically(resolver, TRTrue);
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

    if (frame != nullptr) {
        measured.width = TRComposedFrameGetWidth(frame);
        measured.height = TRComposedFrameGetHeight(frame);
        TRComposedFrameRelease(frame);
    }
    return measured;
}

} // namespace tehreer::views
