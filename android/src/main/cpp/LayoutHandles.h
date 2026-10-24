#pragma once

#include <jni.h>

#include <Tehreer/Tehreer.h>

// The native handle of each layout object is the object of Core itself, as in Tehreer-Android.

static inline TRTypesetterRef toTypesetter(jlong handle)
{
    return reinterpret_cast<TRTypesetterRef>(handle);
}

static inline TRComposedFrameRef toFrame(jlong handle)
{
    return reinterpret_cast<TRComposedFrameRef>(handle);
}

static inline TRComposedLineRef toLine(jlong handle)
{
    return reinterpret_cast<TRComposedLineRef>(handle);
}

static inline TRLineLocatorRef toLocator(jlong handle)
{
    return reinterpret_cast<TRLineLocatorRef>(handle);
}

static inline TRRendererRef toRenderer(jlong handle)
{
    return reinterpret_cast<TRRendererRef>(handle);
}
