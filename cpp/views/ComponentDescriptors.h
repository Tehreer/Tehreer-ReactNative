#pragma once

// Included by TehreerModule.h on purpose: the autolinking of Android includes only that header
// (cxxModuleHeaderName) and the generated ComponentDescriptors.h of codegen, and codegen writes no
// descriptor for a component that is `interfaceOnly`. The names have to be
// `<Component>ComponentDescriptor` for the CLI to find them.

#include "TextShadowNode.h"

namespace facebook::react {

extern const char TLabelComponentName[];
extern const char TTextViewComponentName[];

using TLabelShadowNode = TextShadowNode<TLabelComponentName, TLabelProps, TLabelEventEmitter, false>;
using TTextViewShadowNode = TextShadowNode<TTextViewComponentName, TTextViewProps, TTextViewEventEmitter, true>;

using TLabelComponentDescriptor = ConcreteComponentDescriptor<TLabelShadowNode>;
using TTextViewComponentDescriptor = ConcreteComponentDescriptor<TTextViewShadowNode>;

} // namespace facebook::react
