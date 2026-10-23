#pragma once

#include <Tehreer/Tehreer.h>

namespace tehreer {
namespace runtime {

/**
 * What a native painter needs to keep its platform bitmap (a `Bitmap`, a `CGImage`) on a glyph
 * image of Core. Painters get the `TRGlyphImageRef` from Core in their draw callbacks, so nothing
 * here is bound to JavaScript: the data and the destroy function are native, and JavaScript never
 * sees them (`TRGlyphImageGetNativeData` and `TRGlyphImageSetNativeData` are in `MANUAL` of the
 * generator for that reason).
 *
 * The rules of Core that a painter has to live by:
 *  - Images are shared through the glyph cache, so one image is drawn by many runs and, when the
 *    cache is shared, by many renderers and views. Data attached once serves all of them.
 *  - Only one attach wins. The loser still owns what it made and has to destroy it, which
 *    `GetOrAttachNativeData` does.
 *  - The destroy function runs when Core destroys the image: on whichever thread releases the last
 *    reference (a JavaScript finalizer, a drawing thread or the cache), possibly while a collection
 *    is running. It must be thread safe, must not touch JavaScript, and must not release a
 *    reference to the image itself.
 *  - The data must not hold a reference to the image it is attached to (that would be a cycle).
 *  - Images are immutable, so data derived from the pixels never goes out of date.
 */

/** Makes the data for an image. Returns `NULL` when it cannot, which attaches nothing. */
using NativeDataFactory = void *(*)(TRGlyphImageRef image, void *context);

/**
 * Returns the native data of the image, making and attaching it with `create` if it has none. If
 * another thread attached data between the check and the attach, the data made here is destroyed
 * with `destroy` and the winner's data is returned.
 *
 * @param destroy Destroys data made by `create`, or `NULL` if it needs no destruction. It is
 *      handed to Core, so it must stay callable for as long as images live (a plain function).
 * @return The data, or `NULL` if `create` returned `NULL`.
 */
inline void *GetOrAttachNativeData(TRGlyphImageRef image, NativeDataFactory create, void *context,
                                   void (*destroy)(void *data)) {
    void *data = TRGlyphImageGetNativeData(image);
    if (data != nullptr) {
        return data;
    }

    void *made = create(image, context);
    if (made == nullptr) {
        return nullptr;
    }

    if (TRGlyphImageSetNativeData(image, made, destroy) != TRFalse) {
        return made;
    }

    // Lost the race: the image has data, and ours was never adopted.
    if (destroy != nullptr) {
        destroy(made);
    }
    return TRGlyphImageGetNativeData(image);
}

} // namespace runtime
} // namespace tehreer
