package com.tehreer.reactnative

import com.facebook.soloader.SoLoader
import kotlin.jvm.Volatile

/**
 * Loads the library and registers the natives of the layout classes. Tehreer-Android does that in its
 * own `JNI_OnLoad`; here the library is part of the app's, whose `JNI_OnLoad` is React Native's, so
 * the registration is one call that every class makes before it uses a native.
 */
internal object JniBridge {
    @Volatile
    private var loaded = false

    fun loadLibrary() {
        if (!loaded) {
            synchronized(JniBridge::class.java) {
                if (!loaded) {
                    SoLoader.loadLibrary("appmodules")
                    check(nRegister() == 0) { "The natives of the text views could not be registered." }
                    loaded = true
                }
            }
        }
    }

    @JvmStatic private external fun nRegister(): Int
}
