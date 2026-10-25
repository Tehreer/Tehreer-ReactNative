package com.tehreer.reactnative

import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

/**
 * The view manager of `TLinePaint`. The shadow node (C++) measures, with `typesetterId` and the
 * settings of the frame resolver, so the view has no setter for them. The defaults of the props are
 * those of the spec, which are Core's.
 */
internal class TLinePaintManager : SimpleViewManager<TLinePaint>() {
    override fun getName(): String = NAME

    override fun createViewInstance(context: ThemedReactContext): TLinePaint = TLinePaint(context)

    @ReactProp(name = "composedFrameId", defaultInt = 0)
    fun setComposedFrameId(view: TLinePaint, id: Int) { view.setComposedFrameId(id) }

    @ReactProp(name = "firstLine", defaultInt = 0)
    fun setFirstLine(view: TLinePaint, value: Int) { view.firstLine = value }

    @ReactProp(name = "lineCount", defaultInt = 0)
    fun setLineCount(view: TLinePaint, value: Int) { view.lineCount = value }

    @ReactProp(name = "originX", defaultFloat = 0.0f)
    fun setOriginX(view: TLinePaint, value: Float) { view.originX = value }

    @ReactProp(name = "originY", defaultFloat = 0.0f)
    fun setOriginY(view: TLinePaint, value: Float) { view.originY = value }

    @ReactProp(name = "textColor", defaultInt = BLACK)
    fun setTextColor(view: TLinePaint, value: Int) { view.textColor = value }

    @ReactProp(name = "drawStyle", defaultInt = 0)
    fun setDrawStyle(view: TLinePaint, value: Int) { view.drawStyle = value }

    @ReactProp(name = "strokeColor", defaultInt = BLACK)
    fun setStrokeColor(view: TLinePaint, value: Int) { view.strokeColor = value }

    @ReactProp(name = "strokeRadius", defaultFloat = 0.5f)
    fun setStrokeRadius(view: TLinePaint, value: Float) { view.strokeRadius = value }

    @ReactProp(name = "strokeCap", defaultInt = 0)
    fun setStrokeCap(view: TLinePaint, value: Int) { view.strokeCap = value }

    @ReactProp(name = "strokeJoin", defaultInt = 0)
    fun setStrokeJoin(view: TLinePaint, value: Int) { view.strokeJoin = value }

    @ReactProp(name = "strokeMiter", defaultFloat = 1.0f)
    fun setStrokeMiter(view: TLinePaint, value: Float) { view.strokeMiter = value }

    @ReactProp(name = "glyphShadowColor", defaultInt = 0)
    fun setGlyphShadowColor(view: TLinePaint, value: Int) { view.shadowColor = value }

    @ReactProp(name = "glyphShadowRadius", defaultFloat = 0.0f)
    fun setGlyphShadowRadius(view: TLinePaint, value: Float) { view.shadowRadius = value }

    @ReactProp(name = "glyphShadowDx", defaultFloat = 0.0f)
    fun setGlyphShadowDx(view: TLinePaint, value: Float) { view.shadowDx = value }

    @ReactProp(name = "glyphShadowDy", defaultFloat = 0.0f)
    fun setGlyphShadowDy(view: TLinePaint, value: Float) { view.shadowDy = value }

    // Views are not recycled: a view owns native objects, which are freed when React Native drops it.
    override fun prepareToRecycleView(reactContext: ThemedReactContext, view: TLinePaint): TLinePaint? = null

    override fun onDropViewInstance(view: TLinePaint) {
        view.release()
        super.onDropViewInstance(view)
    }

    companion object {
        const val NAME = "TLinePaint"

        // An `Int32` prop is the signed number of the 0xAARRGGBB color.
        private const val BLACK = -16777216
    }
}
