#pragma once

#include <Tehreer/Tehreer.h>

#include <cstdint>

namespace tehreer::views {

/**
 * How the views draw text, which Tehreer-Web, Tehreer-Android and Tehreer-Cocoa keep in a `Renderer`
 * (`RenderingProps`): the foreground color, the draw style, the stroke and the shadow. They are the
 * props of the same names of `TLinePaint`, and the defaults are those of a new Core renderer (a
 * device test compares them), so a prop that JavaScript did not give is Core's default.
 */
struct RendererSettings {
    TRColor textColor = 0xFF000000u;
    std::uint32_t drawStyle = 0;
    TRColor strokeColor = 0xFF000000u;
    float strokeRadius = 0.5f;
    std::uint32_t strokeCap = 0;
    std::uint32_t strokeJoin = 0;
    float strokeMiter = 1.0f;
    TRColor shadowColor = 0;
    float shadowRadius = 0;
    float shadowDx = 0;
    float shadowDy = 0;

    /**
     * A color is an `Int32` prop, which is negative for what is above 0x7fffffff, and converting a
     * negative double to an unsigned type is undefined: it goes through a wide integer.
     */
    template <typename Int>
    static std::uint32_t Unsigned(Int value) {
        return static_cast<std::uint32_t>(static_cast<std::int64_t>(value));
    }

    /** Reads the props of the component: the members of this struct by name, the shadow ones as `glyphShadow…`. */
    template <typename Props>
    static RendererSettings From(const Props &props) {
        RendererSettings settings;
        settings.textColor = Unsigned(props.textColor);
        settings.drawStyle = Unsigned(props.drawStyle);
        settings.strokeColor = Unsigned(props.strokeColor);
        settings.strokeRadius = static_cast<float>(props.strokeRadius);
        settings.strokeCap = Unsigned(props.strokeCap);
        settings.strokeJoin = Unsigned(props.strokeJoin);
        settings.strokeMiter = static_cast<float>(props.strokeMiter);
        settings.shadowColor = Unsigned(props.glyphShadowColor);
        settings.shadowRadius = static_cast<float>(props.glyphShadowRadius);
        settings.shadowDx = static_cast<float>(props.glyphShadowDx);
        settings.shadowDy = static_cast<float>(props.glyphShadowDy);
        return settings;
    }

    /** Sets all of it on a renderer. The render scale stays the view's. */
    void Apply(TRRendererRef renderer) const;
};

} // namespace tehreer::views
