package com.tehreer.reactnative

import android.graphics.Canvas

/** The text of a view laid out for a size, which the caller owns and disposes. */
internal class ComposedFrame private constructor(private val nativeFrame: Long) {
    val width: Float get() = nGetWidth(nativeFrame)
    val height: Float get() = nGetHeight(nativeFrame)
    val lineCount: Int get() = nGetLineCount(nativeFrame)

    internal val handle: Long get() = nativeFrame

    /** A line that the caller owns, as the frame might be disposed before the line. */
    fun getLine(index: Int) = ComposedLine(nGetLine(nativeFrame, index))

    /** The left, top, right and bottom of each rectangle that covers the code units, one after the other. */
    fun enumerateSelection(fromIndex: Int, toIndex: Int): FloatArray = nEnumerateSelection(nativeFrame, fromIndex, toIndex)

    fun draw(renderer: Renderer, canvas: Canvas, x: Float, y: Float) {
        nDraw(nativeFrame, renderer.nativeRenderer, canvas, x, y)
    }

    fun dispose() {
        nDispose(nativeFrame)
    }

    private external fun nGetWidth(nativeFrame: Long): Float
    private external fun nGetHeight(nativeFrame: Long): Float
    private external fun nGetLineCount(nativeFrame: Long): Int
    private external fun nGetLine(nativeFrame: Long, index: Int): Long
    private external fun nEnumerateSelection(nativeFrame: Long, start: Int, end: Int): FloatArray
    private external fun nDraw(nativeFrame: Long, nativeRenderer: Long, canvas: Canvas, x: Float, y: Float)

    companion object {
        init {
            JniBridge.loadLibrary()
        }

        /**
         * Lays the typesetter out for a size with `settings` (the order of `FrameSettings` in
         * `cpp/views/TextLayout.h`), as the shadow node measured it. A scrolling view lays out the whole
         * text for the width. Null if there is no text.
         */
        fun create(typesetter: Typesetter, width: Float, height: Float, settings: FloatArray, isScrollable: Boolean): ComposedFrame? =
            nCreate(typesetter.nativeTypesetter, width, height, settings, isScrollable).let { if (it == 0L) null else ComposedFrame(it) }

        @JvmStatic private external fun nCreate(nativeTypesetter: Long, width: Float, height: Float, settings: FloatArray, isScrollable: Boolean): Long
        @JvmStatic private external fun nDispose(nativeFrame: Long)
    }
}
