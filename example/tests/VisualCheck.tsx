import { useEffect, useMemo, useState } from 'react';
import { Image, PixelRatio, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TypefaceManager } from '../../src/graphics/TypefaceManager';
import type { NativeBindings } from '../../src/internal/NativeBindings';
import { adopt } from '../../src/internal/Adopt';
import type { ReplacementBounds } from '../../src/drawing/ReplacementDelegate';
import type { DrawingContext } from '../../src/drawing/DrawingContext';
import { Replacement } from '../../src/layout/Replacement';
import { TextBase } from '../../src/views/TextBase';
import { encodePng, toBase64 } from '../../tests/device/png';
import { buildScene, findClippedScene, loadFaces, scenes } from './paintFixtures';
import type { Scene } from './paintFixtures';

// The screen that QA looks at (a screenshot in the simulator and the emulator): the frames of the
// native painters. The top is the Fabric view, which paints a composed frame itself; the rest are
// frames of every kind that the painters handle, drawn by the same painter onto an offscreen canvas
// at the display scale (the debug hook `testPaintFrame`) and shown as images.

const ROBOTO_TAG = 9201;
const NASTALIQ_TAG = 9202;
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

  // The Fabric component finds its typeface by tag in the manager, when it is measured, so it is
  // mounted only once the tags are registered.
  const [registered, setRegistered] = useState(false);
  useEffect(() => {
    TypefaceManager.registerTypeface(faces.roboto, ROBOTO_TAG);
    TypefaceManager.registerTypeface(faces.nastaliq, NASTALIQ_TAG);
    setRegistered(true);
    return () => {
      TypefaceManager.unregisterTypeface(faces.roboto);
      TypefaceManager.unregisterTypeface(faces.nastaliq);
    };
  }, [faces]);

  return (
    <View style={styles.screen} testID="visualCheck">
      <Pressable onPress={onClose} style={styles.close} testID="closeVisual">
        <Text style={styles.closeText}>Close</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.caption}>Fabric view (TehreerTextBase paints the frame)</Text>
        {registered && (
          <View style={styles.box}>
            <TextBase text="abc abc abc abc" typefaceTag={ROBOTO_TAG} typeSize={34} style={styles.view} />
            <TextBase text={URDU} typefaceTag={NASTALIQ_TAG} typeSize={34} style={[styles.view, { maxWidth: 200 }]} />
          </View>
        )}
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
