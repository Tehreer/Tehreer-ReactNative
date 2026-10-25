#include <jni.h>
#include <vector>

#include <Tehreer/Tehreer.h>

#include "CanvasPainter.h"
#include "JavaBridge.h"
#include "LayoutHandles.h"
#include "painter/PaintCallbacks.h"
#include "views/TextLayout.h"

using namespace tehreer;

/* Lays the typesetter out as the shadow node measures it, for the size the view was given. */
static jlong createFrame(JNIEnv *env, jclass clazz, jlong typesetter, jfloat width, jfloat height,
    jfloatArray settings, jboolean isScrollable)
{
    jfloat values[views::FrameSettings::kCount] = {};
    jsize count = env->GetArrayLength(settings);
    if (count > static_cast<jsize>(views::FrameSettings::kCount)) {
        count = static_cast<jsize>(views::FrameSettings::kCount);
    }
    env->GetFloatArrayRegion(settings, 0, count, values);

    views::FrameSettings frameSettings = views::FrameSettings::From(
        values, count == static_cast<jsize>(views::FrameSettings::kCount) ? views::FrameSettings::kCount : 0);

    return reinterpret_cast<jlong>(views::ComposeFrame(toTypesetter(typesetter), width, height, frameSettings,
                                                       isScrollable, false));
}

static void disposeFrame(JNIEnv *env, jclass clazz, jlong handle)
{
    TRComposedFrameRelease(toFrame(handle));
}

static jfloat getFrameWidth(JNIEnv *env, jobject obj, jlong handle)
{
    return TRComposedFrameGetWidth(toFrame(handle));
}

static jfloat getFrameHeight(JNIEnv *env, jobject obj, jlong handle)
{
    return TRComposedFrameGetHeight(toFrame(handle));
}

static jint getFrameLineCount(JNIEnv *env, jobject obj, jlong handle)
{
    return static_cast<jint>(TRComposedFrameGetLineCount(toFrame(handle)));
}

/* Returns a line that the caller owns, as the frame might be disposed before the line. */
static jlong getFrameLine(JNIEnv *env, jobject obj, jlong handle, jint index)
{
    TRComposedLineRef line = TRComposedFrameGetLine(toFrame(handle), static_cast<TRUInteger>(index));

    return reinterpret_cast<jlong>(line != nullptr ? TRComposedLineRetain(line) : nullptr);
}

static void putSelectionRect(void *userData, TRRect rect, TRBoolean *stop)
{
    auto floats = static_cast<std::vector<jfloat> *>(userData);

    floats->push_back(rect.origin.x);
    floats->push_back(rect.origin.y);
    floats->push_back(rect.origin.x + rect.size.width);
    floats->push_back(rect.origin.y + rect.size.height);
}

/* Returns the left, top, right and bottom of each rectangle of a selection, one after the other. */
static jfloatArray enumerateSelection(JNIEnv *env, jobject obj, jlong handle, jint start, jint end)
{
    std::vector<jfloat> floats;
    if (end > start) {
        TRComposedFrameEnumerateSelection(toFrame(handle), static_cast<TRUInteger>(start),
                                          static_cast<TRUInteger>(end - start), putSelectionRect, &floats);
    }

    jfloatArray array = env->NewFloatArray(static_cast<jsize>(floats.size()));
    if (array != nullptr && !floats.empty()) {
        env->SetFloatArrayRegion(array, 0, static_cast<jsize>(floats.size()), floats.data());
    }

    return array;
}

static void drawFrame(JNIEnv *env, jobject obj, jlong handle, jlong rendererHandle, jobject canvas,
    jfloat x, jfloat y)
{
    android::CanvasPainter target(env, canvas);
    if (target.IsReady()) {
        painter::DrawFrame(toFrame(handle), toRenderer(rendererHandle), target, TRPoint{x, y});
    }
}

static JNINativeMethod FRAME_METHODS[] = {
    { "nCreate", "(JFF[FZ)J", (void *)createFrame },
    { "nDispose", "(J)V", (void *)disposeFrame },
    { "nGetWidth", "(J)F", (void *)getFrameWidth },
    { "nGetHeight", "(J)F", (void *)getFrameHeight },
    { "nGetLineCount", "(J)I", (void *)getFrameLineCount },
    { "nGetLine", "(JI)J", (void *)getFrameLine },
    { "nEnumerateSelection", "(JII)[F", (void *)enumerateSelection },
    { "nDraw", "(JJLandroid/graphics/Canvas;FF)V", (void *)drawFrame },
};

jint register_com_tehreer_reactnative_ComposedFrame(JNIEnv *env)
{
    return JavaBridge::registerClass(env, "com/tehreer/reactnative/ComposedFrame", FRAME_METHODS,
                                     sizeof(FRAME_METHODS) / sizeof(FRAME_METHODS[0]));
}
