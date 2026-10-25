import { useEffect, useMemo, useState } from 'react';
import { Image, PixelRatio, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Typeface } from '../../src/graphics/Typeface';
import type { NativeBindings } from '../../src/internal/NativeBindings';
import { adopt } from '../../src/internal/Adopt';
import type { ReplacementBounds } from '../../src/drawing/ReplacementDelegate';
import type { DrawingContext } from '../../src/drawing/DrawingContext';
import { Replacement } from '../../src/layout/Replacement';
import { TLabel } from '../../src/views/TLabel';
import { TTextView } from '../../src/views/TTextView';
import { TMutableText } from '../../src/layout/TMutableText';
import { DrawStyle } from '../../src/graphics/enums';
import { TextAlignment, TruncationPlace } from '../../src/layout/enums';
import { encodePng, toBase64 } from '../../tests/device/png';
import { buildScene, findClippedScene, loadFaces, scenes } from './paintFixtures';
import type { Scene } from './paintFixtures';

// The screen that QA looks at (a screenshot in the simulator and the emulator): the frames of the
// native painters. The top is the Fabric view, which paints a composed frame itself; the rest are
// frames of every kind that the painters handle, drawn by the same painter onto an offscreen canvas
// at the display scale (the debug hook `testPaintFrame`) and shown as images.

const URDU = 'تحریر ایک متنی انجن ہے';

interface Picture {
  scene: Scene;
  uri: string;
}

function replacementDrawer(b: NativeBindings, renderScale: number) {
  return (context: Record<string, unknown>, run: never, x: number, y: number): void => {
    try {
      const handle = b.TRGlyphRunGetReplacement(run);
      if (handle === undefined) {
        return;
      }
      const bounds: ReplacementBounds = {
        x, y, ascent: b.TRGlyphRunGetAscent(run) * renderScale, descent: b.TRGlyphRunGetDescent(run) * renderScale,
        width: b.TRGlyphRunGetWidth(run) * renderScale,
      };
      const replacement = new Replacement(adopt, handle);
      try {
        replacement.draw(context as unknown as DrawingContext, bounds);
      } finally {
        replacement.dispose();
      }
    } finally {
      b.disposeHandle(run);
    }
  };
}

function makePictures(): Picture[] {
  const b = (globalThis as unknown as { __tehreer: NativeBindings }).__tehreer;
  const faces = loadFaces();
  const density = PixelRatio.get();
  const list = [...scenes];
  const clipped = findClippedScene(faces);
  if (clipped !== undefined) {
    list.push(clipped);
  }

  return list.map((scene) => {
    const built = buildScene(scene, faces, density);
    try {
      const result = b.testPaintFrame!(built.frame.nativeHandle, built.renderer.nativeHandle, {
        width: scene.width, height: scene.height, background: 0xffffffff,
        replacement: scene.replacement ? replacementDrawer(b, density) : undefined,
      });
      const png = encodePng(result.width, result.height, new Uint8Array(result.pixels));
      return { scene, uri: `data:image/png;base64,${toBase64(png)}` };
    } finally {
      built.dispose();
    }
  });
}

// The labels and the text view that QA screenshots: Urdu, mixed right-to-left and left-to-right runs,
// truncation, alignment, a replacement and a scrolling view with a selection.
function makeSamples(faces: { roboto: Typeface; nastaliq: Typeface }) {
  const mixed = new TMutableText(`abc ${URDU} cba bca ${URDU}`);
  mixed.setAttributes(4, 4 + URDU.length, { typeface: faces.nastaliq, typeSize: 28, foregroundColor: 0xff0a7a3d });
  const chip = new Replacement({
    computeRoom: () => ({ ascent: 16, descent: 5, extent: 44 }),
    draw: (context) => {
      context.fillRect({ x: 0, y: -16, width: 44, height: 21 }, 0xff2255cc);
      context.fillRect({ x: 3, y: -13, width: 38, height: 15 }, 0xffaaccff);
    },
  });
  const inline = new TMutableText('abc \uFFFC cba abc bca cab abc cba');
  inline.setAttributes(4, 5, { replacement: chip });
  chip.dispose();
  const long = new TMutableText('');
  for (let index = 0; index < 80; index++) {
    const lead = `${index + 1}. abc abc abc abc abc abc `;
    const at = long.length;
    long.append(`${lead}${URDU}\n`);
    long.setAttributes(at + lead.length, at + lead.length + URDU.length, { typeface: faces.nastaliq, typeSize: 20 });
  }
  return { mixed, inline, long };
}

export function VisualCheck({ onClose }: { onClose: () => void }) {
  const [faces] = useState(loadFaces);
  const [error, setError] = useState<string | undefined>();
  const pictures = useMemo(() => {
    try {
      return makePictures();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return [];
    }
  }, []);

  const samples = useMemo(() => makeSamples(faces), [faces]);
  useEffect(() => () => Object.values(samples).forEach((text) => text.dispose()), [samples]);

  return (
    <View style={styles.screen} testID="visualCheck">
      <Pressable onPress={onClose} style={styles.close} testID="closeVisual">
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.caption}>TLabel: Urdu, mixed, alignment, truncation, replacement</Text>
        <View style={styles.box}>
          <TLabel text={URDU} typeface={faces.nastaliq} textSize={34} textColor="#aa1122" style={[styles.view, { minWidth: 300, maxWidth: 300 }]} />
          <TLabel attributedText={samples.mixed} typeface={faces.roboto} textSize={22} style={[styles.view, { maxWidth: 300 }]} />
          <TLabel text="abc abc abc abc abc abc abc" typeface={faces.roboto} textSize={22} textAlignment={TextAlignment.Right} style={[styles.view, { minWidth: 300, maxWidth: 300 }]} />
          <TLabel text="abc abc abc abc abc abc abc abc abc abc" typeface={faces.roboto} textSize={22} maxLines={2} isTruncationEnabled truncationPlace={TruncationPlace.End} style={[styles.view, { maxWidth: 220 }]} />
          <TLabel text="abc abc" typeface={faces.roboto} textSize={40} textColor="#2255cc" drawStyle={DrawStyle.FillStroke} strokeColor="#cc2200" strokeRadius={1.5} shadowColor="#88000000" shadowRadius={3} shadowDx={4} shadowDy={4} style={[styles.view, { maxWidth: 300 }]} />
          <TLabel attributedText={samples.inline} typeface={faces.roboto} textSize={20} style={[styles.view, { maxWidth: 300 }]} />
        </View>
        <Text style={styles.caption}>TTextView (TLinePaint views, highlight 10..60, separators)</Text>
        <View style={styles.box}>
          <TTextView attributedText={samples.long} typeface={faces.roboto} textSize={16} highlights={[{ fromIndex: 10, toIndex: 60 }]} separatorColor="#33000000" style={{ width: 320, height: 200 }} />
        </View>
        {error !== undefined && <Text style={styles.error}>{error}</Text>}
        {pictures.map(({ scene, uri }) => (
          <View key={scene.name}>
            <Text style={styles.caption}>{scene.caption}</Text>
            <Image source={{ uri }} style={[styles.box, { width: scene.width, height: scene.height }]} testID={`picture-${scene.name}`} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFillObject, backgroundColor: '#ffffff', paddingTop: 48 },
  close: { position: 'absolute', top: 40, right: 12, zIndex: 2, padding: 8, backgroundColor: '#dddddd' },
  closeText: { color: '#000000', fontSize: 14 },
  content: { padding: 12, gap: 6 },
  caption: { color: '#000000', fontSize: 11, marginTop: 6 },
  box: { borderWidth: 1, borderColor: '#cccccc', alignSelf: 'flex-start' },
  view: { alignSelf: 'flex-start' },
  error: { color: '#cc0000', fontSize: 12 },
});
