import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getVersion, initialize } from 'tehreer-react-native';
import type { NativeBindings } from '../src/internal/NativeBindings';
import { handleTestCount, runHandleTests } from './tests/HandleTests';

interface Result {
  version: string;
  smokeTest: boolean;
  passed: number;
  total: number;
}

function run(): Result {
  initialize();
  // Calling twice proves that initialize() is idempotent.
  initialize();

  const bindings = (globalThis as unknown as { __tehreer: NativeBindings }).__tehreer;
  const suite = runHandleTests(bindings);
  for (const failure of suite.failures) {
    // The device test scripts read these lines from the system log.
    console.log(`TEHREER_FAIL ${failure}`);
  }

  return { version: getVersion(), smokeTest: bindings.smokeTest(), passed: suite.passed, total: handleTestCount };
}

export default function App() {
  const [result, setResult] = useState<Result | undefined>();
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    try {
      const outcome = run();
      setResult(outcome);
      // The device test scripts read this line from the system log.
      console.log(
        `TEHREER_RESULT version=${outcome.version} smokeTest=${outcome.smokeTest} handles=${outcome.passed}/${outcome.total}`,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      console.log(`TEHREER_RESULT error=${message}`);
    }
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
      <Text testID="handles" style={styles.text}>
        {`Handle tests: ${result ? `${result.passed}/${result.total}` : '...'}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 16, color: '#000000' },
  text: { fontSize: 18, color: '#000000', marginVertical: 4 },
});
