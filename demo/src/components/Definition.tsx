import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { mono } from '../theme/mono';

/** A name and its value on one line, with a rule under it unless it is the last. */
export function Definition({ term, value, isMono = false, isLast = false }: {
  term: string;
  value: string | number | undefined;
  /** For numbers, IDs and codes. */
  isMono?: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.definition, !isLast && styles.definitionRule]}>
      <Text style={styles.term}>{term}</Text>
      <Text style={[styles.value, isMono && styles.valueMono]}>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  definition: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, minHeight: 42, paddingVertical: 10 },
  definitionRule: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  term: { fontSize: 15, color: colors.label },
  value: { fontSize: 15, fontWeight: '500', color: colors.text, flexShrink: 1, textAlign: 'right' },
  valueMono: { fontFamily: mono, fontSize: 14, fontWeight: '400' },
});
