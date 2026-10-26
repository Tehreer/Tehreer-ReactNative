import { Animated, Easing } from 'react-native';

/** The duration of the slide of the sheets and the pages, in milliseconds. */
export const SLIDE_IN = 280;
export const SLIDE_OUT = 220;

/** Moves `progress` to a value with the easing of an entrance (decelerating) or an exit (accelerating). */
export function slide(progress: Animated.Value, toValue: 0 | 1, callback?: (finished: boolean) => void) {
  Animated.timing(progress, {
    toValue,
    duration: toValue === 1 ? SLIDE_IN : SLIDE_OUT,
    easing: toValue === 1 ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    useNativeDriver: true,
  }).start(({ finished }) => callback?.(finished));
}
