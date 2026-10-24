package com.tehreer.reactnative

import android.content.Context
import android.view.ViewGroup
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max

/**
 * Holds the lines of the text of a `TTextView`, as `TextContainer` of Tehreer-Android does: as tall
 * as the frame, with a `LineView` for each line that is in sight, found with the line locator and
 * reused as the text scrolls. The frame is laid out once for the width, and scrolling only moves the
 * line views.
 */
internal class TextContainer(context: Context) : ViewGroup(context) {
    private val density = resources.displayMetrics.density
    private val attached = HashMap<Int, LineView>()
    private val reusable = ArrayList<LineView>()

    private var frame: ComposedFrame? = null
    private var locator: LineLocator? = null
    private var frameWidth = 0.0f
    private var visibleTop = 0
    private var visibleHeight = 0

    private var highlightRects = FloatArray(0)
    private var highlightColors = IntArray(0)

    private var rendererInts = IntArray(0)
    private var rendererFloats = FloatArray(0)

    /** How the text is drawn, for every line view, those in the pool and those to come. */
    fun setRendering(ints: IntArray, floats: FloatArray) {
        if (ints.contentEquals(rendererInts) && floats.contentEquals(rendererFloats)) return
        rendererInts = ints
        rendererFloats = floats
        attached.values.forEach { it.applyRendering(ints, floats) }
    }

    var separatorColor = 0
        set(value) {
            field = value
            attached.values.forEach { it.separatorColor = value }
        }

    /** Shows a frame that the container owns from now on, with its locator. */
    fun show(frame: ComposedFrame?, locator: LineLocator?, width: Float) {
        release()
        this.frame = frame
        this.locator = locator
        frameWidth = width
        applyHighlights()
        requestLayout()
    }

    /** What is in sight, in pixels from the top of the text. */
    fun setVisibleRegion(top: Int, height: Int) {
        visibleTop = top
        visibleHeight = height
        layoutLines()
    }

    private var highlights = IntArray(0)

    /** `fromIndex`, `toIndex` and color of each range; the rectangles are made again when the frame changes. */
    fun setHighlights(highlights: IntArray) {
        this.highlights = highlights
        applyHighlights()
    }

    private fun applyHighlights() {
        val rects = ArrayList<Float>()
        val colors = ArrayList<Int>()
        frame?.let { frame ->
            for (i in 0 until highlights.size / 3) {
                val selection = frame.enumerateSelection(highlights[i * 3], highlights[i * 3 + 1])
                for (r in 0 until selection.size / 4) {
                    for (k in 0 until 4) rects.add(selection[r * 4 + k])
                    colors.add(highlights[i * 3 + 2])
                }
            }
        }
        highlightRects = rects.toFloatArray()
        highlightColors = colors.toIntArray()
        attached.values.forEach {
            it.highlightRects = highlightRects
            it.highlightColors = highlightColors
            it.invalidate()
        }
    }

    private fun configure(lineView: LineView, index: Int, line: ComposedLine, box: FloatArray) {
        lineView.boxLeft = box[0]
        lineView.boxTop = box[1]
        lineView.boxRight = box[2]
        lineView.boxBottom = box[3]
        lineView.layoutWidth = frameWidth
        lineView.separatorColor = separatorColor
        lineView.applyRendering(rendererInts, rendererFloats)
        lineView.highlightRects = highlightRects
        lineView.highlightColors = highlightColors
        lineView.line = line
        attached[index] = lineView
    }

    /** Keeps a view for each line that meets the visible region, a screen above and below included. */
    fun layoutLines() {
        val frame = frame ?: return
        val locator = locator ?: return

        val top = max(0.0f, (visibleTop - visibleHeight / 2) / density)
        val bottom = (visibleTop + visibleHeight * 3 / 2) / density
        val indices = locator.findLines(0.0f, top, frameWidth, bottom)
        val wanted = indices.toHashSet()

        val iterator = attached.entries.iterator()
        while (iterator.hasNext()) {
            val entry = iterator.next()
            if (entry.key !in wanted) {
                removeView(entry.value)
                entry.value.line = null
                reusable.add(entry.value)
                iterator.remove()
            }
        }

        for (index in indices) {
            if (attached.containsKey(index)) continue
            val box = locator.getLineBox(index) ?: continue
            val lineView = if (reusable.isEmpty()) LineView(context) else reusable.removeAt(reusable.size - 1)
            configure(lineView, index, frame.getLine(index), box)
            addView(lineView)
            placeLine(lineView)
        }
    }

    private fun placeLine(lineView: LineView) {
        lineView.layout(
            floor(lineView.boxLeft * density).toInt(), floor(lineView.boxTop * density).toInt(),
            ceil(lineView.boxRight * density).toInt(), ceil(lineView.boxBottom * density).toInt(),
        )
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val height = frame?.let { ceil(it.height * density).toInt() } ?: 0
        setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), height)
    }

    override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
        attached.values.forEach { placeLine(it) }
    }

    /** Lets go of the frame, the locator and the line views, which the container owns. */
    fun release() {
        attached.values.forEach {
            removeView(it)
            it.release()
        }
        attached.clear()
        reusable.forEach { it.release() }
        reusable.clear()
        locator?.dispose()
        locator = null
        frame?.dispose()
        frame = null
    }

    fun dispose() {
        release()
    }
}
