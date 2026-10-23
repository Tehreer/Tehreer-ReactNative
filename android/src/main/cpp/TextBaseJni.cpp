#include "../../../../cpp/fabric/FrameRegistry.h"
#include "../../../../cpp/painter/PaintCallbacks.h"
#include "CanvasPainter.h"

#include <jni.h>

#include <memory>

// The native side of TehreerPaintJni.kt: what the Android view of the `TehreerTextBase` component
// calls to paint the frame that its shadow node composed. A `ViewPainter` belongs to one view and
// is used on the UI thread only.

namespace {

using tehreer::fabric::ComposedFrameBox;
using tehreer::fabric::FrameRegistry;

struct ViewPainter {
    tehreer::painter::FramePainter framePainter;
    /** One reference of the frame, so that it outlives the state it came from while it is painted. */
    std::shared_ptr<const ComposedFrameBox> frame;
};

ViewPainter *Painter(jlong handle) {
    return reinterpret_cast<ViewPainter *>(handle);
}

} // namespace

extern "C" {

JNIEXPORT jlong JNICALL Java_com_tehreer_reactnative_TehreerPaintJni_create(JNIEnv *, jclass) {
    try {
        return reinterpret_cast<jlong>(new ViewPainter());
    } catch (...) {
        return 0;
    }
}

JNIEXPORT void JNICALL Java_com_tehreer_reactnative_TehreerPaintJni_destroy(JNIEnv *, jclass, jlong handle) {
    delete Painter(handle);
}

// An id of 0, or of a frame that is gone, clears the frame: nothing is drawn.
JNIEXPORT void JNICALL Java_com_tehreer_reactnative_TehreerPaintJni_setFrame(JNIEnv *, jclass, jlong handle, jint frameId) {
    if (ViewPainter *painter = Painter(handle)) {
        painter->frame = FrameRegistry::Find(static_cast<std::uint32_t>(frameId));
    }
}

JNIEXPORT void JNICALL Java_com_tehreer_reactnative_TehreerPaintJni_draw(JNIEnv *env, jclass, jlong handle, jobject canvas, jfloat density) {
    ViewPainter *painter = Painter(handle);
    if (painter == nullptr || !painter->frame || canvas == nullptr) {
        return;
    }

    tehreer::android::CanvasPainter target(env, canvas);
    if (target.IsReady()) {
        painter->framePainter.Draw(painter->frame->get(), target, density);
    }
}

} // extern "C"
