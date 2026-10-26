import { StyleSheet, Text } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '../theme/colors';

export function Message({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'error' }) {
  return <Text style={[styles.message, tone === 'error' && { color: colors.error }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  message: { fontSize: 15, color: colors.label },
});
