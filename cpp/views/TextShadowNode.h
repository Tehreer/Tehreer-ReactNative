#pragma once

#include "TextLayout.h"
#include "Typesetters.h"

#include <react/renderer/components/TehreerSpec/EventEmitters.h>
#include <react/renderer/components/TehreerSpec/Props.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/LayoutConstraints.h>
#include <react/renderer/core/LayoutContext.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>

#include <algorithm>
#include <cmath>
#include <vector>

namespace facebook::react {

/**
 * The part of a text view that Fabric forces into C++: Yoga asks for the size of a leaf on the
 * thread that commits, so the text of a label is laid out there with Core, synchronously, from the
 * typesetter that JavaScript registered. There is no state and nothing is handed to the native view: the view
 * lays the text out again for the size it was given, as the views of Tehreer-Android and
 * Tehreer-Cocoa do for theirs.
 */
template <const char *ComponentName, typename PropsT, typename EventEmitterT, bool IsScrollable>
class TextShadowNode final : public ConcreteViewShadowNode<ComponentName, PropsT, EventEmitterT> {
public:
    using ConcreteViewShadowNode<ComponentName, PropsT, EventEmitterT>::ConcreteViewShadowNode;

    static ShadowNodeTraits BaseTraits() {
        auto traits = ConcreteViewShadowNode<ComponentName, PropsT, EventEmitterT>::BaseTraits();
        traits.set(ShadowNodeTraits::Trait::LeafYogaNode);
        traits.set(ShadowNodeTraits::Trait::MeasurableYogaNode);
        return traits;
    }

    Size measureContent(const LayoutContext &, const LayoutConstraints &constraints) const override {
        // A scrolling view takes the size that it is given, as the text view of Tehreer-Android does in
        // `onMeasure`: its height is the style's, whatever the text, and laying the whole text out here
        // would cost the commit thread a full layout at every measure. It is as wide as it is allowed,
        // so that lines align in the width of the view, and zero where nothing bounds it.
        if (IsScrollable) {
            return constraints.clamp(Size{
                std::isfinite(constraints.maximumSize.width) ? constraints.maximumSize.width : 0,
                std::isfinite(constraints.maximumSize.height) ? constraints.maximumSize.height : 0});
        }

        const auto &props = this->getConcreteProps();

        // The typesetter may be gone when an old revision is measured after JavaScript moved on;
        // that measures zero, and the revision is replaced anyway.
        TRTypesetterRef typesetter = tehreer::views::Typesetters::Retain(props.typesetterId);
        const auto settings = tehreer::views::FrameSettings::From(props.frameSettings.data(), props.frameSettings.size());
        const TRSize measured = tehreer::views::MeasureText(
            typesetter, static_cast<float>(constraints.maximumSize.width), static_cast<float>(constraints.maximumSize.height), settings, false);
        if (typesetter != nullptr) {
            TRTypesetterRelease(typesetter);
        }
        return constraints.clamp(Size{measured.width, measured.height});
    }
};

} // namespace facebook::react
