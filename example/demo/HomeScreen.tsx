import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { TLabel, TextAlignment } from 'tehreer-react-native';
import { DEFAULT_TEXT_FONT, useTypeface } from './fonts';
import { Chevron, TOP_INSET, colors, mono } from './ui';

export interface ScreenEntry {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
}

export function HomeScreen({ screens, onOpen, onClose }: { screens: readonly ScreenEntry[]; onOpen: (id: string) => void; onClose: () => void }) {
  const { typeface } = useTypeface(DEFAULT_TEXT_FONT);

  return (
    <View style={styles.page}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>Tehreer Demo</Text>
            <Text style={styles.lead}>Explore the Tehreer text engine: bidi, glyphs, shaping and variable fonts.</Text>
          </View>
          {typeface !== undefined && (
            <TLabel
              lineHeightMultiplier={1}
              style={styles.word}
              text={'تحریر'}
              textAlignment={TextAlignment.Right}
              textColor="#3FCB3F"
              textSize={46}
              typeface={typeface}
            />
          )}
        </View>

        <View style={styles.list}>
          {screens.map((screen, index) => (
            <Pressable
              accessibilityRole="button"
              key={screen.id}
              onPress={() => onOpen(screen.id)}
              style={({ pressed }) => [styles.row, index < screens.length - 1 && styles.rowRule, pressed && { backgroundColor: colors.pressed }]}
              testID={`open-${screen.id}`}
            >
              <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{screen.title}</Text>
                <Text style={styles.rowSummary}>{screen.summary}</Text>
              </View>
              <Chevron color={colors.primary} direction="right" size={11} />
            </Pressable>
          ))}
        </View>

        <Pressable accessibilityRole="button" onPress={onClose} style={styles.exit} testID="demoClose">
          <Text style={styles.exitText}>Back to test report</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, paddingTop: TOP_INSET + 6, paddingBottom: 28, paddingHorizontal: 24, backgroundColor: colors.primary },
  headerText: { flex: 1, gap: 8 },
  title: { fontSize: 36, fontWeight: '600', lineHeight: 40, letterSpacing: -0.7, color: '#FFFFFF' },
  lead: { fontSize: 15, lineHeight: 22, color: '#DCEBE0' },
  word: { flexShrink: 0 },
  list: { margin: 16, marginTop: 20, backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72, paddingVertical: 12, paddingHorizontal: 16 },
  rowRule: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  number: { width: 22, fontFamily: mono, fontSize: 13, color: colors.muted },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  rowSummary: { fontSize: 14, lineHeight: 19, color: colors.label },
  exit: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  exitText: { fontSize: 14, color: colors.muted },
});
