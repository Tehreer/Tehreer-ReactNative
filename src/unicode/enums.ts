/*
 * Copyright (C) 2026 Muhammad Tayyab Akram
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// GENERATED FILE. DO NOT EDIT.
// Written by scripts/generate-unicode-enums.mjs from the headers of SheenBidi.
// Change the generator or SheenBidi, then run `npm run generate:unicode`.

import type { SfntTag } from "../sfnt/SfntTag.js";
import { getScriptOpenTypeTag, getScriptUnicodeTag } from "./scriptTags.js";

/** The bidirectional class of a character, as in Unicode Standard Annex #44, Bidirectional Class Values. */
export const BidiClass = {
  LeftToRight: 0x01,
  RightToLeft: 0x02,
  RightToLeftArabic: 0x03,
  BoundaryNeutral: 0x04,
  NonSpacingMark: 0x05,
  ArabicNumber: 0x06,
  EuropeanNumber: 0x07,
  EuropeanNumberTerminator: 0x08,
  EuropeanNumberSeparator: 0x09,
  CommonNumberSeparator: 0x0A,
  WhiteSpace: 0x0B,
  SegmentSeparator: 0x0C,
  ParagraphSeparator: 0x0D,
  OtherNeutral: 0x0E,
  LeftToRightIsolate: 0x0F,
  RightToLeftIsolate: 0x10,
  FirstStrongIsolate: 0x11,
  PopDirectionalIsolate: 0x12,
  LeftToRightEmbedding: 0x13,
  RightToLeftEmbedding: 0x14,
  LeftToRightOverride: 0x15,
  RightToLeftOverride: 0x16,
  PopDirectionalFormatting: 0x17,
} as const;

export type BidiClass = (typeof BidiClass)[keyof typeof BidiClass];

/** The general category of a character, as in Unicode Standard Annex #44, General Category Values. */
export const GeneralCategory = {
  UppercaseLetter: 0x01,
  LowercaseLetter: 0x02,
  TitlecaseLetter: 0x03,
  ModifierLetter: 0x04,
  OtherLetter: 0x05,
  NonspacingMark: 0x06,
  SpacingMark: 0x07,
  EnclosingMark: 0x08,
  DecimalNumber: 0x09,
  LetterNumber: 0x0A,
  OtherNumber: 0x0B,
  ConnectorPunctuation: 0x0C,
  DashPunctuation: 0x0D,
  OpenPunctuation: 0x0E,
  ClosePunctuation: 0x0F,
  InitialPunctuation: 0x10,
  FinalPunctuation: 0x11,
  OtherPunctuation: 0x12,
  MathSymbol: 0x13,
  CurrencySymbol: 0x14,
  ModifierSymbol: 0x15,
  OtherSymbol: 0x16,
  SpaceSeparator: 0x17,
  LineSeparator: 0x18,
  ParagraphSeparator: 0x19,
  Control: 0x1A,
  Format: 0x1B,
  Surrogate: 0x1C,
  PrivateUse: 0x1D,
  Unassigned: 0x1E,
} as const;

export type GeneralCategory = (typeof GeneralCategory)[keyof typeof GeneralCategory];

/** The script of a character, as in Unicode Standard Annex #24, Script Property Values. */
const scriptValues = {
  Inherited: 0x01,
  Common: 0x02,
  Unknown: 0x03,
  Arabic: 0x04,
  Armenian: 0x05,
  Bengali: 0x06,
  Bopomofo: 0x07,
  Cyrillic: 0x08,
  Devanagari: 0x09,
  Georgian: 0x0A,
  Greek: 0x0B,
  Gujarati: 0x0C,
  Gurmukhi: 0x0D,
  Hangul: 0x0E,
  Han: 0x0F,
  Hebrew: 0x10,
  Hiragana: 0x11,
  Katakana: 0x12,
  Kannada: 0x13,
  Lao: 0x14,
  Latin: 0x15,
  Malayalam: 0x16,
  Oriya: 0x17,
  Tamil: 0x18,
  Telugu: 0x19,
  Thai: 0x1A,
  Tibetan: 0x1B,
  Braille: 0x1C,
  CanadianAboriginal: 0x1D,
  Cherokee: 0x1E,
  Ethiopic: 0x1F,
  Khmer: 0x20,
  Mongolian: 0x21,
  Myanmar: 0x22,
  Ogham: 0x23,
  Runic: 0x24,
  Sinhala: 0x25,
  Syriac: 0x26,
  Thaana: 0x27,
  Yi: 0x28,
  Deseret: 0x29,
  Gothic: 0x2A,
  OldItalic: 0x2B,
  Buhid: 0x2C,
  Hanunoo: 0x2D,
  Tagbanwa: 0x2E,
  Tagalog: 0x2F,
  Cypriot: 0x30,
  Limbu: 0x31,
  LinearB: 0x32,
  Osmanya: 0x33,
  Shavian: 0x34,
  TaiLe: 0x35,
  Ugaritic: 0x36,
  Buginese: 0x37,
  Coptic: 0x38,
  Glagolitic: 0x39,
  Kharoshthi: 0x3A,
  SylotiNagri: 0x3B,
  NewTaiLue: 0x3C,
  Tifinagh: 0x3D,
  OldPersian: 0x3E,
  Balinese: 0x3F,
  Nko: 0x40,
  PhagsPa: 0x41,
  Phoenician: 0x42,
  Cuneiform: 0x43,
  Carian: 0x44,
  Cham: 0x45,
  KayahLi: 0x46,
  Lepcha: 0x47,
  Lycian: 0x48,
  Lydian: 0x49,
  OlChiki: 0x4A,
  Rejang: 0x4B,
  Saurashtra: 0x4C,
  Sundanese: 0x4D,
  Vai: 0x4E,
  ImperialAramaic: 0x4F,
  Avestan: 0x50,
  Bamum: 0x51,
  EgyptianHieroglyphs: 0x52,
  Javanese: 0x53,
  Kaithi: 0x54,
  TaiTham: 0x55,
  Lisu: 0x56,
  MeeteiMayek: 0x57,
  OldTurkic: 0x58,
  InscriptionalPahlavi: 0x59,
  InscriptionalParthian: 0x5A,
  Samaritan: 0x5B,
  OldSouthArabian: 0x5C,
  TaiViet: 0x5D,
  Batak: 0x5E,
  Brahmi: 0x5F,
  Mandaic: 0x60,
  Chakma: 0x61,
  MeroiticCursive: 0x62,
  MeroiticHieroglyphs: 0x63,
  Miao: 0x64,
  Sharada: 0x65,
  SoraSompeng: 0x66,
  Takri: 0x67,
  CaucasianAlbanian: 0x68,
  BassaVah: 0x69,
  Duployan: 0x6A,
  Elbasan: 0x6B,
  Grantha: 0x6C,
  PahawhHmong: 0x6D,
  Khojki: 0x6E,
  LinearA: 0x6F,
  Mahajani: 0x70,
  Manichaean: 0x71,
  MendeKikakui: 0x72,
  Modi: 0x73,
  Mro: 0x74,
  OldNorthArabian: 0x75,
  Nabataean: 0x76,
  Palmyrene: 0x77,
  PauCinHau: 0x78,
  OldPermic: 0x79,
  PsalterPahlavi: 0x7A,
  Siddham: 0x7B,
  Khudawadi: 0x7C,
  Tirhuta: 0x7D,
  WarangCiti: 0x7E,
  Ahom: 0x7F,
  Hatran: 0x80,
  AnatolianHieroglyphs: 0x81,
  OldHungarian: 0x82,
  Multani: 0x83,
  SignWriting: 0x84,
  Adlam: 0x85,
  Bhaiksuki: 0x86,
  Marchen: 0x87,
  Newa: 0x88,
  Osage: 0x89,
  Tangut: 0x8A,
  MasaramGondi: 0x8B,
  Nushu: 0x8C,
  Soyombo: 0x8D,
  ZanabazarSquare: 0x8E,
  Dogra: 0x8F,
  GunjalaGondi: 0x90,
  Makasar: 0x91,
  Medefaidrin: 0x92,
  HanifiRohingya: 0x93,
  Sogdian: 0x94,
  OldSogdian: 0x95,
  Elymaic: 0x96,
  NyiakengPuachueHmong: 0x97,
  Nandinagari: 0x98,
  Wancho: 0x99,
  Chorasmian: 0x9A,
  DivesAkuru: 0x9B,
  KhitanSmallScript: 0x9C,
  Yezidi: 0x9D,
  CyproMinoan: 0x9E,
  OldUyghur: 0x9F,
  Tangsa: 0xA0,
  Toto: 0xA1,
  Vithkuqi: 0xA2,
  Kawi: 0xA3,
  NagMundari: 0xA4,
  Garay: 0xA5,
  GurungKhema: 0xA6,
  KiratRai: 0xA7,
  OlOnal: 0xA8,
  Sunuwar: 0xA9,
  Todhri: 0xAA,
  TuluTigalari: 0xAB,
  BeriaErfe: 0xAC,
  Sidetic: 0xAD,
  TaiYo: 0xAE,
  TolongSiki: 0xAF,
} as const;

export type Script = (typeof scriptValues)[keyof typeof scriptValues];

export const Script = {
  ...scriptValues,

  /**
   * Returns the OpenType script tag of a script, as an integer in big endian byte order. If more
   * than one tag is associated with a script, the latest one is returned: Devanagari has `deva`
   * and `dev2`, so `dev2` is. A script without a tag gets `DFLT`. SheenBidi prefers
   * {@link Script.getUnicodeTag}.
   */
  getOpenTypeTag(script: Script): SfntTag {
    return getScriptOpenTypeTag(script);
  },

  /**
   * Returns the four letter abbreviation of a script in the Unicode Script property
   * (`PropertyValueAliases.txt`) as an integer in big endian byte order, such as `Arab`, or 0 if
   * the script has none.
   */
  getUnicodeTag(script: Script): SfntTag {
    return getScriptUnicodeTag(script);
  },
} as const;
