import { View } from 'react-native';
import type { ReactNode } from 'react';

/** The rows of a section, pulled up towards its heading as in the mockups. */
export function Rows({ children }: { children: ReactNode }) {
  return <View style={{ marginTop: -6 }}>{children}</View>;
}
