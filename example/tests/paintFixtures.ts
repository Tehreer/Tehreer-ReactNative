import type { DrawingContext } from '../../src/drawing/DrawingContext';
import type { ReplacementBounds } from '../../src/drawing/ReplacementDelegate';
import { FontFile } from '../../src/graphics/FontFile';
import { DrawStyle } from '../../src/graphics/enums';
import { Renderer } from '../../src/graphics/Renderer';
import type { Typeface } from '../../src/graphics/Typeface';
import type { ComposedFrame } from '../../src/layout/ComposedFrame';
import { ReplacementKind } from '../../src/layout/enums';
import { FrameResolver } from '../../src/layout/FrameResolver';
import { Replacement } from '../../src/layout/Replacement';
import { TMutableText } from '../../src/layout/TMutableText';
import { Typesetter } from '../../src/layout/Typesetter';
import { colorFontBytes, fontBytes, nastaliqFontBytes } from './fontData';

// The frames that the painter tests and the visual check draw with the native painters. Fonts are
// the real files of example/assets/fonts.

export type FaceName = 'roboto' | 'nastaliq' | 'color';

export interface Faces {
  readonly roboto: Typeface;
  readonly nastaliq: Typeface;
  readonly color: Typeface;
}

export function loadFaces(): Faces {
  return {
    roboto: new FontFile(fontBytes).typefaces.get(0),
    nastaliq: new FontFile(nastaliqFontBytes).typefaces.get(0),
    color: new FontFile(colorFontBytes).typefaces.get(0),
  };
}

export interface Scene {
  readonly name: string;
  readonly caption: string;
  readonly text: string;
  readonly face: FaceName;
  readonly size: number;
  /** The width of the frame, which is also the width of the canvas. */
  readonly width: number;
  readonly height: number;
  readonly attributes?: readonly (readonly [number, number, Readonly<Record<string, unknown>>])[];
  readonly renderer?: Readonly<Record<string, number | string>>;
  /** A replacement of the range, drawn as a box by `draw` of its delegate. */
  readonly replacement?: { readonly from: number; readonly to: number; readonly ascent: number; readonly descent: number; readonly extent: number; readonly color: number };
  /** Make the frame of a range of the text instead of all of it (for a cut through a cluster). */
  readonly range?: readonly [number, number];
}

const URDU = 'تحریر ایک متنی انجن ہے';

export const scenes: readonly Scene[] = [
  { name: 'alpha', caption: 'alpha images, Roboto: blue run, tinted per color', text: 'abc abc', face: 'roboto', size: 48, width: 260, height: 70, attributes: [[0, 3, { foregroundColor: 0xff2040d0 }]] },
  { name: 'argb', caption: 'color (ARGB) images, RocherColorGX', text: 'abc', face: 'color', size: 64, width: 260, height: 90 },
  { name: 'urdu', caption: 'right to left, NotoNastaliqUrdu, wrapped', text: URDU, face: 'nastaliq', size: 34, width: 200, height: 190 },
  { name: 'rects', caption: 'fill rects: background, underline, strikethrough', text: 'abcdef', face: 'roboto', size: 40, width: 260, height: 70, attributes: [[1, 3, { backgroundColor: 0xff7fe08f }], [3, 5, { underline: true, strikethrough: true, decorationColor: 0xffd02020 }]] },
  { name: 'shadow', caption: 'shadow: radius 4, offset 6 by 6, filled and stroked once', text: 'abc', face: 'roboto', size: 56, width: 260, height: 90, renderer: { shadowRadius: 4, shadowDx: 6, shadowDy: 6, shadowColor: 0xffe02020, drawStyle: 'FillStroke', strokeRadius: 1, strokeColor: 0xff2040d0 } },
  { name: 'replacement', caption: 'replacement: the delegate draws a box through the painter', text: 'ab￼ab', face: 'roboto', size: 40, width: 260, height: 70, replacement: { from: 2, to: 3, ascent: 28, descent: 8, extent: 40, color: 0xffe0a020 } },
];

export interface BuiltScene {
  readonly frame: ComposedFrame;
  readonly renderer: Renderer;
  dispose(): void;
}

/** The delegate of a scene's replacement: it draws a box in the bounds it is given, through the context. */
function boxDelegate(ascent: number, descent: number, extent: number, color: number) {
  return {
    computeRoom: () => ({ ascent, descent, extent }),
    draw: (context: DrawingContext, bounds: ReplacementBounds) => {
      context.fillRect({ x: bounds.x, y: bounds.y - bounds.ascent, width: bounds.width, height: bounds.ascent + bounds.descent }, color);
    },
  };
}

export function buildScene(scene: Scene, faces: Faces, renderScale = 1): BuiltScene {
  const text = new TMutableText(scene.text);
  text.setAttributes(0, scene.text.length, { typeface: faces[scene.face], typeSize: scene.size });
  for (const [from, to, attributes] of scene.attributes ?? []) {
    text.setAttributes(from, to, attributes);
  }
  let replacement: Replacement | undefined;
  if (scene.replacement !== undefined) {
    const { from, to, ascent, descent, extent, color } = scene.replacement;
    replacement = new Replacement(boxDelegate(ascent, descent, extent, color), ReplacementKind.Inline);
    text.setAttributes(from, to, { replacement });
  }

  const typesetter = new Typesetter(text);
  const resolver = new FrameResolver();
  resolver.typesetter = typesetter;
  resolver.frameWidth = scene.width;
  resolver.frameHeight = 1000;
  const [from, to] = scene.range ?? [0, scene.text.length];
  const frame = resolver.createFrame(from, to);

  const renderer = new Renderer();
  renderer.typeface = faces[scene.face];
  renderer.typeSize = scene.size;
  renderer.renderScale = renderScale;
  for (const [name, value] of Object.entries(scene.renderer ?? {})) {
    (renderer as unknown as Record<string, unknown>)[name] = name === 'drawStyle' ? DrawStyle[value as 'Fill' | 'Stroke' | 'FillStroke'] : value;
  }

  for (const object of [resolver, typesetter, replacement, text]) {
    object?.dispose();
  }
  return {
    frame,
    renderer,
    dispose() {
      frame.dispose();
      renderer.dispose();
    },
  };
}

/**
 * Finds a range of Urdu text with marks that starts or ends inside a cluster, which makes Core pass
 * a clip with the glyphs of that cluster, and returns it as a scene (with the clip that it passes).
 */
export function findClippedScene(faces: Faces): Scene | undefined {
  const marks = 'ب\u0650ت\u064Eک\u064F\u0651ل\u0650';
  const base = scenes.find((scene) => scene.name === 'urdu')!;
  for (let from = 0; from < marks.length; from++) {
    for (let to = from + 1; to <= marks.length; to++) {
      const candidate: Scene = {
        ...base, name: 'clip', caption: 'clipping: a range that cuts a cluster, drawn clipped', text: marks, size: 80, width: 300, height: 150, range: [from, to],
      };
      const built = buildScene(candidate, faces);
      let clipped = false;
      const context: DrawingContext = {
        drawGlyphImage: (_image, _x, _y, _scaleX, _scaleY, _color, clip) => {
          clipped ||= clip !== undefined;
        },
        fillRect: () => {},
      };
      built.frame.draw(built.renderer, context, 0, 0);
      built.dispose();
      if (clipped) {
        return candidate;
      }
    }
  }
  return undefined;
}
