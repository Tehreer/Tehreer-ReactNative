import type { TextStyle } from 'react-native';
import { colors } from './colors';

/** The style of a text field of the mockups. */
export const inputStyle: TextStyle = {
  borderWidth: 1,
  borderColor: colors.inputBorder,
  borderRadius: 10,
  backgroundColor: colors.card,
  color: colors.text,
  fontSize: 16,
  fontWeight: '500',
  height: 48,
  paddingHorizontal: 12,
};
