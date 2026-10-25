#include <jni.h>

#include <algorithm>

#include <Tehreer/Tehreer.h>

#include "CanvasPainter.h"
#include "JavaBridge.h"
#include "LayoutHandles.h"
#include "painter/PaintCallbacks.h"
#include "views/ComposedFrames.h"

using namespace tehreer;

/* A reference of the frame that JavaScript registered under the id, or 0. */
static jlong retainFrame(JNIEnv *env, jclass clazz, jint id)
{
    return reinterpret_cast<jlong>(views::ComposedFrames::Retain(id));
}

static void disposeFrame(JNIEnv *env, jclass clazz, jlong handle)
{
    TRComposedFrameRelease(toFrame(handle));
}

/* Draws `count` lines from `first`; the origin is that of the container of the lines, as for the line of Core. */
static void drawLines(JNIEnv *env, jobject obj, jlong handle, jlong rendererHandle, jobject canvas,
    jint first, jint count, jfloat x, jfloat y)
{
    android::CanvasPainter target(env, canvas);
    if (!target.IsReady()) {
        return;
    }

    TRComposedFrameRef frame = toFrame(handle);
    TRUInteger total = TRComposedFrameGetLineCount(frame);
    TRUInteger begin = static_cast<TRUInteger>(std::max(0, first));
    TRUInteger end = std::min<TRUInteger>(total, begin + static_cast<TRUInteger>(std::max(0, count)));
    for (TRUInteger index = begin; index < end; index++) {
        TRComposedLineRef line = TRComposedFrameGetLine(frame, index);
        if (line != nullptr) {
            painter::DrawLine(line, toRenderer(rendererHandle), target, TRPoint{x, y});
        }
    }
}

static JNINativeMethod FRAME_METHODS[] = {
    { "nRetain", "(I)J", (void *)retainFrame },
    { "nDispose", "(J)V", (void *)disposeFrame },
    { "nDrawLines", "(JJLandroid/graphics/Canvas;IIFF)V", (void *)drawLines },
};

jint register_com_tehreer_reactnative_ComposedFrame(JNIEnv *env)
{
    return JavaBridge::registerClass(env, "com/tehreer/reactnative/ComposedFrame", FRAME_METHODS,
                                     sizeof(FRAME_METHODS) / sizeof(FRAME_METHODS[0]));
}
