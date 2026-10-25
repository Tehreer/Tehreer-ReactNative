package com.tehreer.reactnative

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp

/** The view manager of `TTextView`; see `TLabelManager`. */
internal class TTextViewManager : SimpleViewManager<TTextView>() {
    // A scroll request is the pair of offset and token; the token changing is what asks for the scroll.
    private val requestedOffset = HashMap<Int, Float>()
    private val appliedToken = HashMap<Int, Int>()
    private val requestedToken = HashMap<Int, Int>()
    private val requestedAnimated = HashMap<Int, Boolean>()

    override fun getName(): String = NAME

    override fun createViewInstance(context: ThemedReactContext): TTextView {
        val view = TTextView(context)
        val send = { name: String, values: Map<String, Number> ->
            UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
                ?.dispatchEvent(TextEvent(UIManagerHelper.getSurfaceId(view), view.id, name, values))
        }
        view.onFrameReady = { lineCount, width, height ->
            send("topFrameReady", mapOf("lineCount" to lineCount, "width" to width, "height" to height))
        }
        view.onTap = { x, y -> send("topTextTap", mapOf("x" to x, "y" to y)) }
        view.onScrolled = { y -> send("topTextScroll", mapOf("x" to 0.0f, "y" to y)) }
        return view
    }

    @ReactProp(name = "typesetterId", defaultInt = 0)
    fun setTypesetterId(view: TTextView, id: Int) { view.setTypesetterId(id) }

    @ReactProp(name = "frameSettings")
    fun setFrameSettings(view: TTextView, settings: ReadableArray?) { view.frameSettings = TLabelManager.toFloats(settings) }

    private val renderInts = HashMap<Int, IntArray>()
    private val renderFloats = HashMap<Int, FloatArray>()

    @ReactProp(name = "rendererInts")
    fun setRendererInts(view: TTextView, ints: ReadableArray?) { renderInts[view.id] = TLabelManager.toInts(ints) }

    @ReactProp(name = "rendererFloats")
    fun setRendererFloats(view: TTextView, floats: ReadableArray?) { renderFloats[view.id] = TLabelManager.toFloats(floats) }

    @ReactProp(name = "scrollToAnimated", defaultBoolean = false)
    fun setScrollToAnimated(view: TTextView, animated: Boolean) { requestedAnimated[view.id] = animated }

    @ReactProp(name = "separatorColor", defaultInt = 0)
    fun setSeparatorColor(view: TTextView, color: Int) { view.separatorColor = color }

    @ReactProp(name = "highlights")
    fun setHighlights(view: TTextView, highlights: ReadableArray?) {
        view.highlights = IntArray(highlights?.size() ?: 0) { highlights!!.getInt(it) }
    }

    @ReactProp(name = "scrollToOffset", defaultFloat = 0f)
    fun setScrollToOffset(view: TTextView, offset: Float) { requestedOffset[view.id] = offset }

    @ReactProp(name = "scrollToToken", defaultInt = 0)
    fun setScrollToToken(view: TTextView, token: Int) { requestedToken[view.id] = token }

    override fun onAfterUpdateTransaction(view: TTextView) {
        super.onAfterUpdateTransaction(view)
        view.setRendering(renderInts[view.id] ?: IntArray(0), renderFloats[view.id] ?: FloatArray(0))
        view.update()
        val token = requestedToken[view.id] ?: 0
        if (token != 0 && token != appliedToken[view.id]) {
            appliedToken[view.id] = token
            view.scrollToOffset(requestedOffset[view.id] ?: 0f, requestedAnimated[view.id] ?: false)
        }
    }

    override fun prepareToRecycleView(reactContext: ThemedReactContext, view: TTextView): TTextView? = null

    override fun onDropViewInstance(view: TTextView) {
        requestedOffset.remove(view.id)
        requestedAnimated.remove(view.id)
        renderInts.remove(view.id)
        renderFloats.remove(view.id)
        requestedToken.remove(view.id)
        appliedToken.remove(view.id)
        view.release()
        super.onDropViewInstance(view)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
        mapOf(
            "topFrameReady" to mapOf("registrationName" to "onFrameReady"),
            "topTextTap" to mapOf("registrationName" to "onTextTap"),
            "topTextScroll" to mapOf("registrationName" to "onTextScroll"),
        )

    companion object {
        const val NAME = "TTextView"
    }
}
