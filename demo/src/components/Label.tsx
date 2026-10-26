import { StyleSheet, Text } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '../theme/colors';

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.label },
});
