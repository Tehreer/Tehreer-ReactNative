import type { Script } from "./enums.js";

/** A run of characters that have the same script. */
export class ScriptRun {
  /** The index of the first character of the run in the source text. */
  readonly startIndex: number;
  /** The index after the last character of the run in the source text. */
  readonly endIndex: number;
  /** The resolved script of the run. */
  readonly script: Script;

  constructor(startIndex: number, endIndex: number, script: Script) {
    this.startIndex = startIndex;
    this.endIndex = endIndex;
    this.script = script;
  }

  equals(other: ScriptRun): boolean {
    return this.startIndex === other.startIndex && this.endIndex === other.endIndex && this.script === other.script;
  }

  toString(): string {
    return `ScriptRun{startIndex=${this.startIndex}, endIndex=${this.endIndex}, script=${this.script}}`;
  }
}
