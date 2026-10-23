package com.tehreer.reactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ReactStylesDiffMap
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.StateWrapper
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event

/**
 * The view manager of `TehreerTextBase`. Props are read by the C++ shadow node, not by Kotlin, so
 * the manager has no setters. The shadow node's state is read as a map buffer (see
 * `TehreerTextBaseStateData::getMapBuffer`).
 */
class TehreerTextBaseManager : SimpleViewManager<TehreerTextBaseView>() {
    override fun getName(): String = NAME

    override fun createViewInstance(context: ThemedReactContext): TehreerTextBaseView = TehreerTextBaseView(context)

    override fun updateState(view: TehreerTextBaseView, props: ReactStylesDiffMap?, stateWrapper: StateWrapper): Any? {
        val state = stateWrapper.stateDataMapBuffer ?: return null
        val context = view.context as? ThemedReactContext ?: return null
        val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(context, view.id) ?: return null
        // Keys 1 to 3 of TehreerTextBaseStateData::getMapBuffer: line count and bounds of the frame.
        dispatcher.dispatchEvent(
            FrameReadyEvent(UIManagerHelper.getSurfaceId(view), view.id, state.getInt(1), state.getDouble(2), state.getDouble(3)),
        )
        return null
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> =
        mapOf("topFrameReady" to mapOf("registrationName" to "onFrameReady"))

    private class FrameReadyEvent(
        surfaceId: Int,
        viewTag: Int,
        private val lineCount: Int,
        private val width: Double,
        private val height: Double,
    ) : Event<FrameReadyEvent>(surfaceId, viewTag) {
        override fun getEventName(): String = "topFrameReady"

        // Every state is a frame of its own; none may replace another that was not delivered yet.
        override fun canCoalesce(): Boolean = false

        override fun getEventData(): WritableMap =
            Arguments.createMap().apply {
                putInt("lineCount", lineCount)
                putDouble("width", width)
                putDouble("height", height)
            }
    }

    companion object {
        const val NAME = "TehreerTextBase"
    }
}
