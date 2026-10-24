package com.tehreer.reactnative

/** Draws text through Core, with the color and the scale that it is given; each line view has its own. */
internal class Renderer {
    val nativeRenderer: Long = nCreate()

    var renderScale: Float = 1.0f
        set(value) {
            field = value
            nSetRenderScale(nativeRenderer, value)
        }

    var foregroundColor: Int = 0xFF000000.toInt()
        set(value) {
            field = value
            nSetForegroundColor(nativeRenderer, value)
        }

    fun dispose() {
        nDispose(nativeRenderer)
    }

    private companion object {
        init {
            JniBridge.loadLibrary()
        }

        @JvmStatic external fun nCreate(): Long
        @JvmStatic external fun nDispose(nativeRenderer: Long)
        @JvmStatic external fun nSetRenderScale(nativeRenderer: Long, renderScale: Float)
        @JvmStatic external fun nSetForegroundColor(nativeRenderer: Long, color: Int)
    }
}
