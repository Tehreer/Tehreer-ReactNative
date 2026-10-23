#include "CanvasPainter.h"

#include "../../../../cpp/painter/PaintCounters.h"
#include "../../../../cpp/runtime/GlyphImageNativeData.h"

#include <android/bitmap.h>

#include <cstring>

namespace tehreer::android {
namespace {

using painter::PaintCounters;

/** What a glyph image of Core keeps for the painter: its bitmap. */
struct GlyphBitmap {
    jobject bitmap;
};

struct MakeContext {
    JNIEnv *env;
    const Jni *jni;
};

// Runs when Core destroys the image, on whichever thread releases the last reference: it only
// touches the Java side (no JavaScript) and never the image.
void DestroyGlyphBitmap(void *data) {
    auto *glyphBitmap = static_cast<GlyphBitmap *>(data);
    {
        ScopedEnv scoped;
        if (JNIEnv *env = scoped.get()) {
            if (const Jni *jni = GetJni(env)) {
                // The memory goes now instead of with the next garbage collection.
                env->CallVoidMethod(glyphBitmap->bitmap, jni->recycle);
                ClearException(env);
            }
            env->DeleteGlobalRef(glyphBitmap->bitmap);
        }
    }
    delete glyphBitmap;
    PaintCounters::Destroyed().fetch_add(1);
}

// Copies the pixels of Core into the bitmap, converting the byte order of color images.
bool FillBitmap(JNIEnv *env, jobject bitmap, TRGlyphImageRef image, std::uint32_t width, std::uint32_t height, bool isAlpha) {
    AndroidBitmapInfo info;
    if (AndroidBitmap_getInfo(env, bitmap, &info) != ANDROID_BITMAP_RESULT_SUCCESS || info.width != width || info.height != height
        || info.format != (isAlpha ? ANDROID_BITMAP_FORMAT_A_8 : ANDROID_BITMAP_FORMAT_RGBA_8888)) {
        return false;
    }

    void *pixels = nullptr;
    if (AndroidBitmap_lockPixels(env, bitmap, &pixels) != ANDROID_BITMAP_RESULT_SUCCESS || pixels == nullptr) {
        return false;
    }

    const std::uint8_t *source = TRGlyphImageGetPixelsPtr(image);
    auto *target = static_cast<std::uint8_t *>(pixels);

    if (isAlpha) {
        for (std::uint32_t row = 0; row < height; row++) {
            std::memcpy(target + row * info.stride, source + static_cast<std::size_t>(row) * width, width);
        }
    } else {
        // Core's order is alpha, red, green, blue with the colors premultiplied; a premultiplied
        // ARGB_8888 bitmap holds red, green, blue, alpha in memory.
        for (std::uint32_t row = 0; row < height; row++) {
            const std::uint8_t *in = source + static_cast<std::size_t>(row) * width * 4;
            std::uint8_t *out = target + row * info.stride;
            for (std::uint32_t column = 0; column < width; column++) {
                out[0] = in[1];
                out[1] = in[2];
                out[2] = in[3];
                out[3] = in[0];
                in += 4;
                out += 4;
            }
        }
    }

    AndroidBitmap_unlockPixels(env, bitmap);
    return true;
}

void *MakeGlyphBitmap(TRGlyphImageRef image, void *context) {
    auto *made = static_cast<MakeContext *>(context);
    JNIEnv *env = made->env;
    const Jni *jni = made->jni;

    std::uint32_t width = TRGlyphImageGetWidth(image);
    std::uint32_t height = TRGlyphImageGetHeight(image);
    if (width == 0 || height == 0 || TRGlyphImageGetPixelsPtr(image) == nullptr) {
        return nullptr;
    }

    bool isAlpha = TRGlyphImageGetFormat(image) == TRGlyphImageFormatAlpha;
    jobject local = env->CallStaticObjectMethod(jni->bitmap, jni->createBitmap, static_cast<jint>(width),
                                                static_cast<jint>(height), isAlpha ? jni->alpha8 : jni->argb8888);
    if (ClearException(env) || local == nullptr) {
        return nullptr;
    }

    bool filled = FillBitmap(env, local, image, width, height, isAlpha);
    jobject global = filled ? env->NewGlobalRef(local) : nullptr;
    if (!filled) {
        env->CallVoidMethod(local, jni->recycle);
        ClearException(env);
    }
    env->DeleteLocalRef(local);
    if (global == nullptr) {
        return nullptr;
    }

    PaintCounters::Created().fetch_add(1);
    return new GlyphBitmap{global};
}

constexpr jint kOpaqueWhite = static_cast<jint>(0xFFFFFFFFu);

} // namespace

CanvasPainter::CanvasPainter(JNIEnv *env, jobject canvas) : _env(env), _jni(GetJni(env)), _canvas(canvas), _target(canvas) {
    if (_jni == nullptr) {
        return;
    }

    jobject paint = _env->NewObject(_jni->paint, _jni->paintInit);
    jobject rectF = _env->NewObject(_jni->rectF, _jni->rectFInit);
    if (HasPendingException() || paint == nullptr || rectF == nullptr) {
        return;
    }
    _paint = _env->NewGlobalRef(paint);
    _rectF = _env->NewGlobalRef(rectF);
    _env->DeleteLocalRef(paint);
    _env->DeleteLocalRef(rectF);
}

CanvasPainter::~CanvasPainter() {
    ReleaseLayer();
    if (_blurPaint != nullptr) {
        _env->DeleteGlobalRef(_blurPaint);
    }
    if (_clipBounds != nullptr) {
        _env->DeleteGlobalRef(_clipBounds);
    }
    if (_offsets != nullptr) {
        _env->DeleteGlobalRef(_offsets);
    }
    if (_paint != nullptr) {
        _env->DeleteGlobalRef(_paint);
    }
    if (_rectF != nullptr) {
        _env->DeleteGlobalRef(_rectF);
    }
}

jobject CanvasPainter::Retained(jobject local) {
    if (local == nullptr) {
        return nullptr;
    }
    jobject global = _env->NewGlobalRef(local);
    _env->DeleteLocalRef(local);
    return global;
}

void CanvasPainter::DrawGlyphImage(TRGlyphImageRef image, TRPoint origin, TRFloat scaleX, TRFloat scaleY, TRColor color,
                                   const TRRect *clip) {
    if (!IsReady() || image == nullptr) {
        return;
    }

    MakeContext context{_env, _jni};
    auto *data = static_cast<GlyphBitmap *>(runtime::GetOrAttachNativeData(image, &MakeGlyphBitmap, &context, &DestroyGlyphBitmap));
    if (data == nullptr) {
        return;
    }

    // An alpha image is a mask that takes the color of the paint; a color image keeps its own
    // colors, and the paint must not tint or fade it.
    bool isAlpha = TRGlyphImageGetFormat(image) == TRGlyphImageFormatAlpha;
    _env->CallVoidMethod(_paint, _jni->setColor, isAlpha ? static_cast<jint>(color) : kOpaqueWhite);
    // Smooth only what is stretched: a bitmap font's strike, or an image at a fraction of a pixel.
    _env->CallVoidMethod(_paint, _jni->setFilterBitmap, static_cast<jboolean>(scaleX != 1.0f || scaleY != 1.0f));

    float width = static_cast<float>(TRGlyphImageGetWidth(image)) * scaleX;
    float height = static_cast<float>(TRGlyphImageGetHeight(image)) * scaleY;
    _env->CallVoidMethod(_rectF, _jni->rectFSet, origin.x, origin.y, origin.x + width, origin.y + height);

    if (clip != nullptr) {
        _env->CallIntMethod(_target, _jni->save);
        _env->CallBooleanMethod(_target, _jni->clipRect, clip->origin.x, clip->origin.y, clip->origin.x + clip->size.width,
                                clip->origin.y + clip->size.height);
    }

    _env->CallVoidMethod(_target, _jni->drawBitmapRects, data->bitmap, static_cast<jobject>(nullptr), _rectF, _paint);

    if (clip != nullptr) {
        _env->CallVoidMethod(_target, _jni->restore);
    }
    HasPendingException();
}

void CanvasPainter::FillRect(TRRect rect, TRColor color) {
    if (!IsReady()) {
        return;
    }

    _env->CallVoidMethod(_paint, _jni->setColor, static_cast<jint>(color));
    _env->CallVoidMethod(_target, _jni->drawRect, rect.origin.x, rect.origin.y, rect.origin.x + rect.size.width,
                         rect.origin.y + rect.size.height, _paint);
    HasPendingException();
}

void CanvasPainter::BeginShadow(TRFloat radius, TRFloat dx, TRFloat dy, TRColor color) {
    if (!IsReady() || _inShadow) {
        return;
    }

    // The layer covers what can be seen of the canvas, in its own coordinates.
    if (_clipBounds == nullptr) {
        _clipBounds = Retained(_env->NewObject(_jni->rect, _jni->rectInit));
        if (_clipBounds == nullptr) {
            HasPendingException();
            return;
        }
    }
    if (!_env->CallBooleanMethod(_canvas, _jni->getClipBounds, _clipBounds) || HasPendingException()) {
        return;
    }
    int left = _env->GetIntField(_clipBounds, _jni->rectLeft);
    int top = _env->GetIntField(_clipBounds, _jni->rectTop);
    int width = _env->GetIntField(_clipBounds, _jni->rectRight) - left;
    int height = _env->GetIntField(_clipBounds, _jni->rectBottom) - top;
    if (width <= 0 || height <= 0) {
        return;
    }

    if (_layerBitmap == nullptr || width != _layerWidth || height != _layerHeight) {
        ReleaseLayer();
        _layerBitmap = Retained(_env->CallStaticObjectMethod(_jni->bitmap, _jni->createBitmap, width, height, _jni->argb8888));
        if (_layerBitmap == nullptr || HasPendingException()) {
            // Out of memory: the scope is drawn without its shadow rather than not at all.
            ReleaseLayer();
            return;
        }
        _layerCanvas = Retained(_env->NewObject(_jni->canvas, _jni->canvasInit, _layerBitmap));
        if (_layerCanvas == nullptr || HasPendingException()) {
            ReleaseLayer();
            return;
        }
        _layerWidth = width;
        _layerHeight = height;
    } else {
        _env->CallVoidMethod(_layerBitmap, _jni->eraseColor, 0);
    }

    // What is drawn in the scope keeps the coordinates of the canvas.
    _env->CallIntMethod(_layerCanvas, _jni->save);
    _env->CallVoidMethod(_layerCanvas, _jni->translate, static_cast<float>(-left), static_cast<float>(-top));
    if (HasPendingException()) {
        return;
    }

    _layerLeft = left;
    _layerTop = top;
    _shadowRadius = radius;
    _shadowDx = dx;
    _shadowDy = dy;
    _shadowColor = color;
    _target = _layerCanvas;
    _inShadow = true;
}

void CanvasPainter::EndShadow() {
    if (!IsReady() || !_inShadow) {
        return;
    }

    _inShadow = false;
    _target = _canvas;
    _env->CallVoidMethod(_layerCanvas, _jni->restore);

    if (_blurPaint == nullptr) {
        _blurPaint = Retained(_env->NewObject(_jni->paint, _jni->paintInit));
    }
    if (_offsets == nullptr) {
        jintArray local = _env->NewIntArray(2);
        _offsets = local == nullptr ? nullptr : static_cast<jintArray>(_env->NewGlobalRef(local));
        if (local != nullptr) {
            _env->DeleteLocalRef(local);
        }
    }

    if (_blurPaint != nullptr && _offsets != nullptr && _shadowRadius > 0) {
        jobject filter = _env->NewObject(_jni->blurFilter, _jni->blurFilterInit, _shadowRadius, _jni->blurNormal);
        if (!HasPendingException() && filter != nullptr) {
            _env->CallObjectMethod(_blurPaint, _jni->setMaskFilter, filter);
            _env->DeleteLocalRef(filter);

            // The mask is the blurred coverage of the layer; the blur grows it, and the offsets say
            // where it goes to line up with the layer.
            jobject mask = _env->CallObjectMethod(_layerBitmap, _jni->extractAlpha, _blurPaint, _offsets);
            if (!HasPendingException() && mask != nullptr) {
                jint offsets[2] = {0, 0};
                _env->GetIntArrayRegion(_offsets, 0, 2, offsets);
                _env->CallVoidMethod(_paint, _jni->setColor, static_cast<jint>(_shadowColor));
                _env->CallVoidMethod(_paint, _jni->setFilterBitmap, static_cast<jboolean>(false));
                _env->CallVoidMethod(_canvas, _jni->drawBitmapAt, mask, static_cast<float>(_layerLeft + offsets[0]) + _shadowDx,
                                     static_cast<float>(_layerTop + offsets[1]) + _shadowDy, _paint);
                _env->DeleteLocalRef(mask);
            }
        }
    }

    // The glyphs themselves go over their shadow.
    _env->CallVoidMethod(_paint, _jni->setColor, kOpaqueWhite);
    _env->CallVoidMethod(_canvas, _jni->drawBitmapAt, _layerBitmap, static_cast<float>(_layerLeft), static_cast<float>(_layerTop),
                         _paint);
    HasPendingException();
}

void CanvasPainter::ReleaseLayer() {
    if (_layerBitmap != nullptr) {
        _env->CallVoidMethod(_layerBitmap, _jni->recycle);
        ClearException(_env);
        _env->DeleteGlobalRef(_layerBitmap);
        _layerBitmap = nullptr;
    }
    if (_layerCanvas != nullptr) {
        _env->DeleteGlobalRef(_layerCanvas);
        _layerCanvas = nullptr;
    }
    _layerWidth = 0;
    _layerHeight = 0;
}

} // namespace tehreer::android
