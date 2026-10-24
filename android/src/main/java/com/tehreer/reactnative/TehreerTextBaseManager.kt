package com.tehreer.reactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ReactStylesDiffMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.StateWrapper
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event

/**
 * The view manager of `TehreerTextBase`. Props are read by the C++ shadow node, not by Kotlin, so
 * the manager has no setters. The shadow node's state is read as a map buffer (see
 * `TehreerTextBaseStateData::getMapBuffer`), and the id of the frame in it goes to the native painter.
 */
class TehreerTextBaseManager : SimpleViewManager<TehreerTextBaseView>() {
    override fun getName(): String = NAME

    override fun createViewInstance(context: ThemedReactContext): TehreerTextBaseView {
        val view = TehreerTextBaseView(context)
        // The surface and the tag of the event are read when it is sent, because the view's id is
        // assigned after it is created.
        view.onTap = { x, y -> dispatch(view, TextPointEvent(UIManagerHelper.getSurfaceId(view), view.id, "topTextTap", x, y)) }
        view.onScrolled = { y -> dispatch(view, TextPointEvent(UIManagerHelper.getSurfaceId(view), view.id, "topTextScroll", 0f, y)) }
        return view
    }

    private fun dispatch(view: TehreerTextBaseView, event: Event<*>) {
        val context = view.context as? ThemedReactContext ?: return
        UIManagerHelper.getEventDispatcherForReactTag(context, view.id)?.dispatchEvent(event)
    }

    // The props that only paint reach the view here; the layout props are read by the shadow node.
    @ReactProp(name = "textColor", defaultInt = 0xFF000000.toInt())
    fun setTextColor(view: TehreerTextBaseView, value: Int) { view.textColor = value }

    @ReactProp(name = "selectionStart", defaultInt = -1)
    fun setSelectionStart(view: TehreerTextBaseView, value: Int) { view.selectionStart = value }

    @ReactProp(name = "selectionEnd", defaultInt = -1)
    fun setSelectionEnd(view: TehreerTextBaseView, value: Int) { view.selectionEnd = value }

    @ReactProp(name = "selectionColor", defaultInt = 0x553390FF)
    fun setSelectionColor(view: TehreerTextBaseView, value: Int) { view.selectionColor = value }

    @ReactProp(name = "scrollable", defaultBoolean = false)
    fun setScrollable(view: TehreerTextBaseView, value: Boolean) { view.isScrollable = value }

    // A scroll request is the pair of offset and token; the token changing is what asks for the
    // scroll, and it is applied once the whole batch of props has arrived, whatever their order.
    @ReactProp(name = "scrollToOffset", defaultFloat = 0f)
    fun setScrollToOffset(view: TehreerTextBaseView, value: Float) { view.requestedOffset = value }

    @ReactProp(name = "scrollToToken", defaultInt = 0)
    fun setScrollToToken(view: TehreerTextBaseView, value: Int) { view.requestedToken = value }

    override fun onAfterUpdateTransaction(view: TehreerTextBaseView) {
        super.onAfterUpdateTransaction(view)
        view.applyScrollRequest()
    }

    override fun updateState(view: TehreerTextBaseView, props: ReactStylesDiffMap?, stateWrapper: StateWrapper): Any? {
        val state = stateWrapper.stateDataMapBuffer ?: return null
        // Key 6 of TehreerTextBaseStateData::getMapBuffer: the id of the frame to paint.
        view.setComposedFrame(state.getInt(6), state.getDouble(3).toFloat())
        val context = view.context as? ThemedReactContext ?: return null
        val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id) ?: return null
        // Keys 1 to 3 of TehreerTextBaseStateData::getMapBuffer: line count and bounds of the frame.
        dispatcher.dispatchEvent(
            FrameReadyEvent(UIManagerHelper.getSurfaceId(view), view.id, state.getInt(1), state.getDouble(2), state.getDouble(3), state.getInt(6)),
        )
        return null
    }

    // The frame is freed with the view, or when React Native reuses the view for another node.
    override fun onDropViewInstance(view: TehreerTextBaseView) {
        view.release()
        super.onDropViewInstance(view)
    }

    override fun prepareToRecycleView(reactContext: ThemedReactContext, view: TehreerTextBaseView): TehreerTextBaseView? {
        view.setComposedFrame(0, 0f)
        return super.prepareToRecycleView(reactContext, view)
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
        mapOf(
            "topFrameReady" to mapOf("registrationName" to "onFrameReady"),
            "topTextTap" to mapOf("registrationName" to "onTextTap"),
            "topTextScroll" to mapOf("registrationName" to "onTextScroll"),
        )

    private class TextPointEvent(
        surfaceId: Int,
        viewTag: Int,
        private val name: String,
        private val x: Float,
        private val y: Float,
    ) : Event<TextPointEvent>(surfaceId, viewTag) {
        override fun getEventName(): String = name

        // A tap must not be merged with another, and a scroll is coalesced to the latest offset.
        override fun canCoalesce(): Boolean = name == "topTextScroll"

        override fun getEventData(): WritableMap =
            Arguments.createMap().apply {
                putDouble("x", x.toDouble())
                putDouble("y", y.toDouble())
            }
    }

    private class FrameReadyEvent(
        surfaceId: Int,
        viewTag: Int,
        private val lineCount: Int,
        private val width: Double,
        private val height: Double,
        private val frameId: Int,
    ) : Event<FrameReadyEvent>(surfaceId, viewTag) {
        override fun getEventName(): String = "topFrameReady"

        // Every state is a frame of its own; none may replace another that was not delivered yet.
        override fun canCoalesce(): Boolean = false

        override fun getEventData(): WritableMap =
            Arguments.createMap().apply {
                putInt("lineCount", lineCount)
                putDouble("width", width)
                putDouble("height", height)
                putInt("frameId", frameId)
            }
    }

    companion object {
        const val NAME = "TehreerTextBase"
    }
}
