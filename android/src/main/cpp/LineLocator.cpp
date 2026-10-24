#include <jni.h>
#include <vector>

#include <Tehreer/Tehreer.h>

#include "JavaBridge.h"
#include "LayoutHandles.h"

/* The locator does not retain the frame, so the view keeps the frame as long as the locator. */
static jlong createLocator(JNIEnv *env, jclass clazz, jlong frame, jlong renderer)
{
    return reinterpret_cast<jlong>(TRLineLocatorCreate(toFrame(frame), toRenderer(renderer)));
}

static void disposeLocator(JNIEnv *env, jclass clazz, jlong handle)
{
    TRLineLocatorRelease(toLocator(handle));
}

static void putLine(void *userData, TRUInteger lineIndex, TRBoolean *stop)
{
    static_cast<std::vector<jint> *>(userData)->push_back(static_cast<jint>(lineIndex));
}

/* Returns the indices of the lines whose boxes meet a rectangle. */
static jintArray findLines(JNIEnv *env, jobject obj, jlong handle, jfloat left, jfloat top, jfloat right,
    jfloat bottom)
{
    TRRect rect;
    rect.origin.x = left;
    rect.origin.y = top;
    rect.size.width = right - left;
    rect.size.height = bottom - top;

    std::vector<jint> indices;
    TRLineLocatorEnumerateLines(toLocator(handle), rect, putLine, &indices);

    jintArray array = env->NewIntArray(static_cast<jsize>(indices.size()));
    if (array != nullptr && !indices.empty()) {
        env->SetIntArrayRegion(array, 0, static_cast<jsize>(indices.size()), indices.data());
    }

    return array;
}

/* Returns the left, top, right and bottom of the box of a line. */
static jfloatArray getLineBox(JNIEnv *env, jobject obj, jlong handle, jint index)
{
    TRRect box;
    if (!TRLineLocatorGetLineBox(toLocator(handle), static_cast<TRUInteger>(index), &box)) {
        return nullptr;
    }

    jfloat values[4] = { box.origin.x, box.origin.y, box.origin.x + box.size.width, box.origin.y + box.size.height };
    jfloatArray array = env->NewFloatArray(4);
    if (array != nullptr) {
        env->SetFloatArrayRegion(array, 0, 4, values);
    }

    return array;
}

static JNINativeMethod LOCATOR_METHODS[] = {
    { "nCreate", "(JJ)J", (void *)createLocator },
    { "nDispose", "(J)V", (void *)disposeLocator },
    { "nFindLines", "(JFFFF)[I", (void *)findLines },
    { "nGetLineBox", "(JI)[F", (void *)getLineBox },
};

jint register_com_tehreer_reactnative_LineLocator(JNIEnv *env)
{
    return JavaBridge::registerClass(env, "com/tehreer/reactnative/LineLocator", LOCATOR_METHODS,
                                     sizeof(LOCATOR_METHODS) / sizeof(LOCATOR_METHODS[0]));
}
