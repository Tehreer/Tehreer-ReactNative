export interface CompileResult {
  file: string;
  ok: boolean;
  output: string;
}

export const NO_COMPILER: string;
export function findCompiler(): string | undefined;
export function checkSyntax(compiler: string, file: string, includeDirectories: string[]): Promise<CompileResult>;
