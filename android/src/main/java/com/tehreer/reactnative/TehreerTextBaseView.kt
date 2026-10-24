package com.tehreer.reactnative

import android.content.Context
import android.graphics.Canvas
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.View
import android.widget.OverScroller
import kotlin.math.max
import kotlin.math.min

/**
 * Paints the frame that the shadow node composed with Core. The view only forwards the frame and
 * its canvas to the native painter: Core does all the layout and drawing math.
 *
 * A scrollable view scrolls its own canvas: the frame is laid out once, scrolling moves the canvas
 * and the painter visits only the lines in view, so nothing is laid out again per frame.
 */
class TehreerTextBaseView(context: Context) : View(context) {
    private var painter: Long = TehreerPaintJni.create()
    private val density = resources.displayMetrics.density
    private val scroller = OverScroller(context)

    var textColor: Int = 0xFF000000.toInt()
        set(value) { field = value; invalidate() }
    var selectionStart: Int = -1
        set(value) { field = value; invalidate() }
    var selectionEnd: Int = -1
        set(value) { field = value; invalidate() }
    var selectionColor: Int = 0x553390FF
        set(value) { field = value; invalidate() }
    var isScrollable: Boolean = false
        set(value) {
            field = value
            if (!value) {
                scrollTo(0, 0)
            }
            invalidate()
        }

    /** Called with the position of a tap in the coordinates of the text, in layout units. */
    var onTap: ((Float, Float) -> Unit)? = null

    /** Called with the vertical scroll offset, in layout units. */
    var onScrolled: ((Float) -> Unit)? = null

    // The height of the frame, in layout units, which is how far the text scrolls.
    private var contentHeight = 0f
    private var pendingOffset = -1f

    private val detector = GestureDetector(
        context,
        object : GestureDetector.SimpleOnGestureListener() {
            override fun onDown(e: MotionEvent): Boolean {
                scroller.forceFinished(true)
                return true
            }

            override fun onSingleTapUp(e: MotionEvent): Boolean {
                // The text starts at the top of the content, so a scrolled view adds its offset.
                onTap?.invoke(e.x / density, (e.y + scrollY) / density)
                return true
            }

            override fun onScroll(e1: MotionEvent?, e2: MotionEvent, distanceX: Float, distanceY: Float): Boolean {
                if (!isScrollable) return false
                scrollTo(0, clampOffset(scrollY + distanceY.toInt()))
                return true
            }

            override fun onFling(e1: MotionEvent?, e2: MotionEvent, velocityX: Float, velocityY: Float): Boolean {
                if (!isScrollable) return false
                scroller.fling(0, scrollY, 0, -velocityY.toInt(), 0, 0, 0, maxOffset())
                postInvalidateOnAnimation()
                return true
            }
        },
    )

    private fun maxOffset(): Int = max(0, (contentHeight * density).toInt() - height)

    private fun clampOffset(value: Int): Int = min(max(0, value), maxOffset())

    /** Shows the frame of the id from the state (0 for none) and its height, and schedules a redraw. */
    fun setComposedFrame(frameId: Int, frameHeight: Float) {
        if (painter != 0L) {
            TehreerPaintJni.setFrame(painter, frameId)
            contentHeight = frameHeight
            if (pendingOffset >= 0f) {
                scrollTo(0, clampOffset((pendingOffset * density).toInt()))
                pendingOffset = -1f
            } else {
                scrollTo(0, clampOffset(scrollY))
            }
            invalidate()
        }
    }

    var requestedOffset: Float = 0f
    var requestedToken: Int = 0
    private var appliedToken: Int = 0

    /** Scrolls when the token of the request is a new one. */
    fun applyScrollRequest() {
        if (requestedToken != appliedToken) {
            appliedToken = requestedToken
            if (requestedToken != 0) {
                scrollToOffset(requestedOffset)
            }
        }
    }

    /** Scrolls to an offset in layout units; a request that comes before the first frame waits for it. */
    fun scrollToOffset(offset: Float) {
        if (contentHeight <= 0f) {
            pendingOffset = offset
        } else {
            scrollTo(0, clampOffset((offset * density).toInt()))
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (isScrollable && event.actionMasked == MotionEvent.ACTION_DOWN) {
            parent?.requestDisallowInterceptTouchEvent(true)
        }
        return detector.onTouchEvent(event)
    }

    override fun computeScroll() {
        if (scroller.computeScrollOffset()) {
            scrollTo(0, clampOffset(scroller.currY))
            postInvalidateOnAnimation()
        }
    }

    override fun onScrollChanged(l: Int, t: Int, oldl: Int, oldt: Int) {
        super.onScrollChanged(l, t, oldl, oldt)
        if (isScrollable) {
            onScrolled?.invoke(t / density)
        }
    }

    override fun onDraw(canvas: Canvas) {
        if (painter != 0L) {
            // The canvas is moved by the scroll already; the window is the part of the text in view.
            TehreerPaintJni.draw(
                painter, canvas, density, textColor, selectionStart, selectionEnd, selectionColor,
                isScrollable, scrollY / density, width / density, height / density,
            )
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
