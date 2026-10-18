# Tehreer-ReactNative

React Native wrapper of [Tehreer Core](https://github.com/Tehreer/Tehreer-Core), a lightweight, dependency-free text engine written in C89. It exposes the public Core API to React Native through one C++ JSI layer shared by iOS and Android, with a TypeScript API shaped like Tehreer-Web, Tehreer-Android and Tehreer-Cocoa.

This package is at the skeleton stage: the native layer and the public API land in later issues.

## Constraints

- New architecture only: Fabric, C++ TurboModule, Hermes. No old bridge.
- No Skia.
- No WebAssembly.
- Core owns all text logic; the wrapper is a thin bridge and never re-implements layout, shaping or matching.
- No runtime dependency. `react` and `react-native` are peer dependencies.

## Development

Requires Node 22.18 or newer (tests run TypeScript directly) and npm.

```bash
npm install
npm run typecheck   # strict tsc over src and tests
npm run lint        # ESLint (flat config)
npm test            # node:test suites in tests/
npm run build       # emit dist/ (JavaScript and declarations) from src/
```

`.npmrc` sets `legacy-peer-deps` so that npm does not install `react` and `react-native` for this skeleton; revisit it when the example app lands.

Device tests (`npm run test:ios`, `npm run test:android`) are added together with the example app.

## Repository layout

See [AGENTS.md](AGENTS.md) for the layout, conventions and contribution workflow, and `.claude/skills/react-native-wrapper/SKILL.md` for the design rules.

## License

Apache 2.0, see [LICENSE](LICENSE) and [NOTICE](NOTICE).
