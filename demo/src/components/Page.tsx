import { ScrollView, StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import { colors } from '../theme/colors';
import { AppBar } from './AppBar';

/** A screen: the green app bar with the back chevron, then the content. */
export function Page({ title, onBack, scroll = true, children }: {
  title: string;
  onBack: () => void;
  /** False for a screen whose content scrolls by itself (a list or a text view). */
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.page}>
      <AppBar onBack={onBack} title={title} />
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={styles.fixed}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  fixed: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, gap: 12 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 12 },
});
