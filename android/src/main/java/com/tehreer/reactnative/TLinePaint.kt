package com.tehreer.reactnative

import android.content.Context
import android.graphics.Canvas
import android.view.View

/**
 * The native view of the `TLinePaint` component: it draws some lines of a registered frame with a
 * renderer, and does nothing else. JavaScript lays the text out, scrolls it and decides which lines
 * are mounted. It owns its renderer and the reference of its frame, and gives them back in `release`.
 */
internal class TLinePaint(context: Context) : View(context) {
    private val density = resources.displayMetrics.density
    private val renderer = Renderer()

    private var composedFrame: ComposedFrame? = null
    private var composedFrameId = 0

    init {
        renderer.renderScale = density
    }

    /** Takes a reference of the frame that JavaScript registered under the id, and lets go of the previous one. */
    fun setComposedFrameId(id: Int) {
        if (id != composedFrameId) {
            composedFrame?.dispose()
            composedFrameId = id
            composedFrame = ComposedFrame.retain(id)
            invalidate()
        }
    }

    /** The index of the first line to draw. */
    var firstLine = 0
        set(value) { if (field != value) { field = value; invalidate() } }

    /** How many lines to draw from `firstLine`. */
    var lineCount = 0
        set(value) { if (field != value) { field = value; invalidate() } }

    /** Where the top left of the view is in the coordinates of the frame, in layout units. */
    var originX = 0.0f
        set(value) { if (field != value) { field = value; invalidate() } }

    var originY = 0.0f
        set(value) { if (field != value) { field = value; invalidate() } }

    /** How the text is drawn; the view repaints when one changes. */
    var textColor: Int
        get() = renderer.textColor
        set(value) { renderer.textColor = value; invalidate() }

    var drawStyle: Int
        get() = renderer.drawStyle
        set(value) { renderer.drawStyle = value; invalidate() }

    var strokeColor: Int
        get() = renderer.strokeColor
        set(value) { renderer.strokeColor = value; invalidate() }

    var strokeRadius: Float
        get() = renderer.strokeRadius
        set(value) { renderer.strokeRadius = value; invalidate() }

    var strokeCap: Int
        get() = renderer.strokeCap
        set(value) { renderer.strokeCap = value; invalidate() }

    var strokeJoin: Int
        get() = renderer.strokeJoin
        set(value) { renderer.strokeJoin = value; invalidate() }

    var strokeMiter: Float
        get() = renderer.strokeMiter
        set(value) { renderer.strokeMiter = value; invalidate() }

    var shadowColor: Int
        get() = renderer.shadowColor
        set(value) { renderer.shadowColor = value; invalidate() }

    var shadowRadius: Float
        get() = renderer.shadowRadius
        set(value) { renderer.shadowRadius = value; invalidate() }

    var shadowDx: Float
        get() = renderer.shadowDx
        set(value) { renderer.shadowDx = value; invalidate() }

    var shadowDy: Float
        get() = renderer.shadowDy
        set(value) { renderer.shadowDy = value; invalidate() }

    /** Lets go of the frame and the renderer; the view is not used afterwards. */
    fun release() {
        composedFrame?.dispose()
        composedFrame = null
        composedFrameId = 0
        renderer.dispose()
    }

    override fun onDraw(canvas: Canvas) {
        val composedFrame = composedFrame ?: return
        // A view does not clip what it draws unless its parent does, and a replacement can be wider than the view.
        canvas.save()
        canvas.clipRect(0, 0, width, height)
        composedFrame.drawLines(renderer, canvas, firstLine, lineCount, -originX, -originY)
        canvas.restore()
    }
}
