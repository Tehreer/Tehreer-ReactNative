#include <jni.h>
#include <algorithm>

#include <Tehreer/Tehreer.h>

#include "JavaBridge.h"
#include "LayoutHandles.h"
#include "views/RendererSettings.h"

using namespace tehreer;

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

/* Sets how the text is drawn, from the numbers of the `rendererInts` and `rendererFloats` props. */
static void applySettings(JNIEnv *env, jclass clazz, jlong handle, jintArray ints, jfloatArray floats)
{
    jint intValues[views::RendererSettings::kIntCount] = {};
    jfloat floatValues[views::RendererSettings::kFloatCount] = {};
    jsize intCount = std::min(env->GetArrayLength(ints), static_cast<jsize>(views::RendererSettings::kIntCount));
    jsize floatCount = std::min(env->GetArrayLength(floats), static_cast<jsize>(views::RendererSettings::kFloatCount));
    env->GetIntArrayRegion(ints, 0, intCount, intValues);
    env->GetFloatArrayRegion(floats, 0, floatCount, floatValues);

    views::RendererSettings::From(intValues, intCount, floatValues, floatCount).Apply(toRenderer(handle));
}

static JNINativeMethod RENDERER_METHODS[] = {
    { "nCreate", "()J", (void *)createRenderer },
    { "nDispose", "(J)V", (void *)disposeRenderer },
    { "nSetRenderScale", "(JF)V", (void *)setRenderScale },
    { "nApply", "(J[I[F)V", (void *)applySettings },
};

jint register_com_tehreer_reactnative_Renderer(JNIEnv *env)
{
    return JavaBridge::registerClass(env, "com/tehreer/reactnative/Renderer", RENDERER_METHODS,
                                     sizeof(RENDERER_METHODS) / sizeof(RENDERER_METHODS[0]));
}
