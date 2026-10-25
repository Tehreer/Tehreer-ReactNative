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

/** The article of the label screen, from the Android demo. Segments with an `href` are links. */
export interface ArticleSegment {
  readonly text: string;
  readonly color?: string;
  readonly href?: string;
}

export const ARTICLE_TITLE = "OpenType";
export const ARTICLE_REFERENCE = "https://ur.wikipedia.org/wiki/OpenType";

export const ARTICLE_SEGMENTS: readonly ArticleSegment[] = [
  {
    "text": "اوپن ٹائپ دراصل کمپیوٹر فونٹس کے لیے ایک قابل میزان فارمیٹ کو کہا جاتا ہے جسے ابتداء میں "
  },
  {
    "text": "مائکروسافٹ",
    "color": "#1A56C4",
    "href": "https://en.wikipedia.org/wiki/Microsoft"
  },
  {
    "text": " نے تیار کیا تھا اور پھر بعد میں "
  },
  {
    "text": "ایڈوبی سسٹم",
    "color": "#1A56C4",
    "href": "https://en.wikipedia.org/wiki/Adobe_Inc."
  },
  {
    "text": " بھی اس میں شامل ہو گیا۔ گو انکا اعلان 1996ء میں کیا گیا تھا پر انکی قابل ذکر تعداد میں ترسیل 2000ء تا 2001ء تک دیکھنے میں آئی۔ "
  },
  {
    "text": "ایڈوبی سسٹم",
    "color": "#1A56C4",
    "href": "https://en.wikipedia.org/wiki/Adobe_Inc."
  },
  {
    "text": " نے اپنے فونٹس کے تمام تر کتب خانے کو اوپن ٹائپ میں تبدیل کرنے کا کام 2002ء تک مکمل کر لیا تھا۔ سن 2005ء کے آغاز تک 10،000 فونٹس اوپن ٹائپ میں دستیاب کرائے جاچکے تھے جن میں سے "
  },
  {
    "text": "ایڈوبی سسٹم",
    "color": "#1A56C4",
    "href": "https://en.wikipedia.org/wiki/Adobe_Inc."
  },
  {
    "text": " کے کتب خانے کا ایک تہائی حصہ بنتا تھا۔\nیہ فونٹس ونڈوز ، لینکس اور میک آپریٹنگ سسٹمز پر کام کرتے ہیں۔ ان میں 65 ہزار سے زیادہ "
  },
  {
    "text": "منقوشات (glyphs)",
    "color": "#1A56C4",
    "href": "https://en.wikipedia.org/wiki/Glyph"
  },
  {
    "text": " اور "
  },
  {
    "text": "یونیکوڈ",
    "color": "#1A56C4",
    "href": "https://en.wikipedia.org/wiki/Unicode"
  },
  {
    "text": " کی سہولت موجود ہے۔ ان میں لاطینیہ زبانوں کے ساتھ ساتھ غیرلاطینی ترسیمات و حروف رکھنے والی زبانوں کی تخطیط بھی کی جاسکتی ہے۔"
  }
];
