import { StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { mono } from '../theme/mono';
import { Card } from './Card';

/** A card with a heading, and optionally a note in monospace on the right of it. */
export function Section({ title, meta, children, style }: { title: string; meta?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Card style={[{ gap: 12 }, style]}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {meta !== undefined && <Text style={styles.meta}>{meta}</Text>}
      </View>
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { fontFamily: mono, fontSize: 12, color: colors.muted },
});
