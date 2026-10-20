#pragma once

#include "../generated/Structs.h"

#include <string>
#include <vector>

namespace tehreer {

/**
 * The structs of Core that JavaScript sees as plain objects. The by-value structs of the
 * signatures (`TRPoint`, `TRRect`, ...) are converted by code that the generator prints, which
 * `generated::kStructCodecs` lists; the ones that need a rule of their own are written here.
 *
 * Every layout, converted or not, is checked at compile time by `generated/Layouts.h`, so these
 * functions read members by name and never by offset.
 */

/**
 * A `TRAttribute` as `{ type, value }`. The member of the union that `value` stands for is picked
 * from `type`: a number for the sizes, the colors, the tag, the alignment and the user data token
 * (an application number that Core only compares), a boolean for the underline and the
 * strikethrough, an index for the indent line count and a handle for the typeface, the
 * replacement and the font features.
 *
 * `AttributeFromJs` does not take ownership: a handle is borrowed from the JavaScript value, which
 * has to stay alive while the attribute is in use (the caller holds its arguments). `AttributeToJs`
 * retains the references it puts in the object, so what it returns owns them. Throws a `RangeError`
 * for a type that Core does not define.
 */
jsi::Value AttributeToJs(jsi::Runtime &rt, const TRAttribute &value);
TRAttribute AttributeFromJs(jsi::Runtime &rt, const jsi::Value &value, const char *function, const std::string &parameter);

/**
 * The codec of a struct by the name of its C type, or null when JavaScript does not see it as an
 * object. Covers the generated ones, `TRAttribute` and the read-only structs that a typeface lists
 * (`TRVariationAxis`, `TRNamedStyle`, `TRPaletteEntry`, `TRPredefinedPalette`, `TRBitmapStrike`):
 * those are copied into objects (`{ name, tag, flags, minValue, maxValue, defaultValue }`,
 * `{ subfamilyName, coordinates, postScriptName }`, `{ name }`, `{ name, colors, flags }`,
 * `{ pixelWidth, pixelHeight }`, a missing name being undefined and the coordinates and colors
 * arrays of numbers), and their `fromJs` refuses, since JavaScript never gives them to Core.
 */
const generated::StructCodec *FindStructCodec(const std::string &name);

/** The names of the structs that can be written as well as read, in a fixed order (not the read-only ones). */
std::vector<std::string> StructCodecNames();

} // namespace tehreer
