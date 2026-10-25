package com.tehreer.reactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.events.Event

/** An event of a text view; the numbers are its payload, in the order given. */
internal class TextEvent(
    surfaceId: Int,
    viewTag: Int,
    private val name: String,
    private val values: Map<String, Number>,
) : Event<TextEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = name

    // A frame or a tap is its own event; only a scroll may be replaced by a later one.
    override fun canCoalesce(): Boolean = name == "topTextScroll"

    override fun getEventData(): WritableMap =
        Arguments.createMap().apply {
            values.forEach { (key, value) ->
                if (value is Int) putInt(key, value) else putDouble(key, value.toDouble())
            }
        }
}
