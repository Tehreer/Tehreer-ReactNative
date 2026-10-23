#include "../../../../cpp/painter/OffscreenSurface.h"

#include "CanvasPainter.h"

#include <android/bitmap.h>
#include <fbjni/fbjni.h>

#include <cmath>
#include <cstring>

namespace tehreer::painter {

// The canvas of a software bitmap; the view paints onto a hardware accelerated one, which the
// device test of the view (a screenshot of the example app) covers.
bool RenderOffscreen(float width, float height, float density, std::uint32_t background,
                     const std::function<void(PaintTarget &)> &draw, OffscreenPixels &result) {
    // The thread of the caller is a Java thread (the one of the JavaScript runtime).
    JNIEnv *env = facebook::jni::Environment::current();
    const android::Jni *jni = android::GetJni(env);
    if (env == nullptr || jni == nullptr) {
        return false;
    }

    int pixelWidth = static_cast<int>(std::lround(width * density));
    int pixelHeight = static_cast<int>(std::lround(height * density));
    if (pixelWidth <= 0 || pixelHeight <= 0) {
        return false;
    }

    jobject bitmap = env->CallStaticObjectMethod(jni->bitmap, jni->createBitmap, pixelWidth, pixelHeight, jni->argb8888);
    if (android::ClearException(env) || bitmap == nullptr) {
        return false;
    }

    bool done = false;
    jobject canvas = env->NewObject(jni->canvas, jni->canvasInit, bitmap);
    if (!android::ClearException(env) && canvas != nullptr) {
        env->CallVoidMethod(canvas, jni->drawColor, static_cast<jint>(background));
        {
            android::CanvasPainter target(env, canvas);
            if (target.IsReady()) {
                draw(target);
            }
        }

        AndroidBitmapInfo info;
        void *pixels = nullptr;
        if (AndroidBitmap_getInfo(env, bitmap, &info) == ANDROID_BITMAP_RESULT_SUCCESS && info.format == ANDROID_BITMAP_FORMAT_RGBA_8888
            && AndroidBitmap_lockPixels(env, bitmap, &pixels) == ANDROID_BITMAP_RESULT_SUCCESS) {
            result.width = pixelWidth;
            result.height = pixelHeight;
            result.rgba.resize(static_cast<std::size_t>(pixelWidth) * pixelHeight * 4);
            for (int row = 0; row < pixelHeight; row++) {
                std::memcpy(result.rgba.data() + static_cast<std::size_t>(row) * pixelWidth * 4,
                            static_cast<const std::uint8_t *>(pixels) + static_cast<std::size_t>(row) * info.stride,
                            static_cast<std::size_t>(pixelWidth) * 4);
            }
            AndroidBitmap_unlockPixels(env, bitmap);
            done = true;
        }
        env->DeleteLocalRef(canvas);
    }

    env->CallVoidMethod(bitmap, jni->recycle);
    android::ClearException(env);
    env->DeleteLocalRef(bitmap);
    return done;
}

} // namespace tehreer::painter
