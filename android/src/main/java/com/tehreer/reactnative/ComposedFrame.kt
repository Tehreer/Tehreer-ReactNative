package com.tehreer.reactnative

import android.graphics.Canvas
import java.util.concurrent.atomic.AtomicBoolean

/**
 * A reference of the composed frame that JavaScript registered. The view that took it disposes it as
 * soon as it lets go; if it never does (the view is not dropped properly), the finalizer gives the
 * reference back when this object is collected, as the classes of Tehreer-Android do.
 */
internal class ComposedFrame private constructor(private val nativeFrame: Long) {
    // Not the object itself, which the finalizer would keep alive: a separate object owns the release,
    // so it runs once however it is reached.
    private class Finalizer(private val nativeFrame: Long) {
        private val isReleased = AtomicBoolean(false)

        fun release() {
            if (isReleased.compareAndSet(false, true)) {
                nDispose(nativeFrame)
            }
        }

        @Suppress("unused")
        protected fun finalize() {
            release()
        }
    }

    private val finalizer = Finalizer(nativeFrame)

    /** Draws `count` lines from `first`; the position is that of their container, in layout units. */
    fun drawLines(renderer: Renderer, canvas: Canvas, first: Int, count: Int, x: Float, y: Float) {
        nDrawLines(nativeFrame, renderer.nativeRenderer, canvas, first, count, x, y)
    }

    /** Gives the reference back now. Idempotent; the frame is not drawn afterwards. */
    fun dispose() {
        finalizer.release()
    }

    private external fun nDrawLines(nativeFrame: Long, nativeRenderer: Long, canvas: Canvas, first: Int, count: Int, x: Float, y: Float)

    companion object {
        init {
            JniBridge.loadLibrary()
        }

        /** The frame of an id, or null if JavaScript has not registered it, or has unregistered it. */
        fun retain(id: Int): ComposedFrame? = nRetain(id).let { if (it == 0L) null else ComposedFrame(it) }

        @JvmStatic private external fun nRetain(id: Int): Long
        @JvmStatic private external fun nDispose(nativeFrame: Long)
    }
}
