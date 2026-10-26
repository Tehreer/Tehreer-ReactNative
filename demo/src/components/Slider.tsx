import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { colors } from '../theme/colors';

/**
 * A slider, as React Native has none without a dependency. `onChange` follows the finger and
 * `onComplete` is called when it lifts, like the Android demo that resizes when the thumb is released.
 */
export function Slider({ min, max, step, value, onChange, onStart, onComplete, testID }: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  onStart?: () => void;
  onComplete?: (value: number) => void;
  testID?: string;
}) {
  const [width, setWidth] = useState(0);
  // The responder callbacks outlive a render, so they read the latest props from here.
  const latest = useRef({ min, max, step, width, onChange, onStart, onComplete });
  latest.current = { min, max, step, width, onChange, onStart, onComplete };
  // Where the finger went down and the value it gave last; the children ignore touches, so
  // locationX is relative to the track and the distance moved adds to it.
  const startX = useRef(0);
  const current = useRef(value);
  current.current = value;

  const valueAt = (x: number) => {
    const { min: low, max: high, step: unit, width: span } = latest.current;
    const fraction = span <= 0 ? 0 : Math.min(1, Math.max(0, x / span));
    const stepped = Math.round((low + fraction * (high - low)) / unit) * unit;
    return Math.min(high, Math.max(low, stepped));
  };
  const moveTo = (x: number) => {
    const next = valueAt(x);
    if (next !== current.current) {
      current.current = next;
      latest.current.onChange(next);
    }
  };

  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    // Inside a ScrollView the slider keeps the gesture once it has it.
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      latest.current.onStart?.();
      startX.current = event.nativeEvent.locationX;
      moveTo(startX.current);
    },
    onPanResponderMove: (_event, gesture) => moveTo(startX.current + gesture.dx),
    onPanResponderRelease: () => latest.current.onComplete?.(current.current),
    onPanResponderTerminate: () => latest.current.onComplete?.(current.current),
  })).current;

  const ratio = max === min ? 0 : (value - min) / (max - min);
  return (
    <View
      {...responder.panHandlers}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={styles.sliderTrackArea}
      testID={testID}
    >
      <View pointerEvents="none" style={styles.sliderTrack}>
        <View style={[styles.sliderFill, { width: `${ratio * 100}%` }]} />
      </View>
      <View pointerEvents="none" style={[styles.sliderThumb, { left: ratio * width - 11 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  sliderTrackArea: { height: 36, justifyContent: 'center' },
  sliderTrack: { height: 4, borderRadius: 2, backgroundColor: '#D5E3D8', overflow: 'hidden' },
  sliderFill: { height: 4, backgroundColor: colors.primary },
  sliderThumb: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, top: 7 },
});
