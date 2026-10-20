/** A run of characters that have the same embedding level. */
export class BidiRun {
  /** The index of the first character of the run in the source text. */
  readonly startIndex: number;
  /** The index after the last character of the run in the source text. */
  readonly endIndex: number;
  /** The embedding level of the run. */
  readonly embeddingLevel: number;

  constructor(startIndex: number, endIndex: number, embeddingLevel: number) {
    this.startIndex = startIndex;
    this.endIndex = endIndex;
    this.embeddingLevel = embeddingLevel;
  }

  /** Tells whether the embedding level is odd, which makes the run right-to-left. */
  get isRightToLeft(): boolean {
    return (this.embeddingLevel & 1) === 1;
  }

  equals(other: BidiRun): boolean {
    return (
      this.startIndex === other.startIndex &&
      this.endIndex === other.endIndex &&
      this.embeddingLevel === other.embeddingLevel
    );
  }

  toString(): string {
    return `BidiRun{startIndex=${this.startIndex}, endIndex=${this.endIndex}, embeddingLevel=${this.embeddingLevel}}`;
  }
}
