#include "TehreerTextBaseShadowNode.h"

#include "Utf8.h"

#include <react/debug/react_native_assert.h>
#include <react/renderer/core/LayoutConstraints.h>
#include <react/renderer/core/LayoutContext.h>

#include <algorithm>
#include <cmath>
#include <exception>

namespace facebook::react {

extern const char TehreerTextBaseComponentName[] = "TehreerTextBase";

namespace {

using tehreer::fabric::ComposeStatus;
using tehreer::fabric::TextFrame;
using tehreer::fabric::TextFrameSpec;

TextFrameSpec MakeSpec(const std::u16string &text, const TehreerTextBaseProps &props) {
    TextFrameSpec spec;
    spec.text = text;
    spec.typefaceTag = props.typefaceTag < 0 ? 0 : static_cast<std::uint32_t>(props.typefaceTag);
    spec.typeSize = props.typeSize;
    spec.maxLines = props.maxLines < 0 ? 0 : static_cast<std::uint32_t>(props.maxLines);
    return spec;
}

// Yoga cannot receive an error, and an exception must not leave a measure callback: a failure is
// a frame-less result, which measures zero and draws nothing.
TextFrame Compose(const TextFrameSpec &spec) noexcept {
    try {
        return tehreer::fabric::ComposeFrame(spec);
    } catch (const std::exception &) {
        return TextFrame{};
    }
}

} // namespace

bool TehreerTextBaseShadowNode::shouldNewRevisionDirtyMeasurement(const ShadowNode &, const ShadowNodeFragment &fragment) const {
    // Only new props can change the text; a new state or children cannot.
    return fragment.props != nullptr;
}

Size TehreerTextBaseShadowNode::measureContent(const LayoutContext &, const LayoutConstraints &layoutConstraints) const {
    const auto &props = getConcreteProps();
    const std::u16string text = tehreer::fabric::Utf8ToUtf16(props.text);

    TextFrameSpec spec = MakeSpec(text, props);
    // An unbounded constraint is infinity in Yoga, which is also what Core takes as unbounded.
    spec.width = static_cast<float>(layoutConstraints.maximumSize.width);
    spec.height = static_cast<float>(layoutConstraints.maximumSize.height);
    spec.fitsWidth = true;
    spec.fitsHeight = true;

    const TextFrame result = Compose(spec);
    Size size{};
    if (result.status == ComposeStatus::Composed) {
        size = Size{result.frame->width(), result.frame->height()};
    }
    return layoutConstraints.clamp(size);
}

void TehreerTextBaseShadowNode::layout(LayoutContext layoutContext) {
    ensureUnsealed();

    const auto &props = getConcreteProps();
    const Size box = getLayoutMetrics().getContentFrame().size;

    TehreerTextBaseFrameKey key{props.text, props.typefaceTag, props.typeSize, props.maxLines, box};
    if (getStateData().key == key) {
        ConcreteViewShadowNode::layout(layoutContext);
        return;
    }

    const std::u16string text = tehreer::fabric::Utf8ToUtf16(props.text);
    TextFrameSpec spec = MakeSpec(text, props);
    // The box is the size Yoga chose from the measurement, or a size the style forced. The lines
    // keep their alignment inside it, so it is not shrunk to the lines.
    // Yoga's rounding to the pixel grid can leave the box a hair below the measured frame
    // (224.99997 for 225 on iOS), and the last line then no longer fits and is dropped. A slack far
    // below a pixel keeps what the measurement counted without letting another word in.
    constexpr float kSlack = 0.01f;
    spec.width = static_cast<float>(box.width) + kSlack;
    spec.height = static_cast<float>(box.height) + kSlack;
    spec.fitsWidth = false;
    spec.fitsHeight = false;

    TextFrame result = Compose(spec);
    setStateData(TehreerTextBaseStateData{std::move(key), result.status, std::move(result.frame)});

    ConcreteViewShadowNode::layout(layoutContext);
}

} // namespace facebook::react
