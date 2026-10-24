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
 * thread that commits, so the text is laid out there with Core, synchronously, from the typesetter
 * that JavaScript registered. There is no state and nothing is handed to the native view: the view
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
        const auto &props = this->getConcreteProps();

        // The typesetter may be gone when an old revision is measured after JavaScript moved on;
        // that measures zero, and the revision is replaced anyway.
        TRTypesetterRef typesetter = tehreer::views::Typesetters::Retain(props.typesetterId);
        const auto settings = tehreer::views::FrameSettings::From(props.frameSettings.data(), props.frameSettings.size());
        const TRSize measured = tehreer::views::MeasureText(
            typesetter, static_cast<float>(constraints.maximumSize.width), static_cast<float>(constraints.maximumSize.height), settings, IsScrollable);
        if (typesetter != nullptr) {
            TRTypesetterRelease(typesetter);
        }

        Size size{measured.width, measured.height};
        // A scrolling view is as wide as it is allowed, so that lines align in the width of the view.
        if (IsScrollable && std::isfinite(constraints.maximumSize.width)) {
            size.width = constraints.maximumSize.width;
        }
        return constraints.clamp(size);
    }
};

} // namespace facebook::react
