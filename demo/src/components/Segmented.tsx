import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

/** One choice out of a few, as a joined row of segments. */
export function Segmented<T extends string | number>({ options, value, onChange }: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            style={[styles.segment, index > 0 && styles.segmentDivider, selected && styles.segmentSelected]}
            testID={`choice-${String(option.value)}`}
          >
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: 'row', borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.card },
  segment: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  segmentDivider: { borderLeftWidth: 1, borderLeftColor: colors.inputBorder },
  segmentSelected: { backgroundColor: colors.primary },
  segmentText: { fontSize: 15, fontWeight: '500', color: colors.text },
  segmentTextSelected: { color: '#FFFFFF', fontWeight: '600' },
});
