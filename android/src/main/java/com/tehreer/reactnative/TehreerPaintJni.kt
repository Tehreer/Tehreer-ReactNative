package com.tehreer.reactnative

import android.graphics.Canvas
import com.facebook.soloader.SoLoader

/**
 * The JNI functions of the Canvas painter (`android/src/main/cpp/TextBaseJni.cpp`). A painter
 * handle belongs to one view and is used on the UI thread only.
 */
internal object TehreerPaintJni {
    init {
        // The C++ of the library is part of the app's library, which React Native loads by this name.
        SoLoader.loadLibrary("appmodules")
    }

    /** A painter with a renderer of its own; 0 if it could not be made. */
    @JvmStatic external fun create(): Long

    @JvmStatic external fun destroy(painter: Long)

    /** The view is unmounted or recycled: lets go of its frame and of the text it was made from. */
    @JvmStatic external fun retire(painter: Long)

    /** Takes the frame of the id that the shadow node's state carries; 0 or an unknown id clears it. */
    @JvmStatic external fun setFrame(painter: Long, frameId: Int)

    /**
     * Draws the frame with its top left at the origin of the canvas; `density` is pixels per layout
     * unit. When `isWindowed` is set only the lines that meet the window (in layout units, from the
     * top of the text) are drawn, which is how a scrolling view avoids visiting a long text.
     */
    @JvmStatic external fun draw(
        painter: Long,
        canvas: Canvas,
        density: Float,
        textColor: Int,
        selectionStart: Int,
        selectionEnd: Int,
        selectionColor: Int,
        isWindowed: Boolean,
        visibleTop: Float,
        visibleWidth: Float,
        visibleHeight: Float,
    )
}
