package com.tehreer.reactnative

/** Draws text through Core, with the color and the scale that it is given; each line view has its own. */
internal class Renderer {
    val nativeRenderer: Long = nCreate()

    var renderScale: Float = 1.0f
        set(value) {
            field = value
            nSetRenderScale(nativeRenderer, value)
        }

    /**
     * Sets how the text is drawn, from the numbers of the `rendererInts` and `rendererFloats` props
     * (the order of `RendererSettings` in `cpp/views/RendererSettings.h`): the foreground color, the
     * draw style, the stroke and the shadow.
     */
    fun apply(ints: IntArray, floats: FloatArray) {
        nApply(nativeRenderer, ints, floats)
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
        @JvmStatic external fun nApply(nativeRenderer: Long, ints: IntArray, floats: FloatArray)
    }
}
