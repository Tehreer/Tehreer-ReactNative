import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getVersion, initialize } from 'tehreer-react-native';
import type { NativeBindings } from '../src/internal/NativeBindings';
import { releaseSuiteNames, suites } from './tests';
import { prepareAssetTests } from './tests/AssetTests';
import { loadFonts } from './tests/fontData';
import { runSuites } from './tests/runSuites';
import type { SuiteReport } from './tests/runSuites';
import { ViewTestHost } from './tests/ViewTests';
import { VisualCheck } from './tests/VisualCheck';

interface Result {
  version: string;
  smokeTest: boolean;
  suites: number;
  passed: number;
  total: number;
}

interface SyncRun {
  version: string;
  smokeTest: boolean;
  reports: SuiteReport[];
}

function run(): SyncRun {
  initialize();
  // Calling twice proves that initialize() is idempotent.
  initialize();

  const bindings = (globalThis as unknown as { __tehreer: NativeBindings }).__tehreer;
  const reports = runSuites(bindings, __DEV__ ? suites : suites.filter((suite) => releaseSuiteNames.includes(suite.name)));
  return { version: getVersion(), smokeTest: bindings.smokeTest(), reports };
}

/** Logs every suite, then the totals; the view suite renders, so it joins the synchronous ones here. */
function summarize(base: SyncRun, extra: SuiteReport[]): Result {
  const reports = [...base.reports, ...extra];
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

  return { version: base.version, smokeTest: base.smokeTest, suites: reports.length, passed, total };
}

export default function App() {
  const [result, setResult] = useState<Result | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState<SyncRun | undefined>();
  // The screen that QA looks at; the tests run and report whether or not it is shown.
  const [visual, setVisual] = useState(false);

  useEffect(() => {
    // The fonts are fetched assets, so the suites wait for them; a font that cannot be fetched is an error.
    loadFonts()
      .then(prepareAssetTests)
      .then(() => {
        // The view suite needs the component mounted; its result completes the run (see finish).
        setPending(run());
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        console.log(`TEHREER_RESULT error=${message}`);
      });
  }, []);

  const finish = useCallback(
    (report?: SuiteReport) => {
      if (pending === undefined || result !== undefined) {
        return;
      }
      const outcome = summarize(pending, report === undefined ? [] : [report]);
      // The host stays mounted, so the boxes can be looked at in a screenshot.
      setResult(outcome);
      // The device test scripts read this line from the system log.
      console.log(
        `TEHREER_RESULT version=${outcome.version} smokeTest=${outcome.smokeTest} suites=${outcome.suites} passed=${outcome.passed} total=${outcome.total}`,
      );
    },
    [pending, result],
  );

  // A release build has no debug hooks for the view suite, so it runs only the release suites.
  useEffect(() => {
    if (!__DEV__ && pending !== undefined) {
      finish();
    }
  }, [finish, pending]);

  // The check replaces the test screen; the run has finished by the time the button is there.
  if (__DEV__ && visual) {
    return <VisualCheck onClose={() => setVisual(false)} />;
  }

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
      {__DEV__ && pending !== undefined && (
        <Pressable onPress={() => setVisual(true)} style={styles.button} testID="showVisual">
          <Text style={styles.buttonText}>Show frames</Text>
        </Pressable>
      )}
      {__DEV__ && pending !== undefined && <ViewTestHost onDone={finish} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 64, backgroundColor: '#ffffff' },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 16, color: '#000000' },
  button: { marginVertical: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#dddddd' },
  buttonText: { fontSize: 16, color: '#000000' },
  text: { fontSize: 18, color: '#000000', marginVertical: 4 },
});
