package com.tehreer.reactnative

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp

/**
 * The view manager of `TLabel`. The shadow node (C++) measures; the props reach the view here as
 * numbers, already resolved by JavaScript.
 */
internal class TLabelManager : SimpleViewManager<TLabel>() {
    override fun getName(): String = NAME

    override fun createViewInstance(context: ThemedReactContext): TLabel {
        val view = TLabel(context)
        // The surface and the tag are read when the event is sent: the id of a view is assigned after it is made.
        val send = { name: String, values: Map<String, Number> ->
            UIManagerHelper.getEventDispatcherForReactTag(context, view.id)
                ?.dispatchEvent(TextEvent(UIManagerHelper.getSurfaceId(view), view.id, name, values))
        }
        view.onFrameReady = { lineCount, width, height ->
            send("topFrameReady", mapOf("lineCount" to lineCount, "width" to width, "height" to height))
        }
        view.onTap = { x, y -> send("topTextTap", mapOf("x" to x, "y" to y)) }
        return view
    }

    @ReactProp(name = "typesetterId", defaultInt = 0)
    fun setTypesetterId(view: TLabel, id: Int) { view.setTypesetterId(id) }

    @ReactProp(name = "frameSettings")
    fun setFrameSettings(view: TLabel, settings: ReadableArray?) { view.frameSettings = toFloats(settings) }

    // The two arrays are one setting; the view applies them together, once the batch has arrived.
    private val renderInts = HashMap<Int, IntArray>()
    private val renderFloats = HashMap<Int, FloatArray>()

    @ReactProp(name = "rendererInts")
    fun setRendererInts(view: TLabel, ints: ReadableArray?) { renderInts[view.id] = toInts(ints) }

    @ReactProp(name = "rendererFloats")
    fun setRendererFloats(view: TLabel, floats: ReadableArray?) { renderFloats[view.id] = toFloats(floats) }

    override fun onAfterUpdateTransaction(view: TLabel) {
        super.onAfterUpdateTransaction(view)
        view.setRendering(renderInts[view.id] ?: IntArray(0), renderFloats[view.id] ?: FloatArray(0))
    }

    // Views are not recycled: a view owns native objects, which are freed when React Native drops it.
    override fun prepareToRecycleView(reactContext: ThemedReactContext, view: TLabel): TLabel? = null

    override fun onDropViewInstance(view: TLabel) {
        renderInts.remove(view.id)
        renderFloats.remove(view.id)
        view.release()
        super.onDropViewInstance(view)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
        mapOf(
            "topFrameReady" to mapOf("registrationName" to "onFrameReady"),
            "topTextTap" to mapOf("registrationName" to "onTextTap"),
        )

    companion object {
        const val NAME = "TLabel"

        internal fun toFloats(array: ReadableArray?): FloatArray =
            FloatArray(array?.size() ?: 0) { array!!.getDouble(it).toFloat() }

        internal fun toInts(array: ReadableArray?): IntArray =
            IntArray(array?.size() ?: 0) { array!!.getDouble(it).toLong().toInt() }
    }
}
