import { IndexedList } from "../collections/IndexedList.js";
import type { List } from "../collections/List.js";
import { adopt } from "../internal/Adopt.js";
import { getNativeBindings } from "../internal/NativeBindings.js";
import type { Handle } from "../internal/NativeFunctions.js";
import { NativeObject } from "../internal/NativeObject.js";
import { Typeface } from "./Typeface.js";

/**
 * A font file, such as a TrueType, OpenType or collection file, which has one or more typefaces.
 *
 * Core copies the data it is given, so the buffer can be reused right away. Typefaces keep the
 * font data alive, so they stay valid after the font file is disposed.
 */
export class FontFile extends NativeObject<"TRFontFile"> {
  /**
   * Reads a font file from its bytes, as {@link FontFile.fromBytes} does.
   *
   * @throws Error if the data does not contain a usable font.
   */
  constructor(data: ArrayBuffer | ArrayBufferView);
  /** @internal */
  constructor(token: typeof adopt, handle: Handle<"TRFontFile">);
  constructor(source: ArrayBuffer | ArrayBufferView | typeof adopt, handle?: Handle<"TRFontFile">) {
    super(source === adopt ? (handle as Handle<"TRFontFile">) : FontFile.#createFromBytes(source));
  }

  static #createFromBytes(data: ArrayBuffer | ArrayBufferView): Handle<"TRFontFile"> {
    // The binding checks that this is a buffer, and that the size fits it.
    const created = getNativeBindings().TRFontFileCreateFromMemory(data, data.byteLength);
    if (created === undefined) {
      throw new Error("The data does not contain a usable font.");
    }
    return created;
  }

  /**
   * Reads a font file from its bytes. Core copies them.
   *
   * @throws Error if the data is empty or does not contain a usable font.
   */
  static fromBytes(data: ArrayBuffer | ArrayBufferView): FontFile {
    return new FontFile(data);
  }

  /**
   * Reads a font file from a file on the device.
   *
   * @param path The path of the file in the file system of the device.
   * @throws Error if the file cannot be read or does not contain a usable font.
   */
  static fromPath(path: string): FontFile {
    const created = getNativeBindings().TRFontFileCreateFromPath(path);
    if (created === undefined) {
      throw new Error(`The file does not contain a usable font: ${path}`);
    }
    return new FontFile(adopt, created);
  }

  /**
   * The default typefaces of the file: one for each face, and one for each named style of a face
   * that has them. There is always at least one. Each element read makes a new `Typeface` that
   * owns a reference of its own.
   */
  get typefaces(): List<Typeface> {
    const bindings = getNativeBindings();
    const count = bindings.TRFontFileGetTypefaceCount(this.nativeHandle);

    return new IndexedList(this, count, (index) => {
      const typeface = bindings.TRFontFileGetTypeface(this.nativeHandle, index);
      if (typeface === undefined) {
        throw new Error(`The font file has no typeface at index ${index}.`);
      }
      // The binding retained it for the handle, which therefore owns a reference.
      return Typeface.adopting(typeface);
    });
  }
}
