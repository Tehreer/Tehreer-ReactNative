#pragma once

#include <cstddef>
#include <string>
#include <string_view>

namespace tehreer::fabric {

/**
 * Decodes UTF-8 into UTF-16 code units, which are what Core and the JavaScript API index. React
 * Native hands strings to C++ as UTF-8 (a lone surrogate of a JavaScript string already arrives as
 * U+FFFD), so this is the inverse of that step and nothing more.
 *
 * Ill-formed input never fails: each maximal ill-formed subpart becomes one U+FFFD, the same
 * substitution the WHATWG decoder makes, so a truncated or overlong sequence cannot change what
 * follows it.
 */
inline std::u16string Utf8ToUtf16(std::string_view utf8) {
    std::u16string units;
    units.reserve(utf8.size());

    std::size_t i = 0;
    const std::size_t n = utf8.size();
    while (i < n) {
        const auto lead = static_cast<unsigned char>(utf8[i]);
        if (lead < 0x80) {
            units.push_back(static_cast<char16_t>(lead));
            i += 1;
            continue;
        }

        int needed = 0;
        char32_t scalar = 0;
        // The second byte has a narrower range after some leads: no overlong forms, no surrogates
        // (ED A0..BF) and nothing above U+10FFFF (F4 90..BF).
        unsigned char low = 0x80;
        unsigned char high = 0xBF;
        if (lead >= 0xC2 && lead <= 0xDF) {
            needed = 1;
            scalar = lead & 0x1F;
        } else if (lead >= 0xE0 && lead <= 0xEF) {
            needed = 2;
            scalar = lead & 0x0F;
            if (lead == 0xE0) low = 0xA0;
            if (lead == 0xED) high = 0x9F;
        } else if (lead >= 0xF0 && lead <= 0xF4) {
            needed = 3;
            scalar = lead & 0x07;
            if (lead == 0xF0) low = 0x90;
            if (lead == 0xF4) high = 0x8F;
        } else {
            units.push_back(u'�');
            i += 1;
            continue;
        }

        i += 1;
        bool complete = true;
        for (int k = 0; k < needed; k++) {
            const unsigned char byte = i < n ? static_cast<unsigned char>(utf8[i]) : 0;
            if (i >= n || byte < low || byte > high) {
                // The offending byte is not consumed: it may start a sequence of its own.
                complete = false;
                break;
            }
            scalar = (scalar << 6) | (byte & 0x3F);
            i += 1;
            low = 0x80;
            high = 0xBF;
        }

        if (!complete) {
            units.push_back(u'�');
        } else if (scalar >= 0x10000) {
            scalar -= 0x10000;
            units.push_back(static_cast<char16_t>(0xD800 + (scalar >> 10)));
            units.push_back(static_cast<char16_t>(0xDC00 + (scalar & 0x3FF)));
        } else {
            units.push_back(static_cast<char16_t>(scalar));
        }
    }

    return units;
}

} // namespace tehreer::fabric
