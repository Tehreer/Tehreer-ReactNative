#pragma once

#include <Tehreer/Tehreer.h>

#include <cstddef>
#include <cstdint>

namespace tehreer::views {

/**
 * How the views draw text, which Tehreer-Web, Tehreer-Android and Tehreer-Cocoa keep in a `Renderer`
 * (`RenderingProps`): the draw style, the stroke and the shadow, and the foreground color. The
 * `rendererInts` and `rendererFloats` props carry them as plain numbers, in this order:
 *
 *  - ints: mask, drawStyle, textColor, strokeColor, strokeCap, strokeJoin, shadowColor
 *  - floats: strokeRadius, strokeMiter, shadowRadius, shadowDx, shadowDy
 *
 * Bit n of the mask says that the nth of drawStyle, strokeColor, strokeCap, strokeJoin, shadowColor,
 * strokeRadius, strokeMiter, shadowRadius, shadowDx and shadowDy was given (`textColor` always is);
 * the others have Core's defaults, so the views need not know them.
 */
struct RendererSettings {
    static constexpr std::size_t kIntCount = 7;
    static constexpr std::size_t kFloatCount = 5;

    std::uint32_t mask = 0;
    std::uint32_t drawStyle = 0;
    TRColor textColor = 0xFF000000u;
    TRColor strokeColor = 0;
    std::uint32_t strokeCap = 0;
    std::uint32_t strokeJoin = 0;
    TRColor shadowColor = 0;
    float strokeRadius = 0;
    float strokeMiter = 0;
    float shadowRadius = 0;
    float shadowDx = 0;
    float shadowDy = 0;

    /**
     * A color or a mask is an `Int32` prop, which is negative for what is above 0x7fffffff, and
     * converting a negative double to an unsigned type is undefined: it goes through a wide integer.
     */
    template <typename Int>
    static std::uint32_t Unsigned(Int value) {
        return static_cast<std::uint32_t>(static_cast<std::int64_t>(value));
    }

    template <typename Int, typename Float>
    static RendererSettings From(const Int *ints, std::size_t intCount, const Float *floats, std::size_t floatCount) {
        RendererSettings settings;
        if (intCount >= kIntCount) {
            settings.mask = Unsigned(ints[0]);
            settings.drawStyle = Unsigned(ints[1]);
            settings.textColor = Unsigned(ints[2]);
            settings.strokeColor = Unsigned(ints[3]);
            settings.strokeCap = Unsigned(ints[4]);
            settings.strokeJoin = Unsigned(ints[5]);
            settings.shadowColor = Unsigned(ints[6]);
        }
        if (floatCount >= kFloatCount) {
            settings.strokeRadius = static_cast<float>(floats[0]);
            settings.strokeMiter = static_cast<float>(floats[1]);
            settings.shadowRadius = static_cast<float>(floats[2]);
            settings.shadowDx = static_cast<float>(floats[3]);
            settings.shadowDy = static_cast<float>(floats[4]);
        }
        return settings;
    }

    /**
     * Sets all of it on a renderer: what was given, and for the rest what a new renderer has, so a
     * renderer that is reused with other settings keeps nothing of the old ones. The render scale
     * stays the view's.
     */
    void Apply(TRRendererRef renderer) const;
};

} // namespace tehreer::views
