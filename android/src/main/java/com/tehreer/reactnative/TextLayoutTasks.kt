package com.tehreer.reactnative

import java.util.concurrent.Executors

/** Runs the layout of a text view off the main thread, as `TextLayoutTasks` of Tehreer-Android does. */
internal object TextLayoutTasks {
    private val executor = Executors.newSingleThreadExecutor()

    fun execute(task: Runnable) {
        executor.execute(task)
    }
}
