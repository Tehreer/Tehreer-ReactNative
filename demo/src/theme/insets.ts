import { Platform, StatusBar } from 'react-native';

// React Native has no safe-area hook without a library, so the status bar is allowed for by hand.
// The bar of a screen is as tall as the mockup's (60) below this.
export const TOP_INSET = Platform.OS === 'ios' ? 50 : (StatusBar.currentHeight ?? 24);
