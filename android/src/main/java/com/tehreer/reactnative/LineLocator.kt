package com.tehreer.reactnative

/** Finds the lines of a frame that are in sight; it does not retain the frame, so the owner keeps both. */
internal class LineLocator private constructor(private val nativeLocator: Long) {
    /** The indices of the lines whose boxes meet a rectangle of the frame, in layout units. */
    fun findLines(left: Float, top: Float, right: Float, bottom: Float): IntArray = nFindLines(nativeLocator, left, top, right, bottom)

    /** The left, top, right and bottom of the box of a line, or null if the index is not a line. */
    fun getLineBox(index: Int): FloatArray? = nGetLineBox(nativeLocator, index)

    fun dispose() {
        nDispose(nativeLocator)
    }

    private external fun nFindLines(nativeLocator: Long, left: Float, top: Float, right: Float, bottom: Float): IntArray
    private external fun nGetLineBox(nativeLocator: Long, index: Int): FloatArray?

    companion object {
        init {
            JniBridge.loadLibrary()
        }

        /** The ink boxes are measured by the renderer. */
        fun create(frame: ComposedFrame, renderer: Renderer): LineLocator? =
            nCreate(frame.handle, renderer.nativeRenderer).let { if (it == 0L) null else LineLocator(it) }

        @JvmStatic private external fun nCreate(nativeFrame: Long, nativeRenderer: Long): Long
        @JvmStatic private external fun nDispose(nativeLocator: Long)
    }
}
