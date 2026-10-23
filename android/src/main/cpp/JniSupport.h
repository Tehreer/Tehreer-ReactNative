#pragma once

#include <jni.h>

namespace tehreer::android {

/**
 * The classes, methods and constants of the Android framework that the painter calls, looked up
 * once. Calling Java from C++ costs a JNI transition each, so the painter keeps `Paint` and
 * `RectF` objects and changes them in place instead of making new ones for every glyph.
 */
struct Jni {
    jclass bitmap;
    jclass canvas;
    jclass paint;
    jclass rectF;
    jclass rect;
    jclass blurFilter;

    jmethodID createBitmap;
    jmethodID eraseColor;
    jmethodID recycle;
    jmethodID extractAlpha;

    jmethodID canvasInit;
    jmethodID drawBitmapRects;
    jmethodID drawBitmapAt;
    jmethodID drawRect;
    jmethodID drawColor;
    jmethodID save;
    jmethodID restore;
    jmethodID clipRect;
    jmethodID translate;
    jmethodID getClipBounds;

    jmethodID paintInit;
    jmethodID setColor;
    jmethodID setFilterBitmap;
    jmethodID setMaskFilter;
    jmethodID rectFInit;
    jmethodID rectFSet;
    jmethodID rectInit;
    jmethodID blurFilterInit;

    jfieldID rectLeft;
    jfieldID rectTop;
    jfieldID rectRight;
    jfieldID rectBottom;

    /** Global references to `Bitmap.Config.ALPHA_8`, `ARGB_8888` and `BlurMaskFilter.Blur.NORMAL`. */
    jobject alpha8;
    jobject argb8888;
    jobject blurNormal;
};

/**
 * Looks the framework up on first use and remembers the `JavaVM` for threads that Java did not
 * start. Returns null if something is missing, in which case nothing is drawn.
 */
const Jni *GetJni(JNIEnv *env);

/** Clears a pending Java exception, which must never stay while more JNI calls are made. */
bool ClearException(JNIEnv *env);

/**
 * The `JNIEnv` of the current thread, attaching it if Java did not start it. A glyph image can
 * be destroyed on any thread (the one that releases the last reference), and its bitmap is
 * released there.
 */
class ScopedEnv final {
public:
    ScopedEnv();
    ~ScopedEnv();

    ScopedEnv(const ScopedEnv &) = delete;
    ScopedEnv &operator=(const ScopedEnv &) = delete;

    /** Null if there is no VM or the thread could not be attached. */
    JNIEnv *get() const { return _env; }

private:
    JNIEnv *_env = nullptr;
    bool _attached = false;
};

} // namespace tehreer::android
