#include <jni.h>

#include <Tehreer/Tehreer.h>

#include "CanvasPainter.h"
#include "JavaBridge.h"
#include "LayoutHandles.h"
#include "painter/PaintCallbacks.h"

using namespace tehreer;

static void disposeLine(JNIEnv *env, jclass clazz, jlong handle)
{
    TRComposedLineRelease(toLine(handle));
}

static jfloat getLineOriginY(JNIEnv *env, jobject obj, jlong handle)
{
    return TRComposedLineGetOrigin(toLine(handle)).y;
}

static jfloat getLineAscent(JNIEnv *env, jobject obj, jlong handle)
{
    return TRComposedLineGetAscent(toLine(handle));
}

static jfloat getLineHeight(JNIEnv *env, jobject obj, jlong handle)
{
    return TRComposedLineGetHeight(toLine(handle));
}

/* The origin is that of the container of the line, as for the line of Core. */
static void drawLine(JNIEnv *env, jobject obj, jlong handle, jlong rendererHandle, jobject canvas,
    jfloat x, jfloat y)
{
    android::CanvasPainter target(env, canvas);
    if (target.IsReady()) {
        painter::DrawLine(toLine(handle), toRenderer(rendererHandle), target, TRPoint{x, y});
    }
}

static JNINativeMethod LINE_METHODS[] = {
    { "nDispose", "(J)V", (void *)disposeLine },
    { "nGetOriginY", "(J)F", (void *)getLineOriginY },
    { "nGetAscent", "(J)F", (void *)getLineAscent },
    { "nGetHeight", "(J)F", (void *)getLineHeight },
    { "nDraw", "(JJLandroid/graphics/Canvas;FF)V", (void *)drawLine },
};

jint register_com_tehreer_reactnative_ComposedLine(JNIEnv *env)
{
    return JavaBridge::registerClass(env, "com/tehreer/reactnative/ComposedLine", LINE_METHODS,
                                     sizeof(LINE_METHODS) / sizeof(LINE_METHODS[0]));
}
