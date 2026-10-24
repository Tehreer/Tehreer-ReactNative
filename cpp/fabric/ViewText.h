#pragma once

#include <Tehreer/Tehreer.h>

#include <cstdint>
#include <memory>

namespace tehreer::fabric {

/**
 * The attributed text of a view, as the shadow node composes it: an immutable `TRText` and the
 * defaults of the typesetter, each with a reference of its own, so that the box outlives the
 * JavaScript objects it was made from. Everything in it is immutable and thread safe, which is
 * what Yoga's measure function needs; the replacements in the text are static (see
 * `StaticReplacements.h`), so Core never has to call JavaScript while it measures.
 */
class ViewText final {
public:
    /**
     * Takes over one reference of the text, and of the typeface if it is not `NULL`, if every
     * replacement of the text is a static one (`StaticReplacements`); otherwise returns null and
     * takes nothing. This is the only way to make a box, so the composer can trust the invariant
     * and never re-walks the text: a replacement made in JavaScript has a `computeRoom` that Core
     * could only call on the runtime's thread, so it would be measured with a room of zero.
     */
    static std::shared_ptr<const ViewText> Make(TRTextRef text, TRTypefaceRef typeface, float typeSize);
    ~ViewText() {
        TRTextRelease(_text);
        if (_typeface != nullptr) {
            TRTypefaceRelease(_typeface);
        }
    }

    ViewText(const ViewText &) = delete;
    ViewText &operator=(const ViewText &) = delete;

    /** Borrowed: valid as long as this box is. */
    TRTextRef text() const noexcept { return _text; }
    /** Borrowed; `NULL` when the text sets a typeface for every range itself. */
    TRTypefaceRef typeface() const noexcept { return _typeface; }
    float typeSize() const noexcept { return _typeSize; }

private:
    ViewText(TRTextRef text, TRTypefaceRef typeface, float typeSize) noexcept
        : _text(text), _typeface(typeface), _typeSize(typeSize) {}

    TRTextRef _text;
    TRTypefaceRef _typeface;
    float _typeSize;
};

/**
 * Names a `ViewText` to the shadow node, which only receives numbers as props. Ids are in 1 to INT32_MAX (the
 * `Int32` of the prop) and are not reused until 2^31 texts were registered, so a prop that still carries the id of an unregistered text finds nothing instead
 * of finding another text. Safe on any thread. The registry holds a share of each text until
 * `Unregister`. A shadow node's state keeps a share of its own (`TehreerTextBaseStateData`), so the
 * lifetime of the text a node shows is structural: unregistering never empties a node that already
 * resolved it, however long the node lives afterwards.
 */
class ViewTextRegistry final {
public:
    static std::uint32_t Register(std::shared_ptr<const ViewText> text);
    static std::shared_ptr<const ViewText> Find(std::uint32_t id);
    static void Unregister(std::uint32_t id) noexcept;
    /** How many texts are registered; for the tests. */
    static std::size_t Count();
};

} // namespace tehreer::fabric
