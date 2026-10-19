export function compileModules(files: string[]): string;
export function importModule(out: string, file: string): Promise<Record<string, unknown>>;
