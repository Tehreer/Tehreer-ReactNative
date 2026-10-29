import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { getVersion, initialize } from 'tehreer-react-native';
import { runBenchmark } from './runBenchmark';

// Not part of the test registry (example/tests/index.ts): `npm run test:ios` and `test:android` never
// show this screen. benchmarks/run.mjs builds the app with this entry and reads the BENCH lines.

export function BenchmarkApp() {
  const [status, setStatus] = useState('starting');

  useEffect(() => {
    initialize();
    runBenchmark({
      platform: Platform.OS,
      osVersion: String(Platform.Version),
      isDebug: __DEV__,
      coreVersion: getVersion(),
      report: (tag, value) => console.log(`${tag} ${JSON.stringify(value)}`),
      progress: setStatus,
    }).catch((e: unknown) => {
      // The orchestrator stops waiting at this line, so a failure is never a timeout.
      const message = e instanceof Error ? e.message : String(e);
      console.log(`BENCH_ERROR ${JSON.stringify({ message })}`);
      setStatus(`error: ${message}`);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Tehreer benchmark</Text>
      <Text testID="status" style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  text: { fontSize: 18, color: '#000000', marginVertical: 4 },
});
