cmake_minimum_required(VERSION 3.13)
project(tehreer_module CXX C)

# The Gradle plugin of React Native adds this directory to the CMake project of the app, so this
# file builds Core and the module as static libraries that end up in the app's libappmodules.so.
set(TEHREER_ROOT "${CMAKE_CURRENT_LIST_DIR}/..")

# Core and its dependencies end up in a shared library, so they need position independent code.
# The variable is directory scoped: it does not leak into the CMake project of the app.
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# The NDK has no libbz2 and the app must not depend on optional system libraries, so the optional
# FreeType features that look for them are switched off. Brotli is already disabled by Core.
set(FT_DISABLE_ZLIB ON CACHE BOOL "" FORCE)
set(FT_DISABLE_BZIP2 ON CACHE BOOL "" FORCE)
set(FT_DISABLE_PNG ON CACHE BOOL "" FORCE)
set(FT_DISABLE_HARFBUZZ ON CACHE BOOL "" FORCE)

# Gradle cannot fetch from the network: use the sources that scripts/fetch-deps prepared.
set(TR_DEPS_DIR "${TEHREER_ROOT}/Libraries/Dependencies" CACHE PATH "" FORCE)
set(TR_CONFIG_UNITY ON CACHE BOOL "" FORCE)
add_subdirectory("${TEHREER_ROOT}/Libraries/TehreerCore" Tehreer)

find_package(ReactAndroid REQUIRED CONFIG)

add_library(tehreer_module STATIC
    "${TEHREER_ROOT}/cpp/TehreerModule.cpp"
    "${TEHREER_ROOT}/cpp/runtime/TehreerBindings.cpp"
)

target_include_directories(tehreer_module PUBLIC "${TEHREER_ROOT}/cpp")

# React Native compiles with C++20; the standard is requested on the target only, so Core stays C.
target_compile_features(tehreer_module PUBLIC cxx_std_20)

# The plain signature is required: the application CMake of React Native links this target with it,
# and CMake does not allow both signatures on one target.
target_link_libraries(tehreer_module
    Tehreer
    react_codegen_TehreerSpec
    ReactAndroid::jsi
    ReactAndroid::reactnative
)
