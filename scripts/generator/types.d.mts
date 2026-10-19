// Types of the generator modules, which are plain JavaScript so that `node scripts/generate-bindings.mjs`
// runs without a build step. The tests are TypeScript and read these declarations.

export interface CType {
  base: string;
  const: boolean;
  pointer: number;
  tag?: "struct" | "union" | "enum";
  function?: undefined;
}

export interface FunctionType {
  function: { returns: CType; params: Declaration[] };
}

export interface Declaration {
  name: string;
  type: CType | FunctionType;
}

export type Typedef =
  | { kind: "alias"; name: string; target: CType }
  | { kind: "reference"; name: string; tag: string; const: boolean }
  | { kind: "struct" | "union"; name: string; tag: string | null; members: Declaration[] }
  | { kind: "function"; name: string; returns: CType; params: Declaration[] };

export interface Doc {
  params: Record<string, string>;
  returns: string;
}

export interface ParsedFunction {
  name: string;
  signature: string;
  returns: CType;
  params: Declaration[];
  doc: Doc;
}

export interface ParsedHeader {
  typedefs: Typedef[];
  functions: ParsedFunction[];
}

export interface ParseOptions {
  publicMacro: string;
  prefix: string;
}

export interface Descriptor {
  k: string;
  c?: string;
  [key: string]: unknown;
}

export interface ParameterPlan {
  name: string;
  index: number;
  js: boolean;
  nullable: boolean;
  kind: string;
  descriptor?: Descriptor;
  [key: string]: unknown;
}

export interface BindingPlan {
  name: string;
  file: string;
  signature: string;
  returns: Descriptor;
  params: ParameterPlan[];
  outputs: { key: string; source: string; name: string }[];
  result: { mode: string };
}

export interface Model {
  bindings: BindingPlan[];
  structs: { name: string; members: { name: string; descriptor: Descriptor }[] }[];
  layouts: { kind: "struct" | "union"; name: string; tag: string | null; members: Declaration[] }[];
  refs: { name: string; group: string; retain: string; release: string; const: boolean }[];
  files: string[];
  excluded: string[];
  manual: string[];
  releases: string[];
}

export interface ModelConfig {
  excluded: Set<string>;
  manual: Set<string>;
  bounds: Record<string, Record<string, { count: string }>>;
  scalarOuts: Record<string, string[]>;
  booleanTypes?: Set<string>;
}

export interface EmitOptions {
  includePrefix: string;
  skipIncludes: string[];
}

export interface Generated {
  cpp: Map<string, string>;
  ts: string;
  model: Model;
}
