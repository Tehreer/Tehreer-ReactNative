import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getVersion, initialize } from 'tehreer-react-native';
import type { NativeBindings } from '../src/internal/NativeBindings';
import { suites } from './tests';
import { loadFonts } from './tests/fontData';
import { runSuites } from './tests/runSuites';

interface Result {
  version: string;
  smokeTest: boolean;
  suites: number;
  passed: number;
  total: number;
}

function run(): Result {
  initialize();
  // Calling twice proves that initialize() is idempotent.
  initialize();

  const bindings = (globalThis as unknown as { __tehreer: NativeBindings }).__tehreer;
  const reports = runSuites(bindings, suites);
  let passed = 0;
  let total = 0;
  for (const report of reports) {
    // The device test scripts read these lines from the system log (format in AGENTS.md).
    console.log(`TEHREER_SUITE name=${report.name} passed=${report.passed} total=${report.total}`);
    for (const failure of report.failures) {
      console.log(`TEHREER_FAIL ${report.name}/${failure}`);
    }
    passed += report.passed;
    total += report.total;
  }

  return { version: getVersion(), smokeTest: bindings.smokeTest(), suites: reports.length, passed, total };
}

export default function App() {
  const [result, setResult] = useState<Result | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    // The fonts are fetched assets, so the suites wait for them; a font that cannot be fetched is an error.
    loadFonts()
      .then(() => {
        const outcome = run();
        setResult(outcome);
        // The device test scripts read this line from the system log.
        console.log(
          `TEHREER_RESULT version=${outcome.version} smokeTest=${outcome.smokeTest} suites=${outcome.suites} passed=${outcome.passed} total=${outcome.total}`,
        );
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        console.log(`TEHREER_RESULT error=${message}`);
      });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tehreer</Text>
      <Text testID="version" style={styles.text}>
        {error ? `Error: ${error}` : `Core version: ${result?.version ?? '...'}`}
      </Text>
      <Text testID="smokeTest" style={styles.text}>
        {`Core smoke test: ${result ? (result.smokeTest ? 'passed' : 'failed') : '...'}`}
      </Text>
      <Text testID="tests" style={styles.text}>
        {`Tests: ${result ? `${result.passed}/${result.total}` : '...'}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 16, color: '#000000' },
  text: { fontSize: 18, color: '#000000', marginVertical: 4 },
});
