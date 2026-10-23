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

    /** Takes the frame of the id that the shadow node's state carries; 0 or an unknown id clears it. */
    @JvmStatic external fun setFrame(painter: Long, frameId: Int)

    /** Draws the frame with its top left at the origin of the canvas; `density` is pixels per layout unit. */
    @JvmStatic external fun draw(painter: Long, canvas: Canvas, density: Float)
}
