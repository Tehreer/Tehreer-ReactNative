package com.tehreer.reactnative

import android.content.Context
import android.graphics.Canvas
import android.os.Handler
import android.os.Looper
import android.view.GestureDetector
import android.view.MotionEvent
import android.widget.ScrollView
import kotlin.jvm.Volatile

/**
 * The native view of the `TTextView` component, as the text view of Tehreer-Android: a scroll view
 * that holds the typesetter, lays the whole text out once for its width (off the main thread), and
 * keeps a `LineView` for each line that is in sight, in a `TextContainer`.
 */
internal class TTextView(context: Context) : ScrollView(context) {
    private val density = resources.displayMetrics.density
    private val container = TextContainer(context)
    private val mainHandler = Handler(Looper.getMainLooper())

    private var typesetter: Typesetter? = null
    private var typesetterId = 0

    // A layout that is still running is told apart from an older one by its generation, which the layout
    // thread reads (to skip one that was replaced while it waited), hence volatile.
    @Volatile private var generation = 0
    private var laidOutWidth = 0.0f
    private var needsLayout = false

    /** The settings of the frame resolver, in the order of `FrameSettings` in `cpp/views/TextLayout.h`. */
    var frameSettings = FloatArray(0)
        set(value) {
            if (!field.contentEquals(value)) {
                field = value
                needsLayout = true
            }
        }

    /** How the text is drawn; see `Renderer.apply`. */
    fun setRendering(ints: IntArray, floats: FloatArray) {
        container.setRendering(ints, floats)
    }

    var separatorColor: Int
        get() = container.separatorColor
        set(value) { container.separatorColor = value }

    /** `fromIndex`, `toIndex` and color of each highlighted range. */
    var highlights = IntArray(0)
        set(value) {
            field = value
            container.setHighlights(value)
        }

    /** Called with the line count, width and height of the frame, when the text has been laid out. */
    var onFrameReady: ((Int, Float, Float) -> Unit)? = null

    /** Called with the position of a tap, in the coordinates of the text. */
    var onTap: ((Float, Float) -> Unit)? = null

    /** Called with the distance of the top of the view from the top of the text, in layout units. */
    var onScrolled: ((Float) -> Unit)? = null

    private val detector = GestureDetector(
        context,
        object : GestureDetector.SimpleOnGestureListener() {
            override fun onSingleTapUp(e: MotionEvent): Boolean {
                // The text starts at the top of the content, so a scrolled view adds its offset.
                onTap?.invoke(e.x / density, (e.y + scrollY) / density)
                return false
            }
        },
    )

    init {
        isVerticalScrollBarEnabled = true
        addView(container)
    }

    /** Takes a reference of the typesetter that JavaScript registered under the id, and lets go of the previous one. */
    fun setTypesetterId(id: Int) {
        if (id != typesetterId) {
            typesetter?.dispose()
            typesetterId = id
            typesetter = Typesetter.retain(id)
            needsLayout = true
        }
    }

    /** Goes to an offset in layout units, which JavaScript has made a finite number inside the text. */
    fun scrollToOffset(offset: Float, animated: Boolean) {
        if (animated) smoothScrollTo(0, (offset * density).toInt()) else scrollTo(0, (offset * density).toInt())
    }

    /** Applies what the props changed: one layout, once the whole batch has arrived. */
    fun update() {
        if (needsLayout) {
            needsLayout = false
            startLayout()
        }
    }

    // Lays the whole text out for the width of the view on a thread of its own, and shows it if
    // nothing else was asked meanwhile.
    private fun startLayout() {
        generation++
        val width = this.width / density
        val typesetter = typesetter?.duplicate()
        if (typesetter == null || width <= 0) {
            container.show(null, null, 0.0f)
            typesetter?.dispose()
            return
        }

        val settings = frameSettings
        val expected = generation
        TextLayoutTasks.execute {
            // A layout that was asked for and replaced while it waited in the queue is not made.
            if (expected != generation) {
                typesetter.dispose()
                return@execute
            }
            val frame = ComposedFrame.create(typesetter, width, 0.0f, settings, true)
            // The ink boxes are measured by a renderer of its own: a renderer is used by one thread at a time.
            val renderer = Renderer()
            renderer.renderScale = density
            val locator = frame?.let { LineLocator.create(it, renderer) }
            renderer.dispose()
            typesetter.dispose()

            // Posted to the main looper and not to the view: a view that was dropped is never attached
            // again, and a message posted to it never runs, which would leave the frame to leak.
            mainHandler.post {
                if (expected != generation) {
                    locator?.dispose()
                    frame?.dispose()
                } else {
                    laidOutWidth = width
                    container.show(frame, locator, width)
                    layoutAgain()
                    container.setVisibleRegion(scrollY, height)
                    frame?.let { onFrameReady?.invoke(it.lineCount, it.width, it.height) }
                }
            }
        }
    }

    // React Native lays a view out when its Yoga node changes and not when the view asks (its own
    // `requestLayout` does nothing there), so a view whose content changes size by itself, as the text
    // does when the layout is done, measures and lays itself out again.
    private fun layoutAgain() {
        measure(MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY))
        layout(left, top, right, bottom)
    }

    // A view group clips its children only when it has padding, and React Native's parents do not clip
    // (a line near the edge reaches outside the bounds), so the view clips to its own bounds.
    override fun dispatchDraw(canvas: Canvas) {
        canvas.save()
        canvas.clipRect(scrollX, scrollY, scrollX + width, scrollY + height)
        super.dispatchDraw(canvas)
        canvas.restore()
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        if (w / density != laidOutWidth) {
            startLayout()
        } else {
            container.setVisibleRegion(scrollY, h)
        }
    }

    override fun onScrollChanged(l: Int, t: Int, oldl: Int, oldt: Int) {
        super.onScrollChanged(l, t, oldl, oldt)
        container.setVisibleRegion(t, height)
        onScrolled?.invoke(t / density)
    }

    override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
        // The text scrolls inside the view, so a scroll view around it must not take the drag.
        if (event.actionMasked == MotionEvent.ACTION_DOWN) {
            parent?.requestDisallowInterceptTouchEvent(true)
        }
        return super.onInterceptTouchEvent(event)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        detector.onTouchEvent(event)
        return super.onTouchEvent(event)
    }

    /** Lets go of everything that the view owns; it is not used afterwards. */
    fun release() {
        generation++
        container.dispose()
        typesetter?.dispose()
        typesetter = null
    }
}
