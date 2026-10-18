import type { EmitOptions, Model } from "./types.mjs";

export const LICENSE: string;
export const GENERATED_MARKER: string;
export function emitCpp(model: Model, options: EmitOptions): Map<string, string>;
