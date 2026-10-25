#include "JavaBridge.h"

// The library is part of the app's own, whose JNI_OnLoad is React Native's, so the natives are not
// registered there as in Tehreer-Android: Kotlin calls `JniBridge.nRegister` once, before it uses
// any of them.
extern "C" JNIEXPORT jint JNICALL Java_com_tehreer_reactnative_JniBridge_nRegister(JNIEnv *env, jclass clazz)
{
    return register_com_tehreer_reactnative_ComposedFrame(env) == JNI_OK
        && register_com_tehreer_reactnative_Renderer(env) == JNI_OK
        ? JNI_OK : JNI_ERR;
}

jint JavaBridge::registerClass(JNIEnv *env, const char *name, const JNINativeMethod *methods, jint count)
{
    jclass clazz = env->FindClass(name);
    if (clazz == nullptr) {
        return JNI_ERR;
    }

    jint result = env->RegisterNatives(clazz, methods, count);
    env->DeleteLocalRef(clazz);

    return result;
}
