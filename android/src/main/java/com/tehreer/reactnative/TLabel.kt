package com.tehreer.reactnative

import android.content.Context
import android.graphics.Canvas
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.View

/**
 * The native view of the `TLabel` component, as the label of Tehreer-Android: it holds the typesetter,
 * lays the text out for the size it is given, and draws the frame with a renderer. React Native only
 * gives it its props and its size.
 */
internal class TLabel(context: Context) : View(context) {
    private val density = resources.displayMetrics.density
    private val renderer = Renderer()

    private var typesetter: Typesetter? = null
    private var typesetterId = 0
    private var frame: ComposedFrame? = null

    /** The settings of the frame resolver, in the order of `FrameSettings` in `cpp/views/TextLayout.h`. */
    var frameSettings = FloatArray(0)
        set(value) {
            field = value
            releaseFrame()
        }

    var textColor: Int
        get() = renderer.foregroundColor
        set(value) {
            renderer.foregroundColor = value
            invalidate()
        }

    /** Called with the line count, width and height of the frame, when the text has been laid out. */
    var onFrameReady: ((Int, Float, Float) -> Unit)? = null

    /** Called with the position of a tap, in layout units. */
    var onTap: ((Float, Float) -> Unit)? = null

    private val detector = GestureDetector(
        context,
        object : GestureDetector.SimpleOnGestureListener() {
            override fun onDown(e: MotionEvent) = true

            override fun onSingleTapUp(e: MotionEvent): Boolean {
                onTap?.invoke(e.x / density, e.y / density)
                return true
            }
        },
    )

    init {
        renderer.renderScale = density
    }

    /** Takes a reference of the typesetter that JavaScript registered under the id, and lets go of the previous one. */
    fun setTypesetterId(id: Int) {
        if (id != typesetterId) {
            releaseText()
            typesetterId = id
            typesetter = Typesetter.retain(id)
            invalidate()
        }
    }

    private fun releaseFrame() {
        frame?.dispose()
        frame = null
        invalidate()
    }

    private fun releaseText() {
        releaseFrame()
        typesetter?.dispose()
        typesetter = null
        typesetterId = 0
    }

    /** Lets go of the typesetter and the frame, which is all that the view owns; the view is not used afterwards. */
    fun release() {
        releaseText()
        renderer.dispose()
    }

    // Lays the text out for the size of the view, once for each change of the text, the settings or the size.
    private fun ensureFrame() {
        val typesetter = typesetter ?: return
        if (frame != null || width <= 0) return

        frame = ComposedFrame.create(typesetter, width / density, height / density, frameSettings, false)?.also {
            onFrameReady?.invoke(it.lineCount, it.width, it.height)
        }
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        releaseFrame()
    }

    override fun onDraw(canvas: Canvas) {
        ensureFrame()
        // A view does not clip what it draws unless its parent does, and a replacement can be wider than the view.
        canvas.save()
        canvas.clipRect(0, 0, width, height)
        frame?.draw(renderer, canvas, 0.0f, 0.0f)
        canvas.restore()
    }

    override fun onTouchEvent(event: MotionEvent): Boolean = detector.onTouchEvent(event)
}
