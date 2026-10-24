package com.tehreer.reactnative

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.view.View
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

/**
 * Draws one line of a text, as `LineView` of Tehreer-Android does: the view is as big as the box of
 * the line (its ink included) and sits at that place in its container, so it draws the separator, the
 * highlights that fall on the line, and the line itself, relative to its own box.
 */
internal class LineView(context: Context) : View(context) {
    private val paint = Paint()
    private val density = resources.displayMetrics.density

    val renderer = Renderer()

    /** The left and top of the box of the line in the text, in layout units. */
    var boxLeft = 0.0f
    var boxTop = 0.0f
    var boxRight = 0.0f
    var boxBottom = 0.0f
    var layoutWidth = 0.0f

    /** The left, top, right and bottom of each highlighted rectangle, in layout units, and its color. */
    var highlightRects = FloatArray(0)
    var highlightColors = IntArray(0)

    var separatorColor = 0
        set(value) {
            if (field != value) {
                field = value
                invalidate()
            }
        }

    var textColor: Int
        get() = renderer.foregroundColor
        set(value) {
            renderer.foregroundColor = value
        }

    var line: ComposedLine? = null
        set(value) {
            // The view owns the line it is given: the previous one is no longer needed.
            field?.dispose()
            field = value
            invalidate()
        }

    init {
        renderer.renderScale = density
        paint.strokeWidth = 1.0f
        paint.style = Paint.Style.FILL
    }

    override fun onDraw(canvas: Canvas) {
        val line = line ?: return

        val lineTop = line.originY - line.ascent
        val lineBottom = lineTop + line.height

        // A highlight is clipped to the band of the line: its rectangle can be taller than the line,
        // and the neighbouring lines draw their own part.
        for (index in highlightColors.indices) {
            val top = max(highlightRects[index * 4 + 1], lineTop)
            val bottom = min(highlightRects[index * 4 + 3], lineBottom)
            if (bottom > top) {
                paint.color = highlightColors[index]
                canvas.drawRect(
                    (highlightRects[index * 4] - boxLeft) * density, (top - boxTop) * density,
                    (highlightRects[index * 4 + 2] - boxLeft) * density, (bottom - boxTop) * density, paint,
                )
            }
        }

        if (separatorColor != 0) {
            val separatorLeft = floor(-boxLeft * density)
            val separatorRight = ceil(separatorLeft + layoutWidth * density)
            val separatorY = floor((lineBottom - boxTop) * density - 0.5f)
            paint.color = separatorColor
            canvas.drawRect(separatorLeft, separatorY, separatorRight, separatorY + 1.0f, paint)
        }

        // The line adds its own origin to the one that it is given, which is that of its container.
        line.draw(renderer, canvas, -boxLeft, -boxTop)
    }

    /** Lets go of the line and the renderer; the view is not used afterwards. */
    fun release() {
        line = null
        renderer.dispose()
    }
}
