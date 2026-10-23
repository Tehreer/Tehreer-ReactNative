# Fonts of the device tests

Binary copies of four fixtures of Core (`Libraries/TehreerCore/Tests/Fonts`, see the README there for
what they are). The example app loads them with `require()` (Metro serves a `.ttf` as an asset),
`Image.resolveAssetSource()` and `fetch()`; see `example/tests/fontData.ts`. Nothing is embedded in
source code.

| File | Bytes | License |
|------|-------|---------|
| `Roboto-Regular.abc.ttf` | 2132 | Apache License 2.0 (a subset of Roboto, from the HarfBuzz test suite) |
| `Roboto-Variable.abc.ttf` | 11384 | Apache License 2.0 (a subset of Roboto, from the HarfBuzz test suite) |
| `RocherColorGX.abc.ttf` | 7588 | SIL Open Font License 1.1 (Rocher Color, from the HarfBuzz test suite) |
| `NotoNastaliqUrdu-Regular.ttf` | 176600 | SIL Open Font License 1.1 (Noto Nastaliq Urdu v4.000, copyright The Noto Project Authors) |

Core ships these fixtures without license files, and this repository has no copy of the OFL text, so
the license texts are not next to the fonts yet: the Apache License 2.0 is `LICENSE` of this
repository, and the OFL 1.1 text (https://openfontlicense.org) still has to be added as `OFL.txt`.
