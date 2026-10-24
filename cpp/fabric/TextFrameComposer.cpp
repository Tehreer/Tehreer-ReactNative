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
    Owned(Owned &&other) noexcept : _ref(other.release()) {}
    Owned &operator=(Owned &&other) noexcept {
        if (this != &other) {
            if (_ref != nullptr) {
                Release(_ref);
            }
            _ref = other.release();
        }
        return *this;
    }

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

    const bool isAttributed = static_cast<bool>(spec.attributed);
    if (!isAttributed && spec.text.empty()) {
        result.status = ComposeStatus::EmptyText;
        return result;
    }

    TypefaceOwner typeface;
    float typeSize = spec.typeSize;
    // References of their own for the whole composition, so that retiring the box meanwhile (the
    // view of an unmounted node does) cannot free what the typesetter reads.
    const ViewText::Lease lease = isAttributed ? spec.attributed->Acquire() : ViewText::Lease();
    if (isAttributed) {
        if (lease.text() == nullptr) {
            result.status = ComposeStatus::EmptyText;
            return result;
        }
        if (lease.typeface() != nullptr) {
            typeface = TypefaceOwner(TRTypefaceRetain(lease.typeface()));
        }
        typeSize = spec.attributed->typeSize();
    } else {
        typeface = AcquireTypeface(spec.typefaceTag);
        if (!typeface) {
            result.status = ComposeStatus::MissingTypeface;
            return result;
        }
    }

    if (!std::isfinite(typeSize) || typeSize <= 0) {
        result.status = ComposeStatus::InvalidTypeSize;
        return result;
    }

    TextOwner owned;
    TRTextRef text = nullptr;
    if (isAttributed) {
        // Only a `ViewText` can be here, and it holds nothing but static replacements.
        text = lease.text();
        if (TRTextGetLength(text) == 0) {
            result.status = ComposeStatus::EmptyText;
            return result;
        }
    } else {
        // Core copies the code units, so the view the caller gave may die after this call.
        owned = TextOwner(TRTextCreate(spec.text.data(), spec.text.size(), TRStringEncodingUTF16));
        if (!owned) {
            return result;
        }
        text = owned.get();
    }

    TRAttribute defaults[2] = {};
    TRUInteger defaultCount = 0;
    if (typeface) {
        defaults[defaultCount].type = TRAttributeTypeface;
        defaults[defaultCount].value.typeface = typeface.get();
        defaultCount++;
    }
    defaults[defaultCount].type = TRAttributeTypeSize;
    defaults[defaultCount].value.typeSize = typeSize;
    defaultCount++;

    // The typesetter retains the typeface it was given, so ours is released on return.
    TypesetterOwner typesetter(TRTypesetterCreate(text, defaults, defaultCount));
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
    const FrameSettings &settings = spec.settings;
    TRFrameResolverSetMaxLines(resolver.get(), settings.maxLines);
    TRFrameResolverSetTextAlignment(resolver.get(), settings.textAlignment);
    TRFrameResolverSetTruncationEnabled(resolver.get(), settings.truncationEnabled ? TRTrue : TRFalse);
    TRFrameResolverSetTruncationMode(resolver.get(), settings.truncationMode);
    TRFrameResolverSetTruncationPlace(resolver.get(), settings.truncationPlace);
    TRFrameResolverSetExtraLineSpacing(resolver.get(), settings.extraLineSpacing);
    TRFrameResolverSetLineHeightMultiplier(resolver.get(), settings.lineHeightMultiplier);
    TRFrameResolverSetJustificationEnabled(resolver.get(), settings.justificationEnabled ? TRTrue : TRFalse);
    TRFrameResolverSetJustificationLevel(resolver.get(), settings.justificationLevel);

    FrameOwner frame(TRFrameResolverCreateFrame(resolver.get(), 0, TRTextGetLength(text)));
    if (!frame) {
        return result;
    }

    // The frame does not depend on the resolver or the typesetter, which are released on return.
    // The box takes the reference only once it exists, so an allocation failure releases it here.
    result.frame = std::make_shared<const ComposedFrameBox>(frame.get(), spec.attributed);
    frame.release();
    result.status = ComposeStatus::Composed;
    return result;
}

} // namespace tehreer::fabric
