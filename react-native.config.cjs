/* global module */
// The module is a pure C++ TurboModule. The CLI autolinks it through these entries: on Android the
// Gradle plugin adds the CMake project below to the app and instantiates the class named by
// cxxModuleHeaderName and registers the component descriptors; iOS needs nothing here because codegenConfig.ios.modules in package.json
// maps the module to its provider class.
module.exports = {
  dependency: {
    platforms: {
      android: {
        cxxModuleCMakeListsModuleName: "tehreer_module",
        cxxModuleCMakeListsPath: "CMakeLists.txt",
        cxxModuleHeaderName: "TehreerModule",
        // The CLI finds descriptors by scanning the specs, but skips a component that is
        // `interfaceOnly`, which TehreerTextBase has to be (its descriptor is written by hand).
        componentDescriptors: ["TehreerTextBaseComponentDescriptor"],
      },
    },
  },
};
