#include "TextFrameComposer.h"

#include <Tehreer/Tehreer.h>

#include <cmath>
#include <utility>

namespace tehreer::fabric {
namespace {

/** One reference of a Core object, released on every path, including the early returns. */
template <typename Ref, void (*Release)(Ref)>
class Owned final {
public:
    explicit Owned(Ref ref = nullptr) noexcept : _ref(ref) {}
    ~Owned() {
        if (_ref != nullptr) {
            Release(_ref);
        }
    }
    Owned(const Owned &) = delete;
    Owned &operator=(const Owned &) = delete;

    Ref get() const noexcept { return _ref; }
    explicit operator bool() const noexcept { return _ref != nullptr; }

    /** Gives the reference up without releasing it. */
    Ref release() noexcept { return std::exchange(_ref, nullptr); }

private:
    Ref _ref;
};

using TypefaceOwner = Owned<TRTypefaceRef, TRTypefaceRelease>;
using TextOwner = Owned<TRTextRef, TRTextRelease>;
using TypesetterOwner = Owned<TRTypesetterRef, TRTypesetterRelease>;
using ResolverOwner = Owned<TRFrameResolverRef, TRFrameResolverRelease>;
using FrameOwner = Owned<TRComposedFrameRef, TRComposedFrameRelease>;

struct TypefaceSearch {
    TRUInteger tag;
    TRTypefaceRef found;
};

void VisitTypeface(TRTypefaceRef typeface, void *context, TRBoolean *stop) {
    auto *search = static_cast<TypefaceSearch *>(context);
    if (TRTypefaceManagerGetTypefaceTag(typeface) == search->tag) {
        // Retained inside the callback, where Core guarantees the typeface is alive.
        search->found = TRTypefaceRetain(typeface);
        *stop = TRTrue;
    }
}

/**
 * Finds the typeface of a tag and returns a reference of its own. `TRTypefaceManagerGetTypeface`
 * is not used: its result is not retained and dies when the typeface is unregistered, which can
 * happen on the JavaScript thread between that call and a retain here. The enumeration keeps the
 * typeface alive for the length of the callback, so the retain cannot lose that race. The registry
 * is small (fonts of an app), and this runs once per measurement.
 */
TypefaceOwner AcquireTypeface(std::uint32_t tag) {
    if (tag == 0) {
        return TypefaceOwner();
    }

    TypefaceSearch search{tag, nullptr};
    TRTypefaceManagerEnumerateTypefaces(VisitTypeface, &search);
    return TypefaceOwner(search.found);
}

} // namespace

TextFrame ComposeFrame(const TextFrameSpec &spec) {
    TextFrame result;

    if (spec.text.empty()) {
        result.status = ComposeStatus::EmptyText;
        return result;
    }

    TypefaceOwner typeface = AcquireTypeface(spec.typefaceTag);
    if (!typeface) {
        result.status = ComposeStatus::MissingTypeface;
        return result;
    }

    if (!std::isfinite(spec.typeSize) || spec.typeSize <= 0) {
        result.status = ComposeStatus::InvalidTypeSize;
        return result;
    }

    // Core copies the code units, so the view the caller gave may die after this call.
    TextOwner text(TRTextCreate(spec.text.data(), spec.text.size(), TRStringEncodingUTF16));
    if (!text) {
        return result;
    }

    TRAttribute defaults[2] = {};
    defaults[0].type = TRAttributeTypeface;
    defaults[0].value.typeface = typeface.get();
    defaults[1].type = TRAttributeTypeSize;
    defaults[1].value.typeSize = spec.typeSize;

    // The typesetter retains the typeface it was given, so ours is released on return.
    TypesetterOwner typesetter(TRTypesetterCreate(text.get(), defaults, 2));
    if (!typesetter) {
        return result;
    }

    ResolverOwner resolver(TRFrameResolverCreate());
    if (!resolver) {
        return result;
    }

    TRSize size;
    size.width = spec.width;
    size.height = spec.height;
    TRFrameResolverSetTypesetter(resolver.get(), typesetter.get());
    TRFrameResolverSetFrameSize(resolver.get(), size);
    TRFrameResolverSetFitsHorizontally(resolver.get(), spec.fitsWidth ? TRTrue : TRFalse);
    TRFrameResolverSetFitsVertically(resolver.get(), spec.fitsHeight ? TRTrue : TRFalse);
    TRFrameResolverSetMaxLines(resolver.get(), spec.maxLines);

    FrameOwner frame(TRFrameResolverCreateFrame(resolver.get(), 0, spec.text.size()));
    if (!frame) {
        return result;
    }

    // The frame does not depend on the resolver or the typesetter, which are released on return.
    // The box takes the reference only once it exists, so an allocation failure releases it here.
    result.frame = std::make_shared<const ComposedFrameBox>(frame.get());
    frame.release();
    result.status = ComposeStatus::Composed;
    return result;
}

} // namespace tehreer::fabric
