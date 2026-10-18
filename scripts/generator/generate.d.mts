import type { Generated, ModelConfig } from "./types.mjs";

export function generate(
  headersDirectory: string,
  overrides?: Partial<Pick<ModelConfig, "excluded" | "manual" | "bounds">> & { skipIncludes?: string[] },
): Generated;
