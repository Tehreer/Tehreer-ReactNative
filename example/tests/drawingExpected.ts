// What Tehreer-Web draws for the scenarios of drawingScenarios.ts, as the normalised events of its
// `CanvasRecorder`: produced by running `prepare` and `frame.draw` against the WebAssembly build of
// Tehreer-Web (dist of /Users/mta/Learning/Tehreer-Web, with the fonts of example/assets/fonts, and
// `setImageSourceFactory((rgba, width, height) => ({ width, height }))`). Numbers are rounded to 3
// decimals. Regenerate it the same way when a scenario changes.

export const drawingExpected: Record<string, readonly string[]> = {
 "ltr": [ "drawImage 11 28 9x11", "drawImage 22 24 10x15", "drawImage 32 28 10x11", "drawImage 52 28 9x11", "drawImage 63 24 10x15", "drawImage 74 28 10x11" ],
 "ltr-wrap": [ "drawImage 6 15 9x11", "drawImage 17 11 10x15", "drawImage 27 15 10x11", "drawImage 6 38 9x11", "drawImage 17 34 10x15", "drawImage 27 38 10x11", "drawImage 6 61 9x11", "drawImage 17 57 10x15", "drawImage 27 61 10x11", "drawImage 6 85 9x11", "drawImage 17 81 10x15", "drawImage 27 85 10x11", "drawImage 6 108 9x11", "drawImage 17 104 10x15", "drawImage 27 108 10x11" ],
 "urdu": [ "drawImage 131 31 17x12", "drawImage 138 21 10x7", "drawImage 130 40 13x11", "drawImage 112 46 23x25", "drawImage 108 42 9x10", "drawImage 110 55 10x6", "drawImage 100 45 15x14", "drawImage 90 30 4x24", "drawImage 78 47 8x8", "drawImage 77 60 10x6", "drawImage 53 17 41x40", "drawImage 40 34 7x8", "drawImage 36 33 10x11", "drawImage 35 19 10x7", "drawImage 27 39 12x8", "drawImage 27 29 6x7", "drawImage 12 44 21x24", "drawImage 143 105 4x24", "drawImage 121 101 17x12", "drawImage 130 91 6x7", "drawImage 119 110 14x12", "drawImage 123 124 6x6", "drawImage 98 118 24x25", "drawImage 106 122 6x7", "drawImage 63 114 10x7", "drawImage 65 136 5x10", "drawImage 54 118 39x16" ],
 "mixed": [ "drawImage 4 31 9x11", "drawImage 15 27 10x15", "drawImage 25 31 10x11", "drawImage 63 24 12x8", "drawImage 68 18 8x5", "drawImage 63 30 8x8", "drawImage 51 35 16x16", "drawImage 48 31 6x7", "drawImage 48 41 8x4", "drawImage 43 34 10x9", "drawImage 54 74 3x16", "drawImage 47 86 5x5", "drawImage 45 94 8x4", "drawImage 30 65 27x27", "drawImage 22 76 5x6", "drawImage 18 75 7x8", "drawImage 17 67 8x5", "drawImage 12 80 9x5", "drawImage 12 73 4x5", "drawImage 3 84 14x15", "drawImage 62 124 3x16", "drawImage 48 121 12x8", "drawImage 54 114 4x5", "drawImage 46 127 10x8", "drawImage 49 137 4x4", "drawImage 32 132 17x17", "drawImage 38 135 4x5", "drawImage 9 130 7x5", "drawImage 9 145 4x7", "drawImage 3 133 27x10", "drawImage 4 162 9x11", "drawImage 15 158 10x15", "drawImage 25 162 10x11" ],
 "decorations": [ "drawImage 1 8 9x11", "fillRect 11 0 11 23 rgb(0, 255, 0)", "drawImage 12 4 10x15", "fillRect 22 0 11 23 rgb(0, 255, 0)", "drawImage 22 8 10x11", "fillRect 33 21 17 1 rgba(16, 32, 48, 0.5019607843137255)", "fillRect 33 14 17 1 rgba(16, 32, 48, 0.5019607843137255)" ],
 "shadow": [ "save", "shadowColor rgb(0, 0, 255)", "shadowBlur 4", "shadowOffsetX 2", "shadowOffsetY 3", "drawImage 1 8 9x11", "drawImage 12 4 10x15", "drawImage 22 8 10x11", "restore" ],
 "fill-stroke": [ "drawImage 1 8 9x11", "drawImage 12 4 10x15", "drawImage 22 8 10x11", "drawImage 0 7 11x13", "drawImage 11 3 12x17", "drawImage 21 7 12x13" ],
 "stroke": [ "drawImage 0 7 11x13", "drawImage 11 3 12x17", "drawImage 21 7 12x13" ],
 "render-scale": [ "drawImage 22 55 18x22", "drawImage 44 47 19x30", "drawImage 65 55 19x22", "drawImage 105 55 18x22", "drawImage 127 47 19x30", "drawImage 148 55 19x22" ],
 "replacement-inline": [ "drawImage 3 11 9x11", "drawImage 14 7 10x15", "replacement 24 22 12 4 30", "drawImage 55 11 9x11", "drawImage 66 7 10x15" ],
 "replacement-block": [ "drawImage 1 8 9x11", "drawImage 12 4 10x15", "replacement 0 35 12 4 150", "drawImage 1 47 9x11", "drawImage 12 43 10x15" ]
};
