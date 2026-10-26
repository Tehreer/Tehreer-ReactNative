const fs = require('fs');
const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const root = path.resolve(__dirname, '..');
const libraryEntry = path.join(root, 'src', 'index.ts');

/**
 * The library is linked from the repository root and run from its TypeScript sources, so Metro
 * must read `..`, must not load a second copy of React Native from the root node_modules, and must
 * map the `.js` suffix of ES module imports in `src` to the `.ts` or `.tsx` file that exists.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
    blockList: [new RegExp(`${root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/.*`)],
    resolveRequest: (context, moduleName, platform) => {
      if (moduleName === 'tehreer-react-native') {
        return { type: 'sourceFile', filePath: libraryEntry };
      }

      const isLibrarySource =
        context.originModulePath.startsWith(path.join(root, 'src') + path.sep) &&
        moduleName.startsWith('.') &&
        moduleName.endsWith('.js');
      if (isLibrarySource) {
        // `.ts` first, then `.tsx` for the components.
        for (const extension of ['.ts', '.tsx']) {
          const candidate = path.resolve(
            path.dirname(context.originModulePath),
            moduleName.replace(/\.js$/, extension),
          );
          if (fs.existsSync(candidate)) {
            return { type: 'sourceFile', filePath: candidate };
          }
        }
      }

      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
