import type { Handle, PointerView } from "./NativeFunctions.js";

// The bindings of the classic API of SheenBidi, which cpp/runtime/SheenBidiBindings.cpp writes by
// hand (the generator does not read SheenBidi: see scripts/generator/sheenbidi.mjs). The names are
// those of the C functions. Where they differ from Core's bindings (NativeFunctions.ts):
//
// - An `SBCodepointSequence` is a `string` (UTF-16). The native side keeps a copy for as long as the
//   algorithm, a paragraph or a line made from it, or a locator loaded with it, is alive, so a
//   handle is valid whichever of them is disposed first.
// - A pointer that SheenBidi gives is a `PointerView`, as for Core; the agents of the locators are
//   copied into objects instead of pointing into the locator.
// - `SBUInteger` is a number, and `SBInvalidIndex` is -1. A function that fills in values gives
//   them in the result, as in NativeFunctions.ts.
// - The `Release` functions are not bound: a handle releases its reference when it is disposed.

/** `SBRun`: a run of code units of one embedding level. */
export interface SBRun {
  offset: number;
  length: number;
  level: number;
}

/** `SBScriptAgent`: a copy of the script run that a script locator found. */
export interface SBScriptAgent {
  offset: number;
  length: number;
  script: number;
}

/** `SBMirrorAgent`: a copy of the mirrored character that a mirror locator found. */
export interface SBMirrorAgent {
  index: number;
  mirror: number;
  codepoint: number;
}

/** What the decoding functions give: the code point, and the index after (or before) it. */
export interface SBDecoded {
  result: number;
  index: number;
}

export interface SheenBidiFunctions {
  /** `SBAlgorithmRef SBAlgorithmCreate(const SBCodepointSequence *)` for UTF-16; `undefined` for an empty string. */
  SBAlgorithmCreate(text: string): Handle<"SBAlgorithm"> | undefined;
  /** One type for each code unit of the text. */
  SBAlgorithmGetBidiTypesPtr(algorithm: Handle<"SBAlgorithm">): PointerView<"SBBidiType"> | undefined;
  /** SheenBidi clamps a range that reaches outside of the text. */
  SBAlgorithmGetParagraphBoundary(
    algorithm: Handle<"SBAlgorithm">,
    paragraphOffset: number,
    suggestedLength: number,
  ): { actualLength: number; separatorLength: number };
  /**
   * `undefined` for an empty range. The paragraph keeps its own share of the text.
   *
   * @throws RangeError if the base level is neither 0..125 nor one of the two default directions.
   */
  SBAlgorithmCreateParagraph(
    algorithm: Handle<"SBAlgorithm">,
    paragraphOffset: number,
    suggestedLength: number,
    baseLevel: number,
  ): Handle<"SBParagraph"> | undefined;
  SBAlgorithmRetain(algorithm: Handle<"SBAlgorithm">): Handle<"SBAlgorithm">;

  SBParagraphGetOffset(paragraph: Handle<"SBParagraph">): number;
  SBParagraphGetLength(paragraph: Handle<"SBParagraph">): number;
  SBParagraphGetBaseLevel(paragraph: Handle<"SBParagraph">): number;
  /** One level for each code unit of the paragraph. */
  SBParagraphGetLevelsPtr(paragraph: Handle<"SBParagraph">): PointerView<"SBLevel"> | undefined;
  /** `undefined` if the range is empty or not inside of the paragraph. The line keeps its own share of the text. */
  SBParagraphCreateLine(paragraph: Handle<"SBParagraph">, lineOffset: number, lineLength: number): Handle<"SBLine"> | undefined;
  SBParagraphRetain(paragraph: Handle<"SBParagraph">): Handle<"SBParagraph">;

  SBLineGetOffset(line: Handle<"SBLine">): number;
  SBLineGetLength(line: Handle<"SBLine">): number;
  SBLineGetRunCount(line: Handle<"SBLine">): number;
  /** The runs in visual order, which `readPointerStructs` reads as `SBRun`. */
  SBLineGetRunsPtr(line: Handle<"SBLine">): PointerView<"SBRun"> | undefined;
  SBLineRetain(line: Handle<"SBLine">): Handle<"SBLine">;

  SBScriptLocatorCreate(): Handle<"SBScriptLocator"> | undefined;
  /** Loads a copy of the string, which the locator keeps until the next load. */
  SBScriptLocatorLoadCodepoints(locator: Handle<"SBScriptLocator">, text: string): void;
  SBScriptLocatorGetAgent(locator: Handle<"SBScriptLocator">): SBScriptAgent;
  SBScriptLocatorMoveNext(locator: Handle<"SBScriptLocator">): boolean;
  SBScriptLocatorReset(locator: Handle<"SBScriptLocator">): void;
  SBScriptLocatorRetain(locator: Handle<"SBScriptLocator">): Handle<"SBScriptLocator">;

  SBMirrorLocatorCreate(): Handle<"SBMirrorLocator"> | undefined;
  /**
   * Loads a line, or unloads with `undefined`. The text that SheenBidi reads is the one of the line,
   * so there is no string buffer to pass.
   */
  SBMirrorLocatorLoadLine(locator: Handle<"SBMirrorLocator">, line: Handle<"SBLine"> | undefined): void;
  SBMirrorLocatorGetAgent(locator: Handle<"SBMirrorLocator">): SBMirrorAgent;
  SBMirrorLocatorMoveNext(locator: Handle<"SBMirrorLocator">): boolean;
  SBMirrorLocatorReset(locator: Handle<"SBMirrorLocator">): void;
  SBMirrorLocatorRetain(locator: Handle<"SBMirrorLocator">): Handle<"SBMirrorLocator">;

  SBCodepointGetBidiType(codepoint: number): number;
  SBCodepointGetGeneralCategory(codepoint: number): number;
  /** 0 if the code point has no mirror. */
  SBCodepointGetMirror(codepoint: number): number;
  SBCodepointGetScript(codepoint: number): number;

  /**
   * The four decoders read `length` code units of the buffer, which is checked against its size
   * (`RangeError`), and an `ArrayBuffer` or a view for UTF-16 must start at an even address. `index`
   * in the result is where the decoding of the next (or the previous) code point starts; the code
   * point is `0xFFFD` for a malformed sequence and 4294967295 (`SBCodepointInvalid`) if `index` was
   * out of bounds.
   */
  SBCodepointDecodeNextFromUTF8(buffer: ArrayBuffer | ArrayBufferView, length: number, index: number): SBDecoded;
  SBCodepointDecodePreviousFromUTF8(buffer: ArrayBuffer | ArrayBufferView, length: number, index: number): SBDecoded;
  SBCodepointDecodeNextFromUTF16(buffer: ArrayBuffer | ArrayBufferView, length: number, index: number): SBDecoded;
  SBCodepointDecodePreviousFromUTF16(buffer: ArrayBuffer | ArrayBufferView, length: number, index: number): SBDecoded;
  /** For a UTF-16 string; the sequence is a copy made for the call. */
  SBCodepointSequenceGetCodepointBefore(text: string, stringIndex: number): SBDecoded;
  SBCodepointSequenceGetCodepointAt(text: string, stringIndex: number): SBDecoded;

  SBScriptGetOpenTypeTag(script: number): number;
  SBScriptGetUnicodeTag(script: number): number;
  /** The version of the linked SheenBidi, such as `"3.0.0"`. */
  SBVersionGetString(): string;

  /** Debug builds only: how many texts of the algorithm, paragraph, line and locator handles are alive. */
  testGetBidiTextCount?(): number;
}
