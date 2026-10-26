import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { TOP_INSET } from '../theme/insets';
import { Chevron } from './Chevron';

function CloseIcon({ color }: { color: string }) {
  const bar: ViewStyle = { position: 'absolute', left: 3, top: 10, width: 16, height: 2, borderRadius: 1, backgroundColor: color };
  return (
    <View style={{ width: 22, height: 22 }}>
      <View style={[bar, { transform: [{ rotate: '45deg' }] }]} />
      <View style={[bar, { transform: [{ rotate: '-45deg' }] }]} />
    </View>
  );
}

/** The green bar of a screen: the button on the left (back or close) and the title. */
export function AppBar({ title, onBack, icon = 'back' }: { title: string; onBack: () => void; icon?: 'back' | 'close' }) {
  return (
    <View style={styles.bar}>
      <StatusBar barStyle="light-content" />
      <Pressable
        accessibilityLabel={icon === 'back' ? 'Back' : 'Close'}
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.barButton, pressed && { backgroundColor: 'rgba(255,255,255,0.16)' }]}
        testID={icon === 'back' ? 'demoBack' : 'demoCloseSheet'}
      >
        {icon === 'back' ? <View style={{ marginLeft: 4 }}><Chevron color="#FFFFFF" direction="left" size={13} /></View> : <CloseIcon color="#FFFFFF" />}
      </Pressable>
      <Text numberOfLines={1} style={styles.barTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 60 + TOP_INSET, paddingTop: TOP_INSET, paddingLeft: 4, paddingRight: 8, backgroundColor: colors.primary },
  barButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  barTitle: { flex: 1, fontSize: 19, fontWeight: '600', color: '#FFFFFF', letterSpacing: -0.1 },
});
