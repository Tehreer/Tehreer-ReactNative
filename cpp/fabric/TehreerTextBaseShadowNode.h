#pragma once

#include "TehreerTextBaseState.h"

#include <react/renderer/components/TehreerSpec/EventEmitters.h>
#include <react/renderer/components/TehreerSpec/Props.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/LayoutConstraints.h>

namespace facebook::react {

extern const char TehreerTextBaseComponentName[];

/**
 * A leaf whose size comes from Core. Yoga calls `measureContent` while it lays the tree out, on
 * whatever thread commits, and that composes the text synchronously with Core: no JavaScript is
 * involved, which is why the text must not hold a replacement (see `TextFrameComposer.h`).
 * `layout` then composes the frame for the box that Yoga chose and puts it in the state, where the
 * native view finds it.
 */
class TehreerTextBaseShadowNode final : public ConcreteViewShadowNode<
                                            TehreerTextBaseComponentName,
                                            TehreerTextBaseProps,
                                            TehreerTextBaseEventEmitter,
                                            TehreerTextBaseStateData> {
public:
    using ConcreteViewShadowNode::ConcreteViewShadowNode;

    static ShadowNodeTraits BaseTraits() {
        auto traits = ConcreteViewShadowNode::BaseTraits();
        traits.set(ShadowNodeTraits::Trait::LeafYogaNode);
        traits.set(ShadowNodeTraits::Trait::MeasurableYogaNode);
        return traits;
    }

    Size measureContent(const LayoutContext &layoutContext, const LayoutConstraints &layoutConstraints) const override;
    void layout(LayoutContext layoutContext) override;

protected:
    bool shouldNewRevisionDirtyMeasurement(const ShadowNode &sourceShadowNode, const ShadowNodeFragment &fragment) const override;
};

} // namespace facebook::react
