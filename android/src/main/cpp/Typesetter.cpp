#include <jni.h>

#include <Tehreer/Tehreer.h>

#include "JavaBridge.h"
#include "LayoutHandles.h"
#include "views/Typesetters.h"

/* Takes a reference of the typesetter that JavaScript registered under the id, which the view releases. */
static jlong retainTypesetter(JNIEnv *env, jclass clazz, jint id)
{
    return reinterpret_cast<jlong>(tehreer::views::Typesetters::Retain(id));
}

/* Another reference, for a layout that runs on a thread of its own while the view keeps its own. */
static jlong duplicateTypesetter(JNIEnv *env, jclass clazz, jlong handle)
{
    return reinterpret_cast<jlong>(TRTypesetterRetain(toTypesetter(handle)));
}

static void disposeTypesetter(JNIEnv *env, jclass clazz, jlong handle)
{
    TRTypesetterRelease(toTypesetter(handle));
}

static JNINativeMethod TYPESETTER_METHODS[] = {
    { "nRetain", "(I)J", (void *)retainTypesetter },
    { "nDuplicate", "(J)J", (void *)duplicateTypesetter },
    { "nDispose", "(J)V", (void *)disposeTypesetter },
};

jint register_com_tehreer_reactnative_Typesetter(JNIEnv *env)
{
    return JavaBridge::registerClass(env, "com/tehreer/reactnative/Typesetter", TYPESETTER_METHODS,
                                     sizeof(TYPESETTER_METHODS) / sizeof(TYPESETTER_METHODS[0]));
}
