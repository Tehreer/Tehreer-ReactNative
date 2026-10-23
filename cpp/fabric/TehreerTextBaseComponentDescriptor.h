#pragma once

// Included by TehreerModule.h on purpose: the autolinking of Android includes only that header
// (cxxModuleHeaderName) and the generated ComponentDescriptors.h of codegen, and codegen writes no
// descriptor for a component that is `interfaceOnly`. The class has to be named
// `<Component>ComponentDescriptor` for the CLI to find it.

#include "TehreerTextBaseShadowNode.h"

#include <react/renderer/core/ConcreteComponentDescriptor.h>

namespace facebook::react {

using TehreerTextBaseComponentDescriptor = ConcreteComponentDescriptor<TehreerTextBaseShadowNode>;

} // namespace facebook::react
