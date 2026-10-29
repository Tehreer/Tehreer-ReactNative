// The entry of the benchmark build (benchmarks/README.md): the same app name as index.js, so the
// native projects need no change, but the screen runs the scenarios of benchmarks/scenarios.json
// instead of the test suites. The Xcode bundle step (ENTRY_FILE) and the Gradle `react` block
// (-PtehreerBenchmarks) select this file.
import { AppRegistry } from 'react-native';
import { BenchmarkApp } from './benchmark/BenchmarkApp';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => BenchmarkApp);
