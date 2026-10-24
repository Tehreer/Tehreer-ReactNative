#include "RendererSettings.h"

namespace tehreer::views {
namespace {

// A renderer that nothing changes, which says what Core's defaults are. Leaked on purpose, as it is
// read from any thread (the line views of every view, and the layout threads).
TRRendererRef Defaults() {
    static TRRendererRef renderer = TRRendererCreate();
    return renderer;
}

} // namespace

void RendererSettings::Apply(TRRendererRef renderer) const {
    TRRendererRef defaults = Defaults();
    const auto given = [this](int bit) { return (mask & (1u << bit)) != 0; };

    TRRendererSetForegroundColor(renderer, textColor);
    TRRendererSetDrawStyle(renderer, given(0) ? drawStyle : TRRendererGetDrawStyle(defaults));
    TRRendererSetStrokeColor(renderer, given(1) ? strokeColor : TRRendererGetStrokeColor(defaults));
    TRRendererSetStrokeCap(renderer, given(2) ? strokeCap : TRRendererGetStrokeCap(defaults));
    TRRendererSetStrokeJoin(renderer, given(3) ? strokeJoin : TRRendererGetStrokeJoin(defaults));
    TRRendererSetShadowColor(renderer, given(4) ? shadowColor : TRRendererGetShadowColor(defaults));
    TRRendererSetStrokeRadius(renderer, given(5) ? strokeRadius : TRRendererGetStrokeRadius(defaults));
    TRRendererSetStrokeMiter(renderer, given(6) ? strokeMiter : TRRendererGetStrokeMiter(defaults));
    TRRendererSetShadowRadius(renderer, given(7) ? shadowRadius : TRRendererGetShadowRadius(defaults));
    TRRendererSetShadowDx(renderer, given(8) ? shadowDx : TRRendererGetShadowDx(defaults));
    TRRendererSetShadowDy(renderer, given(9) ? shadowDy : TRRendererGetShadowDy(defaults));
}

} // namespace tehreer::views
