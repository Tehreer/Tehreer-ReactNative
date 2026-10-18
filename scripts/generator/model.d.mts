import type { CType, FunctionType, Model, ModelConfig, ParsedHeader } from "./types.mjs";

export class GeneratorError extends Error {}
export function buildModel(headers: { file: string; parsed: ParsedHeader }[], config: ModelConfig): Model;
export function typeText(type: CType | FunctionType): string;
