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
    if (ViewPainter *painter = Painter(handle)) {
        // The state of the node outlives the view, and holds the frame: let the frame go now.
        if (painter->frame) {
            painter->frame->Retire(true);
        }
    }
    delete Painter(handle);
}

// The view is unmounted (or recycled): its frame and the text it was made from are not needed.
JNIEXPORT void JNICALL Java_com_tehreer_reactnative_TehreerPaintJni_retire(JNIEnv *, jclass, jlong handle) {
    if (ViewPainter *painter = Painter(handle)) {
        if (painter->frame) {
            painter->frame->Retire(true);
        }
    }
}

// An id of 0, or of a frame that is gone, clears the frame: nothing is drawn.
JNIEXPORT void JNICALL Java_com_tehreer_reactnative_TehreerPaintJni_setFrame(JNIEnv *, jclass, jlong handle, jint frameId) {
    if (ViewPainter *painter = Painter(handle)) {
        auto next = FrameRegistry::Find(static_cast<std::uint32_t>(frameId));
        // The frame that was shown is no longer wanted (the state that holds it stays with React Native).
        if (painter->frame && painter->frame != next) {
            painter->frame->Retire(false);
        }
        painter->frame = std::move(next);
        // The locator of the previous frame holds a reference to it.
        painter->framePainter.Reset();
    }
}

JNIEXPORT void JNICALL Java_com_tehreer_reactnative_TehreerPaintJni_draw(
    JNIEnv *env, jclass, jlong handle, jobject canvas, jfloat density, jint textColor, jint selectionStart, jint selectionEnd,
    jint selectionColor, jboolean isWindowed, jfloat visibleTop, jfloat visibleWidth, jfloat visibleHeight) {
    ViewPainter *painter = Painter(handle);
    if (painter == nullptr || !painter->frame || canvas == nullptr) {
        return;
    }

    // Per draw because it holds JNI references of this thread and a layer per shadow scope, and
    // the canvas is only valid during onDraw.
    tehreer::android::CanvasPainter target(env, canvas);
    if (target.IsReady()) {
        tehreer::painter::FramePaint paint;
        paint.textColor = static_cast<TRColor>(textColor);
        paint.selectionStart = selectionStart;
        paint.selectionEnd = selectionEnd;
        paint.selectionColor = static_cast<TRColor>(selectionColor);
        // The canvas of a scrolled view is already moved by the scroll, so the frame is drawn at
        // its own origin and only the lines in view are visited. The window is in layout units.
        paint.isWindowed = isWindowed != JNI_FALSE;
        paint.visible = TRRect{TRPoint{0, visibleTop}, TRSize{visibleWidth, visibleHeight}};
        // A reference for the length of the draw: the frame may be retired meanwhile.
        if (TRComposedFrameRef frame = painter->frame->Acquire()) {
            painter->framePainter.Draw(frame, target, density, paint);
            TRComposedFrameRelease(frame);
        }
    }
}

} // extern "C"
