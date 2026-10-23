export interface TreeSpec {
  dir: string;
  extensions: string[];
}

export interface DependencySpec {
  name: string;
  files: string[];
  trees: TreeSpec[];
  required: string[];
}

export const DEPENDENCIES: DependencySpec[];
export const CORE: { name: string; required: string[] };
export const BACKUP_NAME: string;

export class VendorError extends Error {}

export function isAllowed(spec: DependencySpec, path: string): boolean;
export function listDependency(spec: DependencySpec, directory: string): string[];
export function checkCore(root: string): void;
export function planDependencies(root: string, directory?: string): Record<string, string[]>;
export function stage(root: string): { count: number; bytes: number };
export function restore(root: string): boolean;
export function toPosix(path: string): string;
