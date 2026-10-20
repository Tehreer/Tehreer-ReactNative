import type { SfntTag } from "./SfntTag.js";

/** An OpenType feature of a font, such as `liga`, with the value to apply it with. */
export interface OpenTypeFeature {
  /** The tag of the feature. */
  readonly tag: SfntTag;
  /** The value of the feature. 0 turns it off and 1 turns it on; more selects an alternate. */
  readonly value: number;
}
