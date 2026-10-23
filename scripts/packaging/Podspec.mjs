// Reads the paths that tehreer-react-native.podspec compiles, so that the tests can check that the
// package carries every one of them without running CocoaPods.

/**
 * The `Libraries/...` paths and globs of a podspec: string literals, plus the files that
 * `%w[a/b c/d].map { |name| "Libraries/.../#{name}.c" }` builds from a list of names.
 */
export function podspecPatterns(text) {
  const patterns = new Set();
  for (const [, literal] of text.matchAll(/"(Libraries\/[^"#]+)"/g)) patterns.add(literal ?? "");
  for (const [, names, prefix, suffix] of text.matchAll(
    /%w\[([^\]]*)\]\s*\.map\s*\{\s*\|name\|\s*"([^"#]*)#\{name\}([^"]*)"\s*\}/g
  )) {
    for (const name of (names ?? "").trim().split(/\s+/)) patterns.add(`${prefix}${name}${suffix}`);
  }
  return [...patterns].sort();
}
