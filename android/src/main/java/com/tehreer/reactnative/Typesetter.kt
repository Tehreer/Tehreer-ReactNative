package com.tehreer.reactnative

/** A reference of the typesetter that JavaScript registered; the view that took it disposes it. */
internal class Typesetter private constructor(val nativeTypesetter: Long) {
    /** Another reference, for a layout that runs on another thread. */
    fun duplicate() = Typesetter(nDuplicate(nativeTypesetter))

    fun dispose() {
        nDispose(nativeTypesetter)
    }

    companion object {
        init {
            JniBridge.loadLibrary()
        }

        /** The typesetter of an id, or null if JavaScript has not registered it, or has unregistered it. */
        fun retain(id: Int): Typesetter? = nRetain(id).let { if (it == 0L) null else Typesetter(it) }

        @JvmStatic private external fun nRetain(id: Int): Long
        @JvmStatic private external fun nDuplicate(nativeTypesetter: Long): Long
        @JvmStatic private external fun nDispose(nativeTypesetter: Long)
    }
}
