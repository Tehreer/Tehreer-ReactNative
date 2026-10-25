#pragma once

// Included by TehreerModule.h on purpose: the autolinking of Android includes only that header
// (cxxModuleHeaderName) and the generated ComponentDescriptors.h of codegen, and codegen writes no
// descriptor for a component that is `interfaceOnly`. The names have to be
// `<Component>ComponentDescriptor` for the CLI to find them.

#include "TextShadowNode.h"

namespace facebook::react {

extern const char TLinePaintComponentName[];

// Sized by its style, or by the measurement of its typesetter when it has one (the label).
using TLinePaintShadowNode = TextShadowNode<TLinePaintComponentName, TLinePaintProps, ViewEventEmitter>;

using TLinePaintComponentDescriptor = ConcreteComponentDescriptor<TLinePaintShadowNode>;

} // namespace facebook::react
