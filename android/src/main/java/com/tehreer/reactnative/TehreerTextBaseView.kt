package com.tehreer.reactnative

import android.content.Context
import android.graphics.Canvas
import android.view.View

/**
 * Paints the frame that the shadow node composed with Core. The view only forwards the frame and
 * its canvas to the native painter: Core does all the layout and drawing math.
 */
class TehreerTextBaseView(context: Context) : View(context) {
    private var painter: Long = TehreerPaintJni.create()

    /** Shows the frame of the id from the state (0 for none) and schedules a redraw. */
    fun setFrame(frameId: Int) {
        if (painter != 0L) {
            TehreerPaintJni.setFrame(painter, frameId)
            invalidate()
        }
    }

    override fun onDraw(canvas: Canvas) {
        if (painter != 0L) {
            TehreerPaintJni.draw(painter, canvas, resources.displayMetrics.density)
        }
    }

    /** Frees the native painter and the frame it holds; the view draws nothing afterwards. */
    fun release() {
        if (painter != 0L) {
            TehreerPaintJni.destroy(painter)
            painter = 0L
        }
    }
}
