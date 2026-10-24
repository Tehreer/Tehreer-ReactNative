#include "TehreerTextBaseShadowNode.h"

#include "Utf8.h"

#include <react/debug/react_native_assert.h>
#include <react/renderer/core/LayoutConstraints.h>
#include <react/renderer/core/LayoutContext.h>

#include <algorithm>
#include <cmath>
#include <exception>
#include <limits>

namespace facebook::react {

extern const char TehreerTextBaseComponentName[] = "TehreerTextBase";

namespace {

using tehreer::fabric::ComposeStatus;
using tehreer::fabric::TextFrame;
using tehreer::fabric::TextFrameSpec;
using tehreer::fabric::ViewTextRegistry;

tehreer::fabric::FrameSettings MakeSettings(const TehreerTextBaseProps &props) {
    tehreer::fabric::FrameSettings settings;
    // JavaScript has normalized every value (a whole number from 0 for maxLines, enum members).
    settings.maxLines = static_cast<std::uint32_t>(props.maxLines);
    settings.textAlignment = static_cast<std::uint32_t>(props.textAlignment);
    settings.truncationEnabled = props.truncationEnabled;
    settings.truncationMode = static_cast<std::uint32_t>(props.truncationMode);
    settings.truncationPlace = static_cast<std::uint32_t>(props.truncationPlace);
    settings.extraLineSpacing = static_cast<float>(props.extraLineSpacing);
    settings.lineHeightMultiplier = static_cast<float>(props.lineHeightMultiplier);
    settings.justificationEnabled = props.justificationEnabled;
    settings.justificationLevel = static_cast<float>(props.justificationLevel);
    return settings;
}

// The registry first; an id that was unregistered since (the JavaScript side moved on to another
// text while this revision is still alive) is served by the share that the state keeps.
std::shared_ptr<const tehreer::fabric::ViewText> ResolveText(const TehreerTextBaseProps &props, const TehreerTextBaseStateData &data) {
    if (props.textId <= 0) {
        return nullptr;
    }
    if (auto found = ViewTextRegistry::Find(static_cast<std::uint32_t>(props.textId))) {
        return found;
    }
    return data.key.textId == props.textId ? data.text : nullptr;
}

TextFrameSpec MakeSpec(const std::u16string &text, const TehreerTextBaseProps &props,
                       std::shared_ptr<const tehreer::fabric::ViewText> attributed) {
    TextFrameSpec spec;
    spec.text = text;
    spec.typefaceTag = props.typefaceTag < 0 ? 0 : static_cast<std::uint32_t>(props.typefaceTag);
    spec.typeSize = props.typeSize;
    spec.settings = MakeSettings(props);
    if (props.textId > 0) {
        // An id that nothing resolves shows nothing.
        spec.attributed = std::move(attributed);
        spec.text = std::u16string_view();
    }
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
    // React Native passes this very node (already carrying the new props) as the source, so the
    // old props are gone; what the last layout composed is in the state key. A prop that only
    // paints (selection, color, scroll request) leaves it equal, and then the measurement stays:
    // selecting in a long text must not lay it out again.
    if (fragment.props == nullptr) {
        return false;
    }
    const auto &props = getConcreteProps();
    const auto &key = getStateData().key;
    return !(key.text == props.text && key.typefaceTag == props.typefaceTag && key.typeSize == props.typeSize && key.textId == props.textId &&
             key.scrollable == props.scrollable && key.settings == MakeSettings(props));
}

Size TehreerTextBaseShadowNode::measureContent(const LayoutContext &, const LayoutConstraints &layoutConstraints) const {
    const auto &props = getConcreteProps();
    const std::u16string text = tehreer::fabric::Utf8ToUtf16(props.text);

    TextFrameSpec spec = MakeSpec(text, props, ResolveText(props, getStateData()));
    // An unbounded constraint is infinity in Yoga, which is also what Core takes as unbounded.
    spec.width = static_cast<float>(layoutConstraints.maximumSize.width);
    // The whole text of a scroll view counts, whatever height the style allows: the style clamps
    // the view, and the rest scrolls.
    spec.height = props.scrollable ? std::numeric_limits<float>::infinity() : static_cast<float>(layoutConstraints.maximumSize.height);
    spec.fitsWidth = true;
    spec.fitsHeight = true;

    const TextFrame result = Compose(spec);
    Size size{};
    if (result.status == ComposeStatus::Composed) {
        size = Size{result.frame->width(), result.frame->height()};
        // A scroll view is as wide as it is allowed, so that the alignment of the lines holds in
        // the width of the view, and as tall as its text unless the style limits it.
        if (props.scrollable && std::isfinite(layoutConstraints.maximumSize.width)) {
            size.width = layoutConstraints.maximumSize.width;
        }
    }
    return layoutConstraints.clamp(size);
}

void TehreerTextBaseShadowNode::layout(LayoutContext layoutContext) {
    ensureUnsealed();

    const auto &props = getConcreteProps();
    const Size box = getLayoutMetrics().getContentFrame().size;

    TehreerTextBaseFrameKey key{props.text, props.typefaceTag, props.typeSize, props.textId, MakeSettings(props), props.scrollable, box};
    if (getStateData().key == key) {
        ConcreteViewShadowNode::layout(layoutContext);
        return;
    }

    const std::u16string text = tehreer::fabric::Utf8ToUtf16(props.text);
    auto attributed = ResolveText(props, getStateData());
    TextFrameSpec spec = MakeSpec(text, props, attributed);
    // The box is the size Yoga chose from the measurement, or a size the style forced. The lines
    // keep their alignment inside it, so it is not shrunk to the lines.
    // Yoga's rounding to the pixel grid can leave the box a hair below the measured frame
    // (224.99997 for 225 on iOS), and the last line then no longer fits and is dropped. A slack far
    // below a pixel keeps what the measurement counted without letting another word in.
    constexpr float kSlack = 0.01f;
    spec.width = static_cast<float>(box.width) + kSlack;
    // A scroll view shows the whole text, however tall, and scrolls what does not fit its box.
    spec.height = props.scrollable ? std::numeric_limits<float>::infinity() : static_cast<float>(box.height) + kSlack;
    spec.fitsWidth = false;
    spec.fitsHeight = props.scrollable;

    TextFrame result = Compose(spec);
    setStateData(TehreerTextBaseStateData{std::move(key), result.status, std::move(result.frame), std::move(attributed)});

    ConcreteViewShadowNode::layout(layoutContext);
}

} // namespace facebook::react
