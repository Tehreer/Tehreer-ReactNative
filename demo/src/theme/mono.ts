import { Platform } from 'react-native';

/** The system monospace font, for numbers and IDs. */
export const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });
