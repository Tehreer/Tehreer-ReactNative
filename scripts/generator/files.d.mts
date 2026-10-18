import type { Generated } from "./types.mjs";

export const CPP_DIRECTORY: string;
export const TS_FILE: string;
export function outputFiles(generated: Generated): Map<string, string>;
export function checkFiles(root: string, files: Map<string, string>): string[];
export function writeFiles(root: string, files: Map<string, string>): void;
