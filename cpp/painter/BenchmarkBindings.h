#pragma once

#include <jsi/jsi.h>

namespace tehreer {

#ifdef TEHREER_BENCHMARKS
/**
 * The two functions that the benchmark of `benchmarks/` needs from native code, which only a build
 * with `TEHREER_BENCHMARKS` contains (a Release build for the numbers to mean something, so the
 * debug-only `test*` hooks are no use): `benchDrawFrame` times the draw of a frame through the
 * platform painter without the cost of making the canvas or reading it back, and `benchMemory`
 * reads the native heap in use and the resident size of the process. A normal build has neither.
 */
void InstallBenchmarkHooks(facebook::jsi::Runtime &runtime, facebook::jsi::Object &target);
#endif

} // namespace tehreer
