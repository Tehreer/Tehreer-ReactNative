import { StyleSheet, Text } from 'react-native';
import type { ReactNode } from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { colors } from '../theme/colors';
import { mono } from '../theme/mono';

export function Mono({ children, style, numberOfLines }: { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return <Text numberOfLines={numberOfLines} style={[styles.mono, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  mono: { fontFamily: mono, fontSize: 13, color: colors.text },
});
