#include "fabric/Utf8.h"

#include <cstdio>

using tehreer::fabric::Utf8ToUtf16;

static int failures = 0;

static void Expect(const char *name, std::u16string actual, std::u16string wanted) {
    if (actual != wanted) {
        std::printf("FAIL %s\n", name);
        failures++;
    }
}

int main() {
    Expect("ascii", Utf8ToUtf16("abc"), u"abc");
    Expect("empty", Utf8ToUtf16(""), u"");
    Expect("two bytes", Utf8ToUtf16("\xC3\xA9"), u"é");
    Expect("urdu", Utf8ToUtf16("\xD8\xAA"), u"ت");
    Expect("three bytes", Utf8ToUtf16("\xE2\x82\xAC"), u"€");
    Expect("surrogate pair", Utf8ToUtf16("\xF0\x9F\x98\x80"), u"\xD83D\xDE00");
    Expect("last scalar", Utf8ToUtf16("\xF4\x8F\xBF\xBF"), u"\xDBFF\xDFFF");
    // Each maximal ill-formed subpart is one U+FFFD and what follows survives.
    Expect("lone continuation", Utf8ToUtf16("a\x80z"), u"a�z");
    Expect("truncated", Utf8ToUtf16("a\xE2\x82z"), u"a�z");
    Expect("truncated at end", Utf8ToUtf16("a\xF0\x9F"), u"a�");
    Expect("overlong", Utf8ToUtf16("\xC0\xAF"), u"��");
    Expect("encoded surrogate", Utf8ToUtf16("\xED\xA0\x80"), u"���");
    Expect("above range", Utf8ToUtf16("\xF4\x90\x80\x80"), u"����");
    Expect("invalid lead", Utf8ToUtf16("\xFF"), u"�");
    if (failures == 0) {
        std::printf("OK\n");
    }
    return failures == 0 ? 0 : 1;
}
