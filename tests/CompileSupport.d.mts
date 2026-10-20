export interface CompileResult {
  file: string;
  ok: boolean;
  output: string;
}

export const NO_COMPILER: string;
export function findCompiler(): string | undefined;
export interface CompileOptions {
  /** `c++17` unless given. */
  standard?: string;
  /** Macros for `-D`, such as `NDEBUG`. */
  defines?: string[];
}
export function checkSyntax(compiler: string, file: string, includeDirectories: string[], options?: CompileOptions): Promise<CompileResult>;
