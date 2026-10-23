import { Image } from "react-native";
import type { AssetHost } from "./FontAssets.js";
import NativeTehreerAssets from "../specs/NativeTehreerAssets.js";

const resolver = NativeTehreerAssets;

/**
 * The asset host of a React Native app. It is its own module, loaded when the first asset is, so
 * that importing `FontFile` does not import `react-native`.
 *
 * @internal
 */
export const reactNativeAssetHost: AssetHost = {
  resolveAssetSource: (asset) => Image.resolveAssetSource(asset) ?? null,
  async fetchBytes(uri) {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`The server answered with status ${response.status}.`);
    }
    return response.arrayBuffer();
  },
  resolveNativeAsset: resolver ? (name) => resolver.resolveAsset(name) : undefined,
};
