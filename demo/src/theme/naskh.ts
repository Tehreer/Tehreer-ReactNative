import { Platform } from 'react-native';

/**
 * A Naskh font for Arabic-script text in the interface. iOS shows Urdu in a Nastaliq font by
 * default, while Android falls back to a Naskh one, which is what the demo wants on both.
 */
export const naskh = Platform.select({ ios: 'Geeza Pro', default: undefined });
