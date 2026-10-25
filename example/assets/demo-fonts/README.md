# Fonts of the demo

Copies of the small fonts of the Tehreer-Web demo (`Tehreer-Web/demo/public/fonts`), renamed to
lower case without spaces. The demo (`example/demo`) loads them with `require()` and
`FontFile.fromAsset()`. The 15 MB `TajNastaleeq.ttf` of the Web demo is not copied; the demo uses
Mehr Nastaliq Web and Noto Nastaliq Urdu (`../fonts`) for Urdu instead.

| File | Font |
|------|------|
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
