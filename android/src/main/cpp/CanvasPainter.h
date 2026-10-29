#pragma once

#include "../../../../cpp/painter/PaintTarget.h"
#include "JniSupport.h"

namespace tehreer::android {

/**
 * Draws what Core produces into an `android.graphics.Canvas` through JNI. The canvas is in pixels
 * (a view's canvas is), so Core's render scale is the display density and nothing is scaled here.
 *
 * Glyph images become `Bitmap`s that stay with the glyph image of Core (`ALPHA_8`, tinted by the
 * paint color, for alpha images; premultiplied `ARGB_8888` for color ones) and are released when
 * Core destroys the image. A shadow scope is drawn into a layer, so that a glyph that is filled
 * and stroked casts one shadow, and the layer is blurred and composited at `EndShadow`: the
 * `Paint.setShadowLayer` of the framework does not draw shadows for bitmaps and is not supported
 * on a hardware accelerated canvas, which a view's canvas is.
 *
 * The canvas must have no scale or rotation of its own (a view's canvas has none): the shadow
 * layer is sized to the clip bounds, which are in the canvas's local units, and is composited at
 * the same numbers, so both only agree with the pixels of the layer when a unit is a pixel. The
 * view path never sets such a matrix; a caller that does must draw into a bitmap of its own.
 *
 * It lives for one draw call on one thread, with the `JNIEnv` of that thread.
 */
class CanvasPainter final : public painter::PaintTarget {
public:
    /** `canvas` must stay valid (a local reference of the caller is) as long as the painter lives. */
    CanvasPainter(JNIEnv *env, jobject canvas);
    ~CanvasPainter() override;

    CanvasPainter(const CanvasPainter &) = delete;
    CanvasPainter &operator=(const CanvasPainter &) = delete;

    /** Whether the framework could be used; otherwise every call does nothing. */
    bool IsReady() const { return _paint != nullptr; }

    void DrawGlyphImage(TRGlyphImageRef image, TRPoint origin, TRFloat scaleX, TRFloat scaleY, TRColor color,
                        const TRRect *clip) override;
    void FillRect(TRRect rect, TRColor color) override;
    void BeginShadow(TRFloat radius, TRFloat dx, TRFloat dy, TRColor color) override;
    void EndShadow() override;

private:
    bool HasPendingException() const { return ClearException(_env); }
    void SetPaintColor(jint color);
    void SetPaintFilter(bool filter);
    jobject Retained(jobject local);
    void ReleaseLayer();
    void DrawShadow();

    JNIEnv *_env;
    const Jni *_jni;
    jobject _canvas;
    /** Where drawing goes now: the canvas, or the layer of a shadow scope. */
    jobject _target;

    jobject _paint = nullptr;
    jobject _rectF = nullptr;
    /** What the paint holds now, so unchanged state is not set again. */
    jint _paintColor = 0;
    bool _paintColorKnown = false;
    int _paintFilter = -1;

    // The shadow scope. Every scope has a layer of its own, dropped at EndShadow.
    jobject _layerBitmap = nullptr;
    jobject _layerCanvas = nullptr;
    jobject _clipBounds = nullptr;
    jobject _blurPaint = nullptr;
    jintArray _offsets = nullptr;
    int _layerLeft = 0;
    int _layerTop = 0;
    bool _inShadow = false;
    /** Open shadow scopes, nested ones included; only the outermost one makes a layer. */
    int _scopeDepth = 0;
    float _shadowRadius = 0;
    float _shadowDx = 0;
    float _shadowDy = 0;
    TRColor _shadowColor = 0;
};

} // namespace tehreer::android
