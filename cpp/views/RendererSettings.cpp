#include "RendererSettings.h"

namespace tehreer::views {

void RendererSettings::Apply(TRRendererRef renderer) const {
    TRRendererSetForegroundColor(renderer, textColor);
    TRRendererSetDrawStyle(renderer, drawStyle);
    TRRendererSetStrokeColor(renderer, strokeColor);
    TRRendererSetStrokeRadius(renderer, strokeRadius);
    TRRendererSetStrokeCap(renderer, strokeCap);
    TRRendererSetStrokeJoin(renderer, strokeJoin);
    TRRendererSetStrokeMiter(renderer, strokeMiter);
    TRRendererSetShadowColor(renderer, shadowColor);
    TRRendererSetShadowRadius(renderer, shadowRadius);
    TRRendererSetShadowDx(renderer, shadowDx);
    TRRendererSetShadowDy(renderer, shadowDy);
}

} // namespace tehreer::views
