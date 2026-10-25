import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TLabel, TextAlignment } from 'tehreer-react-native';
import { useTypeface } from './fonts';
import { colors } from './ui';

export interface ScreenEntry {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
}

export function HomeScreen({ screens, onOpen, onClose }: { screens: readonly ScreenEntry[]; onOpen: (id: string) => void; onClose: () => void }) {
  const { typeface } = useTypeface('mehr');

  return (
    <View style={styles.page}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>Tehreer Demo</Text>
          <Text style={styles.lead}>Explore the text engine behind Tehreer: bidirectional resolution, glyph access, OpenType shaping and variable fonts.</Text>
          {typeface !== undefined && (
            <TLabel
              lineHeightMultiplier={1.15}
              style={styles.word}
              text={'تحریر'}
              textAlignment={TextAlignment.Center}
              textColor="#00A100"
              textSize={72}
              typeface={typeface}
            />
          )}
        </View>

        {screens.map((screen, index) => (
          <Pressable
            accessibilityRole="button"
            key={screen.id}
            onPress={() => onOpen(screen.id)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            testID={`open-${screen.id}`}
          >
            <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{screen.title}</Text>
              <Text style={styles.rowSummary}>{screen.summary}</Text>
            </View>
            <Text style={styles.chevron}>{'›'}</Text>
          </Pressable>
        ))}

        <Pressable accessibilityRole="button" onPress={onClose} style={styles.exit} testID="demoClose">
          <Text style={styles.exitText}>Back to test report</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingTop: 64, paddingHorizontal: 16, paddingBottom: 48, gap: 10 },
  hero: { gap: 8, marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '700', color: colors.text },
  lead: { fontSize: 15, lineHeight: 21, color: colors.muted },
  word: { alignSelf: 'center', paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 14 },
  number: { fontSize: 13, color: colors.accent, fontWeight: '600', width: 22 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  rowSummary: { fontSize: 13, lineHeight: 18, color: colors.muted },
  chevron: { fontSize: 24, color: colors.muted },
  exit: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16, marginTop: 8 },
  exitText: { fontSize: 14, color: colors.muted },
});
