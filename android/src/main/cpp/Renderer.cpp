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

static JNINativeMethod RENDERER_METHODS[] = {
    { "nCreate", "()J", (void *)createRenderer },
    { "nDispose", "(J)V", (void *)disposeRenderer },
    { "nSetRenderScale", "(JF)V", (void *)setRenderScale },
    { "nSetForegroundColor", "(JI)V", (void *)setForegroundColor },
};

jint register_com_tehreer_reactnative_Renderer(JNIEnv *env)
{
    return JavaBridge::registerClass(env, "com/tehreer/reactnative/Renderer", RENDERER_METHODS,
                                     sizeof(RENDERER_METHODS) / sizeof(RENDERER_METHODS[0]));
}
