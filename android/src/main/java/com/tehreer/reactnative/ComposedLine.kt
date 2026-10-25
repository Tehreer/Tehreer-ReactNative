package com.tehreer.reactnative

import android.graphics.Canvas

/** A line of a frame, which the caller owns and disposes. */
internal class ComposedLine(private val nativeLine: Long) {
    val originY: Float get() = nGetOriginY(nativeLine)
    val ascent: Float get() = nGetAscent(nativeLine)
    val height: Float get() = nGetHeight(nativeLine)

    /** Draws the line; the position is that of its container, in layout units, as `TRComposedLineDraw` takes it. */
    fun draw(renderer: Renderer, canvas: Canvas, x: Float, y: Float) {
        nDraw(nativeLine, renderer.nativeRenderer, canvas, x, y)
    }

    fun dispose() {
        nDispose(nativeLine)
    }

    private external fun nGetOriginY(nativeLine: Long): Float
    private external fun nGetAscent(nativeLine: Long): Float
    private external fun nGetHeight(nativeLine: Long): Float
    private external fun nDraw(nativeLine: Long, nativeRenderer: Long, canvas: Canvas, x: Float, y: Float)

    private companion object {
        init {
            JniBridge.loadLibrary()
        }

        @JvmStatic external fun nDispose(nativeLine: Long)
    }
}
