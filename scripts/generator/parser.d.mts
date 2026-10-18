import type { CType, Doc, ParsedHeader, ParseOptions } from "./types.mjs";

export class ParseError extends Error {}
export function parseHeader(source: string, options: ParseOptions): ParsedHeader;
export function parseType(text: string): CType;
export function parseDoc(doc: string | null): Doc;
