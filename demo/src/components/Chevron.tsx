import { View } from 'react-native';
import type { ViewStyle } from 'react-native';

type Direction = 'left' | 'right' | 'down';

/** A chevron made of two borders, as React Native has no icon set without a library. */
export function Chevron({ direction, color, size = 10, width = 2 }: { direction: Direction; color: string; size?: number; width?: number }) {
  const sides: ViewStyle = direction === 'left'
    ? { borderLeftWidth: width, borderBottomWidth: width, transform: [{ rotate: '45deg' }] }
    : direction === 'right'
      ? { borderRightWidth: width, borderBottomWidth: width, transform: [{ rotate: '-45deg' }] }
      : { borderRightWidth: width, borderBottomWidth: width, transform: [{ rotate: '45deg' }] };
  return <View style={[{ width: size, height: size, borderColor: color }, sides]} />;
}
