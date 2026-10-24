#include "TextFrameComposer.h"

#include "StaticReplacements.h"

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

/**
 * Whether every replacement of the text is static. A replacement made in JavaScript has a
 * `computeRoom` that Core could only call on the thread of the runtime, so it would get a room of
 * zero here without any error: such text is refused instead of laid out wrongly.
 */
bool HasOnlyStaticReplacements(TRTextRef text) {
    const TRUInteger length = TRTextGetLength(text);
    TRUInteger index = 0;
    while (index < length) {
        TRUInteger runLength = 0;
        // Owned list, released on every path out of this iteration.
        TRAttributeListRef list = TRTextCopyAttributes(text, index, &runLength);
        if (list == nullptr || runLength == 0) {
            if (list != nullptr) {
                TRAttributeListRelease(list);
            }
            // No list or no progress cannot be told apart from a failure: refuse.
            return false;
        }

        bool isStatic = true;
        const TRUInteger count = TRAttributeListGetCount(list);
        for (TRUInteger i = 0; i < count; i++) {
            const TRAttribute *attribute = TRAttributeListGetItem(list, i);
            if (attribute->type == TRAttributeReplacement && !StaticReplacements::IsStatic(attribute->value.replacement)) {
                isStatic = false;
                break;
            }
        }
        TRAttributeListRelease(list);
        if (!isStatic) {
            return false;
        }
        index += runLength;
    }
    return true;
}

} // namespace

bool TextHasOnlyStaticReplacements(TRTextRef text) {
    return HasOnlyStaticReplacements(text);
}

TextFrame ComposeFrame(const TextFrameSpec &spec) {
    TextFrame result;

    const bool isAttributed = static_cast<bool>(spec.attributed);
    if (isAttributed ? TRTextGetLength(spec.attributed->text()) == 0 : spec.text.empty()) {
        result.status = ComposeStatus::EmptyText;
        return result;
    }

    TypefaceOwner typeface;
    float typeSize = spec.typeSize;
    if (isAttributed) {
        // Retained here so that the typesetter's defaults stay valid even if the box goes first.
        if (spec.attributed->typeface() != nullptr) {
            typeface = TypefaceOwner(TRTypefaceRetain(spec.attributed->typeface()));
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
        text = spec.attributed->text();
        if (!HasOnlyStaticReplacements(text)) {
            result.status = ComposeStatus::ForeignReplacement;
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
    result.frame = std::make_shared<const ComposedFrameBox>(frame.get());
    frame.release();
    result.status = ComposeStatus::Composed;
    return result;
}

} // namespace tehreer::fabric
