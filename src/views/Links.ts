import type { TText } from "../layout/TText.js";

/** A run of an attributed text that has a `userData`, which is what the views treat as a link. */
export interface Link {
  readonly userData: number;
  readonly fromIndex: number;
  readonly toIndex: number;
}

/** Finds the runs of an attributed text that have a `userData`, as Tehreer-Web does. */
export function findLinks(text: TText | undefined): Link[] {
  const links: Link[] = [];
  if (text === undefined) {
    return links;
  }
  for (let index = 0; index < text.length; ) {
    const run = text.getAttributeRun(index);
    if (run === undefined || run.length <= 0) {
      break;
    }
    const userData = run.attributes.userData;
    if (userData !== undefined && userData !== 0) {
      // Runs next to each other with the same `userData` are one link, even if their colors differ.
      const last = links[links.length - 1];
      if (last !== undefined && last.userData === userData && last.toIndex === index) {
        links[links.length - 1] = { userData, fromIndex: last.fromIndex, toIndex: index + run.length };
      } else {
        links.push({ userData, fromIndex: index, toIndex: index + run.length });
      }
    }
    index += run.length;
  }
  return links;
}

/** The link that has a code unit, if any. */
export function linkAt(links: readonly Link[], index: number | undefined): Link | undefined {
  return index === undefined ? undefined : links.find((link) => index >= link.fromIndex && index < link.toIndex);
}
