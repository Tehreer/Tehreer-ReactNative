#pragma once

#include <jni.h>

namespace JavaBridge {

/** Registers the native methods of a class, as `JavaBridge::registerClass` does in Tehreer-Android. */
jint registerClass(JNIEnv *env, const char *name, const JNINativeMethod *methods, jint count);

} // namespace JavaBridge

jint register_com_tehreer_reactnative_ComposedFrame(JNIEnv *env);
jint register_com_tehreer_reactnative_ComposedLine(JNIEnv *env);
jint register_com_tehreer_reactnative_LineLocator(JNIEnv *env);
jint register_com_tehreer_reactnative_Renderer(JNIEnv *env);
jint register_com_tehreer_reactnative_Typesetter(JNIEnv *env);
