package com.tehreer.reactnative

import java.util.concurrent.atomic.AtomicBoolean

/**
 * Draws text through Core, with the color, style and scale that it is given; each view has its own.
 * The properties are those of the renderer of Tehreer-Android (`textColor` is its `foregroundColor`)
 * and start as a new Core renderer has them. The view that made it disposes it when it goes; if it
 * never does, the finalizer releases it when this object is collected.
 */
internal class Renderer {
    private class Finalizer(private val nativeRenderer: Long) {
        private val isReleased = AtomicBoolean(false)

        fun release() {
            if (isReleased.compareAndSet(false, true)) {
                nDispose(nativeRenderer)
            }
        }

        @Suppress("unused")
        protected fun finalize() {
            release()
        }
    }

    val nativeRenderer: Long = nCreate()

    private val finalizer = Finalizer(nativeRenderer)

    var renderScale: Float = 1.0f
        set(value) {
            field = value
            nSetRenderScale(nativeRenderer, value)
        }

    /** The foreground color, `0xAARRGGBB`. */
    var textColor: Int = BLACK
        set(value) {
            field = value
            nSetForegroundColor(nativeRenderer, value)
        }

    /** 0 fills the glyphs, 1 strokes them, 2 does both. */
    var drawStyle: Int = 0
        set(value) {
            field = value
            nSetDrawStyle(nativeRenderer, value)
        }

    var strokeColor: Int = BLACK
        set(value) {
            field = value
            nSetStrokeColor(nativeRenderer, value)
        }

    var strokeRadius: Float = 0.5f
        set(value) {
            field = value
            nSetStrokeRadius(nativeRenderer, value)
        }

    var strokeCap: Int = 0
        set(value) {
            field = value
            nSetStrokeCap(nativeRenderer, value)
        }

    var strokeJoin: Int = 0
        set(value) {
            field = value
            nSetStrokeJoin(nativeRenderer, value)
        }

    var strokeMiter: Float = 1.0f
        set(value) {
            field = value
            nSetStrokeMiter(nativeRenderer, value)
        }

    var shadowColor: Int = 0
        set(value) {
            field = value
            nSetShadowColor(nativeRenderer, value)
        }

    var shadowRadius: Float = 0.0f
        set(value) {
            field = value
            nSetShadowRadius(nativeRenderer, value)
        }

    var shadowDx: Float = 0.0f
        set(value) {
            field = value
            nSetShadowDx(nativeRenderer, value)
        }

    var shadowDy: Float = 0.0f
        set(value) {
            field = value
            nSetShadowDy(nativeRenderer, value)
        }

    /** Releases the native renderer now. Idempotent; the renderer is not used afterwards. */
    fun dispose() {
        finalizer.release()
    }

    private companion object {
        const val BLACK = 0xFF000000.toInt()

        init {
            JniBridge.loadLibrary()
        }

        @JvmStatic external fun nCreate(): Long
        @JvmStatic external fun nDispose(nativeRenderer: Long)
        @JvmStatic external fun nSetRenderScale(nativeRenderer: Long, renderScale: Float)
        @JvmStatic external fun nSetForegroundColor(nativeRenderer: Long, color: Int)
        @JvmStatic external fun nSetDrawStyle(nativeRenderer: Long, drawStyle: Int)
        @JvmStatic external fun nSetStrokeColor(nativeRenderer: Long, color: Int)
        @JvmStatic external fun nSetStrokeRadius(nativeRenderer: Long, radius: Float)
        @JvmStatic external fun nSetStrokeCap(nativeRenderer: Long, strokeCap: Int)
        @JvmStatic external fun nSetStrokeJoin(nativeRenderer: Long, strokeJoin: Int)
        @JvmStatic external fun nSetStrokeMiter(nativeRenderer: Long, miter: Float)
        @JvmStatic external fun nSetShadowColor(nativeRenderer: Long, color: Int)
        @JvmStatic external fun nSetShadowRadius(nativeRenderer: Long, radius: Float)
        @JvmStatic external fun nSetShadowDx(nativeRenderer: Long, dx: Float)
        @JvmStatic external fun nSetShadowDy(nativeRenderer: Long, dy: Float)
    }
}
