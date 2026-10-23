package com.tehreer.reactnative

import android.content.Context
import android.graphics.Color
import android.view.View

/** A colored box at the size that Yoga measured through Core; painting the frame is for the painters. */
class TehreerTextBaseView(context: Context) : View(context) {
    init {
        setBackgroundColor(Color.argb(90, 51, 115, 217))
    }
}
