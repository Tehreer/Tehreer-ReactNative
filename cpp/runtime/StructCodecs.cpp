#include "StructCodecs.h"

#include "Errors.h"
#include "SheenBidiBindings.h"

#include <vector>

namespace tehreer {

namespace {

// What a member of the union holds. The attribute codec is a table of these, so adding an attribute
// to Core is one line here and one in the list of members that the layout check covers.
enum class ValueKind {
    Float,
    Color,
    Boolean,
    Index,
    Tag,
    Alignment,
    Token,
    Typeface,
    Replacement,
    FontFeatures,
};

struct AttributeKind {
    TRAttributeType type;
    ValueKind kind;
};

constexpr AttributeKind kAttributeKinds[] = {
    { TRAttributeTypeface, ValueKind::Typeface },
    { TRAttributeTypeSize, ValueKind::Float },
    { TRAttributeScaleX, ValueKind::Float },
    { TRAttributeScaleY, ValueKind::Float },
    { TRAttributeBaselineOffset, ValueKind::Float },
    { TRAttributeObliqueness, ValueKind::Float },
    { TRAttributeReplacement, ValueKind::Replacement },
    { TRAttributeForegroundColor, ValueKind::Color },
    { TRAttributeUserData, ValueKind::Token },
    { TRAttributeLanguage, ValueKind::Tag },
    { TRAttributeFontFeatures, ValueKind::FontFeatures },
    { TRAttributeBackgroundColor, ValueKind::Color },
    { TRAttributeUnderline, ValueKind::Boolean },
    { TRAttributeStrikethrough, ValueKind::Boolean },
    { TRAttributeDecorationColor, ValueKind::Color },
    { TRAttributeTextAlignment, ValueKind::Alignment },
    { TRAttributeFirstLineHeadIndent, ValueKind::Float },
    { TRAttributeHeadIndent, ValueKind::Float },
    { TRAttributeTailIndent, ValueKind::Float },
    { TRAttributeFirstIndentLineCount, ValueKind::Index },
    { TRAttributeParagraphSpacingBefore, ValueKind::Float },
    { TRAttributeParagraphSpacing, ValueKind::Float },
    { TRAttributeLineHeightMultiple, ValueKind::Float },
    { TRAttributeMinimumLineHeight, ValueKind::Float },
    { TRAttributeMaximumLineHeight, ValueKind::Float },
    { TRAttributeLineSpacing, ValueKind::Float },
};

const AttributeKind *FindAttributeKind(TRAttributeType type) {
    for (const AttributeKind &entry : kAttributeKinds) {
        if (entry.type == type) {
            return &entry;
        }
    }
    return nullptr;
}

// Each attribute reads and writes the member that Core documents for it, even where several
// members share a type, so that renaming or retyping one in the header is a compile error here.
TRFloat &FloatMember(TRAttributeValue &value, TRAttributeType type) {
    switch (type) {
    case TRAttributeTypeSize: return value.typeSize;
    case TRAttributeScaleX: return value.scaleX;
    case TRAttributeScaleY: return value.scaleY;
    case TRAttributeBaselineOffset: return value.baselineOffset;
    case TRAttributeObliqueness: return value.obliqueness;
    case TRAttributeFirstLineHeadIndent: return value.firstLineHeadIndent;
    case TRAttributeHeadIndent: return value.headIndent;
    case TRAttributeTailIndent: return value.tailIndent;
    case TRAttributeParagraphSpacingBefore: return value.paragraphSpacingBefore;
    case TRAttributeParagraphSpacing: return value.paragraphSpacing;
    case TRAttributeLineHeightMultiple: return value.lineHeightMultiple;
    case TRAttributeMinimumLineHeight: return value.minimumLineHeight;
    case TRAttributeMaximumLineHeight: return value.maximumLineHeight;
    default: return value.lineSpacing;
    }
}

TRColor &ColorMember(TRAttributeValue &value, TRAttributeType type) {
    switch (type) {
    case TRAttributeForegroundColor: return value.foregroundColor;
    case TRAttributeBackgroundColor: return value.backgroundColor;
    default: return value.decorationColor;
    }
}

TRBoolean &BooleanMember(TRAttributeValue &value, TRAttributeType type) {
    return type == TRAttributeUnderline ? value.underline : value.strikethrough;
}

} // namespace

jsi::Value AttributeToJs(jsi::Runtime &rt, const TRAttribute &attribute) {
    const AttributeKind *entry = FindAttributeKind(attribute.type);
    if (entry == nullptr) {
        runtime::FailRange(rt, "AttributeToJs", "value.type", "is not an attribute type of Core");
    }

    // The union is read through a copy, so that the helpers above can serve both directions.
    TRAttributeValue copy = attribute.value;
    jsi::Value value;
    switch (entry->kind) {
    case ValueKind::Float: value = marshal::FromNumber<TRFloat>(rt, FloatMember(copy, attribute.type)); break;
    case ValueKind::Color: value = marshal::FromNumber<TRColor>(rt, ColorMember(copy, attribute.type)); break;
    case ValueKind::Boolean: value = marshal::FromBoolean(BooleanMember(copy, attribute.type) != TRFalse); break;
    case ValueKind::Index: value = marshal::FromIndex(rt, copy.firstIndentLineCount); break;
    case ValueKind::Tag: value = marshal::FromNumber<TRTag>(rt, copy.language); break;
    case ValueKind::Alignment: value = marshal::FromNumber<TRTextAlignment>(rt, copy.textAlignment); break;
    case ValueKind::Token: value = marshal::FromToken(rt, copy.userData); break;
    case ValueKind::Typeface: value = marshal::FromHandle<TRTypefaceRef>(rt, copy.typeface, marshal::Ownership::Retain); break;
    case ValueKind::Replacement: value = marshal::FromHandle<TRReplacementRef>(rt, copy.replacement, marshal::Ownership::Retain); break;
    case ValueKind::FontFeatures: value = marshal::FromHandle<TRFontFeaturesRef>(rt, copy.fontFeatures, marshal::Ownership::Retain); break;
    }

    jsi::Object object(rt);
    object.setProperty(rt, "type", marshal::FromNumber<TRAttributeType>(rt, attribute.type));
    object.setProperty(rt, "value", std::move(value));
    return jsi::Value(std::move(object));
}

TRAttribute AttributeFromJs(jsi::Runtime &rt, const jsi::Value &input, const char *function, const std::string &parameter) {
    jsi::Object object = marshal::ToObject(rt, input, function, parameter.c_str());

    TRAttribute result = {};
    result.type = marshal::ToNumber<TRAttributeType>(rt, object.getProperty(rt, "type"), function, (parameter + ".type").c_str());
    const AttributeKind *entry = FindAttributeKind(result.type);
    if (entry == nullptr) {
        runtime::FailRange(rt, function, (parameter + ".type").c_str(), "is not an attribute type of Core");
    }

    const std::string path = parameter + ".value";
    const char *name = path.c_str();
    jsi::Value value = object.getProperty(rt, "value");
    switch (entry->kind) {
    case ValueKind::Float: FloatMember(result.value, result.type) = marshal::ToNumber<TRFloat>(rt, value, function, name); break;
    case ValueKind::Color: ColorMember(result.value, result.type) = marshal::ToNumber<TRColor>(rt, value, function, name); break;
    case ValueKind::Boolean: BooleanMember(result.value, result.type) = marshal::ToBoolean(rt, value, function, name) ? TRTrue : TRFalse; break;
    case ValueKind::Index: result.value.firstIndentLineCount = marshal::ToIndex(rt, value, function, name); break;
    case ValueKind::Tag: result.value.language = marshal::ToNumber<TRTag>(rt, value, function, name); break;
    case ValueKind::Alignment: result.value.textAlignment = marshal::ToNumber<TRTextAlignment>(rt, value, function, name); break;
    case ValueKind::Token: result.value.userData = marshal::ToToken(rt, value, function, name); break;
    case ValueKind::Typeface: result.value.typeface = marshal::ToHandle<TRTypefaceRef>(rt, value, function, name, false); break;
    case ValueKind::Replacement: result.value.replacement = marshal::ToHandle<TRReplacementRef>(rt, value, function, name, false); break;
    case ValueKind::FontFeatures: result.value.fontFeatures = marshal::ToHandle<TRFontFeaturesRef>(rt, value, function, name, false); break;
    }
    return result;
}

namespace {

// The lists of a typeface are read-only: Core fills them in and JavaScript only looks at them, so
// these codecs have no way back. Their pointers (names, coordinates, colors) belong to the typeface
// and are copied into JavaScript values here, while the caller still holds the owner (see
// `ReadPointerStructs`), so nothing in a result points into Core memory.
[[noreturn]] void ReadOnly(jsi::Runtime &rt, const char *function, const std::string &parameter) {
    marshal::Fail(rt, function, parameter.c_str(), "is a struct that Core owns and JavaScript only reads");
}

template <class T, class Convert>
jsi::Value ArrayOf(jsi::Runtime &rt, const T *items, TRUInteger count, Convert convert) {
    if (items == nullptr) {
        count = 0;
    }
    jsi::Array array(rt, static_cast<size_t>(count));
    for (TRUInteger index = 0; index < count; index++) {
        array.setValueAtIndex(rt, static_cast<size_t>(index), convert(items[index]));
    }
    return jsi::Value(rt, array);
}

jsi::Value VariationAxisToJs(jsi::Runtime &rt, const TRVariationAxis &axis) {
    jsi::Object object(rt);
    object.setProperty(rt, "name", marshal::FromStringView(rt, axis.name));
    object.setProperty(rt, "tag", marshal::FromNumber<TRTag>(rt, axis.tag));
    object.setProperty(rt, "flags", marshal::FromNumber<TRUInt32>(rt, axis.flags));
    object.setProperty(rt, "minValue", marshal::FromNumber<TRFloat>(rt, axis.minValue));
    object.setProperty(rt, "maxValue", marshal::FromNumber<TRFloat>(rt, axis.maxValue));
    object.setProperty(rt, "defaultValue", marshal::FromNumber<TRFloat>(rt, axis.defaultValue));
    return jsi::Value(std::move(object));
}

jsi::Value NamedStyleToJs(jsi::Runtime &rt, const TRNamedStyle &style) {
    jsi::Object object(rt);
    object.setProperty(rt, "subfamilyName", marshal::FromStringView(rt, style.subfamilyName));
    object.setProperty(rt, "coordinates", ArrayOf(rt, style.coordinatesPtr, style.coordinateCount,
        [&rt](TRFloat value) { return marshal::FromNumber<TRFloat>(rt, value); }));
    object.setProperty(rt, "postScriptName", marshal::FromStringView(rt, style.postScriptName));
    return jsi::Value(std::move(object));
}

jsi::Value PaletteEntryToJs(jsi::Runtime &rt, const TRPaletteEntry &entry) {
    jsi::Object object(rt);
    object.setProperty(rt, "name", marshal::FromStringView(rt, entry.name));
    return jsi::Value(std::move(object));
}

jsi::Value PredefinedPaletteToJs(jsi::Runtime &rt, const TRPredefinedPalette &palette) {
    jsi::Object object(rt);
    object.setProperty(rt, "name", marshal::FromStringView(rt, palette.name));
    object.setProperty(rt, "colors", ArrayOf(rt, palette.colorsPtr, palette.colorCount,
        [&rt](TRColor value) { return marshal::FromNumber<TRColor>(rt, value); }));
    object.setProperty(rt, "flags", marshal::FromNumber<TRUInt32>(rt, palette.flags));
    return jsi::Value(std::move(object));
}

jsi::Value BitmapStrikeToJs(jsi::Runtime &rt, const TRBitmapStrike &strike) {
    jsi::Object object(rt);
    object.setProperty(rt, "pixelWidth", marshal::FromNumber<TRFloat>(rt, strike.pixelWidth));
    object.setProperty(rt, "pixelHeight", marshal::FromNumber<TRFloat>(rt, strike.pixelHeight));
    return jsi::Value(std::move(object));
}

#define TEHREER_READ_ONLY_CODEC(Type, convert) \
    { \
        #Type, sizeof(Type), \
        [](jsi::Runtime &rt, const void *value) { return convert(rt, *static_cast<const Type *>(value)); }, \
        [](jsi::Runtime &rt, const jsi::Value &, const char *function, const std::string &parameter, void *) { \
            ReadOnly(rt, function, parameter); \
        }, \
    }

const generated::StructCodec kReadOnlyCodecs[] = {
    TEHREER_READ_ONLY_CODEC(TRVariationAxis, VariationAxisToJs),
    TEHREER_READ_ONLY_CODEC(TRNamedStyle, NamedStyleToJs),
    TEHREER_READ_ONLY_CODEC(TRPaletteEntry, PaletteEntryToJs),
    TEHREER_READ_ONLY_CODEC(TRPredefinedPalette, PredefinedPaletteToJs),
    TEHREER_READ_ONLY_CODEC(TRBitmapStrike, BitmapStrikeToJs),
};

#undef TEHREER_READ_ONLY_CODEC

const generated::StructCodec kAttributeCodec = {
    "TRAttribute", sizeof(TRAttribute),
    [](jsi::Runtime &rt, const void *value) { return AttributeToJs(rt, *static_cast<const TRAttribute *>(value)); },
    [](jsi::Runtime &rt, const jsi::Value &value, const char *function, const std::string &parameter, void *out) {
        *static_cast<TRAttribute *>(out) = AttributeFromJs(rt, value, function, parameter);
    },
};

} // namespace

const generated::StructCodec *FindStructCodec(const std::string &name) {
    for (const generated::StructCodec &codec : generated::kStructCodecs) {
        if (name == codec.name) {
            return &codec;
        }
    }
    for (const generated::StructCodec &codec : kReadOnlyCodecs) {
        if (name == codec.name) {
            return &codec;
        }
    }
    if (name == kAttributeCodec.name) {
        return &kAttributeCodec;
    }
    return name == SheenBidiRunCodec().name ? &SheenBidiRunCodec() : nullptr;
}

std::vector<std::string> StructCodecNames() {
    std::vector<std::string> names;
    for (const generated::StructCodec &codec : generated::kStructCodecs) {
        names.push_back(codec.name);
    }
    names.push_back(kAttributeCodec.name);
    names.push_back(SheenBidiRunCodec().name);
    return names;
}

} // namespace tehreer
