#pragma once

#include "../../../../cpp/painter/PaintTarget.h"
#include "JniSupport.h"

namespace tehreer::android {

/**
 * Draws what Core produces into an `android.graphics.Canvas` through JNI. The canvas is in pixels
 * (a view's canvas is), so Core's render scale is the display density and nothing is scaled here.
 *
 * Glyph images become `Bitmap`s that stay with the glyph image of Core (`ALPHA_8`, tinted by the
 * paint color, for alpha images; premultiplied `ARGB_8888` for color ones) and are recycled when
 * Core destroys the image. A shadow scope is drawn into a layer, so that a glyph that is filled
 * and stroked casts one shadow, and the layer is blurred and composited at `EndShadow`: the
 * `Paint.setShadowLayer` of the framework does not draw shadows for bitmaps and is not supported
 * on a hardware accelerated canvas, which a view's canvas is.
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
    jobject Retained(jobject local);
    void ReleaseLayer();

    JNIEnv *_env;
    const Jni *_jni;
    jobject _canvas;
    /** Where drawing goes now: the canvas, or the layer of a shadow scope. */
    jobject _target;

    jobject _paint = nullptr;
    jobject _rectF = nullptr;

    // The shadow scope. The layer is reused by the scopes of one draw call that have its size.
    jobject _layerBitmap = nullptr;
    jobject _layerCanvas = nullptr;
    jobject _clipBounds = nullptr;
    jobject _blurPaint = nullptr;
    jintArray _offsets = nullptr;
    int _layerWidth = 0;
    int _layerHeight = 0;
    int _layerLeft = 0;
    int _layerTop = 0;
    bool _inShadow = false;
    float _shadowRadius = 0;
    float _shadowDx = 0;
    float _shadowDy = 0;
    TRColor _shadowColor = 0;
};

} // namespace tehreer::android
