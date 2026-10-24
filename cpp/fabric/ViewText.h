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
    /** Takes over one reference of the text, and of the typeface if it is not `NULL`. */
    ViewText(TRTextRef text, TRTypefaceRef typeface, float typeSize) noexcept
        : _text(text), _typeface(typeface), _typeSize(typeSize) {}
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
    TRTextRef _text;
    TRTypefaceRef _typeface;
    float _typeSize;
};

/**
 * Names a `ViewText` to the shadow node, which only receives numbers as props. Ids are never 0 and
 * never reused, so a prop that still carries the id of an unregistered text finds nothing instead
 * of finding another text. Safe on any thread. The registry holds a share of each text until
 * `Unregister`; shadow nodes and states that found it keep their own.
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
