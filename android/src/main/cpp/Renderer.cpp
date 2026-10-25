#include <jni.h>

#include <Tehreer/Tehreer.h>

#include "JavaBridge.h"
#include "LayoutHandles.h"

static jlong createRenderer(JNIEnv *env, jclass clazz)
{
    return reinterpret_cast<jlong>(TRRendererCreate());
}

static void disposeRenderer(JNIEnv *env, jclass clazz, jlong handle)
{
    TRRendererRelease(toRenderer(handle));
}

static void setRenderScale(JNIEnv *env, jclass clazz, jlong handle, jfloat renderScale)
{
    TRRendererSetRenderScale(toRenderer(handle), renderScale);
}

static void setForegroundColor(JNIEnv *env, jclass clazz, jlong handle, jint color)
{
    TRRendererSetForegroundColor(toRenderer(handle), static_cast<TRColor>(color));
}

static void setDrawStyle(JNIEnv *env, jclass clazz, jlong handle, jint drawStyle)
{
    TRRendererSetDrawStyle(toRenderer(handle), static_cast<TRDrawStyle>(drawStyle));
}

static void setStrokeColor(JNIEnv *env, jclass clazz, jlong handle, jint color)
{
    TRRendererSetStrokeColor(toRenderer(handle), static_cast<TRColor>(color));
}

static void setStrokeRadius(JNIEnv *env, jclass clazz, jlong handle, jfloat radius)
{
    TRRendererSetStrokeRadius(toRenderer(handle), radius);
}

static void setStrokeCap(JNIEnv *env, jclass clazz, jlong handle, jint strokeCap)
{
    TRRendererSetStrokeCap(toRenderer(handle), static_cast<TRStrokeCap>(strokeCap));
}

static void setStrokeJoin(JNIEnv *env, jclass clazz, jlong handle, jint strokeJoin)
{
    TRRendererSetStrokeJoin(toRenderer(handle), static_cast<TRStrokeJoin>(strokeJoin));
}

static void setStrokeMiter(JNIEnv *env, jclass clazz, jlong handle, jfloat miter)
{
    TRRendererSetStrokeMiter(toRenderer(handle), miter);
}

static void setShadowColor(JNIEnv *env, jclass clazz, jlong handle, jint color)
{
    TRRendererSetShadowColor(toRenderer(handle), static_cast<TRColor>(color));
}

static void setShadowRadius(JNIEnv *env, jclass clazz, jlong handle, jfloat radius)
{
    TRRendererSetShadowRadius(toRenderer(handle), radius);
}

static void setShadowDx(JNIEnv *env, jclass clazz, jlong handle, jfloat dx)
{
    TRRendererSetShadowDx(toRenderer(handle), dx);
}

static void setShadowDy(JNIEnv *env, jclass clazz, jlong handle, jfloat dy)
{
    TRRendererSetShadowDy(toRenderer(handle), dy);
}

static JNINativeMethod RENDERER_METHODS[] = {
    { "nCreate", "()J", (void *)createRenderer },
    { "nDispose", "(J)V", (void *)disposeRenderer },
    { "nSetRenderScale", "(JF)V", (void *)setRenderScale },
    { "nSetForegroundColor", "(JI)V", (void *)setForegroundColor },
    { "nSetDrawStyle", "(JI)V", (void *)setDrawStyle },
    { "nSetStrokeColor", "(JI)V", (void *)setStrokeColor },
    { "nSetStrokeRadius", "(JF)V", (void *)setStrokeRadius },
    { "nSetStrokeCap", "(JI)V", (void *)setStrokeCap },
    { "nSetStrokeJoin", "(JI)V", (void *)setStrokeJoin },
    { "nSetStrokeMiter", "(JF)V", (void *)setStrokeMiter },
    { "nSetShadowColor", "(JI)V", (void *)setShadowColor },
    { "nSetShadowRadius", "(JF)V", (void *)setShadowRadius },
    { "nSetShadowDx", "(JF)V", (void *)setShadowDx },
    { "nSetShadowDy", "(JF)V", (void *)setShadowDy },
};

jint register_com_tehreer_reactnative_Renderer(JNIEnv *env)
{
    return JavaBridge::registerClass(env, "com/tehreer/reactnative/Renderer", RENDERER_METHODS,
                                     sizeof(RENDERER_METHODS) / sizeof(RENDERER_METHODS[0]));
}
