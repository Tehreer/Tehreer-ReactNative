import { adopt } from "../internal/Adopt.js";
import { holding } from "../internal/Holding.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { DrawAdapter } from "../internal/DrawAdapter.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { toRect } from "../internal/Rects.js";
import { GlyphImage } from "../graphics/GlyphImage.js";
import { Renderer } from "../graphics/Renderer.js";
import { Replacement } from "../layout/Replacement.js";
import type { DrawingContext } from "./DrawingContext.js";

/**
 * Makes the object that the native draw callbacks call. Every member of the context is read here,
 * once, so a getter or a later change of the context does not matter, and each is called as a
 * member of the context.
 */
function makeAdapter(context: DrawingContext, renderScale: number): DrawAdapter {
  if (typeof context !== "object" || context === null) {
    throw new TypeError("context must be a DrawingContext.");
  }
  const { drawGlyphImage, fillRect, beginShadow, endShadow } = context;
  if (typeof drawGlyphImage !== "function" || typeof fillRect !== "function") {
    throw new TypeError("context must have the functions drawGlyphImage and fillRect.");
  }
  if (beginShadow !== undefined && typeof beginShadow !== "function") {
    throw new TypeError("context.beginShadow must be a function.");
  }
  if (endShadow !== undefined && typeof endShadow !== "function") {
    throw new TypeError("context.endShadow must be a function.");
  }

  const adapter: { -readonly [K in keyof DrawAdapter]: DrawAdapter[K] } = {
    drawGlyphImage(handle, x, y, scaleX, scaleY, color, clip) {
      // The native side lent the image to this call with a reference of its own. Disposing it when
      // the call ends makes the wrapper unusable afterwards, so nothing outlives what Core promised.
      const image = new GlyphImage(adopt, handle);
      try {
        drawGlyphImage.call(context, image, x, y, scaleX, scaleY, color >>> 0, clip === undefined ? undefined : toRect(clip));
      } finally {
        image.dispose();
      }
    },
    fillRect(rect, color) {
      fillRect.call(context, toRect(rect), color >>> 0);
    },
    drawReplacement(runHandle, x, y) {
      const b = getNativeBindings();
      const replacementHandle = b.TRGlyphRunGetReplacement(runHandle);
      try {
        if (replacementHandle === undefined) {
          return;
        }
        // The run's metrics are in the user space; the bounds are in pixels like everything else.
        const bounds = {
          x,
          y,
          ascent: b.TRGlyphRunGetAscent(runHandle) * renderScale,
          descent: b.TRGlyphRunGetDescent(runHandle) * renderScale,
          width: b.TRGlyphRunGetWidth(runHandle) * renderScale,
        };
        const replacement = new Replacement(adopt, replacementHandle);
        try {
          replacement.draw(context, bounds);
        } finally {
          replacement.dispose();
        }
      } finally {
        b.disposeHandle(runHandle);
      }
    },
  };
  if (beginShadow !== undefined && endShadow !== undefined) {
    adapter.beginShadow = (radius, dx, dy, color) => beginShadow.call(context, radius, dx, dy, color >>> 0);
    adapter.endShadow = () => endShadow.call(context);
  }
  return adapter;
}

/**
 * Draws with Core into a `DrawingContext`: installs the draw callbacks on the renderer, runs `draw`
 * (a Core draw function) and puts back the callbacks the renderer had, also when `draw` or a member
 * of the context throws. A native painter's callbacks that the renderer had are therefore restored,
 * and a second draw with no context or another one finds a clean renderer.
 *
 * Both objects get references of their own for the call (`holding`), so a member that disposes a
 * wrapper takes effect when the draw is over.
 *
 * @param receiver The glyph run, line or frame, whose `nativeHandle` has been read (so a disposed
 *   one has already thrown).
 * @internal
 */
export function drawIntoContext<Receiver extends Handle<string>>(
  receiver: Receiver,
  renderer: Renderer,
  context: DrawingContext,
  draw: (receiver: Receiver, renderer: Handle<"TRRenderer">) => void,
): void {
  if (!(renderer instanceof Renderer)) {
    throw new TypeError("renderer must be a Renderer.");
  }
  const rendererHandle = renderer.nativeHandle;

  holding([receiver, rendererHandle], ([heldReceiver, heldRenderer]) => {
    const b = getNativeBindings();
    const adapter = makeAdapter(context, b.TRRendererGetRenderScale(heldRenderer));
    const scope = b.installDrawContext(heldRenderer, adapter);
    try {
      draw(heldReceiver as Receiver, heldRenderer);
    } finally {
      b.restoreDrawContext(scope);
    }
  });
}
