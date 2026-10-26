# Fonts of the demo

Copies of the fonts of the Tehreer-Web demo (`Tehreer-Web/demo/public/fonts`), renamed to lower
case without spaces. The demo (`example/demo`) loads them with `require()` and
`FontFile.fromAsset()`. `taj-nastaleeq.ttf` (15.8 MB, 29833 glyphs) is the default text typeface of
the demo, as in the Web demo and the mockups; a debug build fetches it from Metro as a whole (it
is an asset, so Metro needs no extra configuration), a release build reads it from the app bundle.

| File | Font |
|------|------|
| `taj-nastaleeq.ttf` | AlQalam Taj Nastaleeq (`TajNastaleeq.ttf`) |
| `mehr-nastaliq.ttf` | Mehr Nastaliq Web |
| `nafees-web.ttf` | Nafees Web Naskh |
| `noorehuda.ttf` | Noorehuda |
| `rocher-color.ttf` | RocherColor (variable color font) |
| `decovar-alpha.ttf` | Decovar Alpha (variable font) |
| `sudo.ttf` | Sudo (variable font) |
| `league-mono.ttf` | League Mono (variable font) |

The license of each font is the one of its upstream project. Neither the Web demo nor this
repository carries the license texts yet, so they have to be added next to the fonts (as for
`../fonts`) before a release; this is the owner's decision.
