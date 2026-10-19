import { adopt } from "./Adopt.js";
import { getNativeBindings } from "./NativeBindings.js";
import type { Handle } from "./NativeFunctions.js";

// `Symbol.dispose` is part of the language only in recent engines, and Hermes does not have it yet.
(Symbol as { dispose?: symbol }).dispose ??= Symbol.for("Symbol.dispose");

/** A constructor with the internal overload that takes ownership of a reference. */
export interface AdoptingConstructor<T, Kind extends string> {
  new (token: typeof adopt, handle: Handle<Kind>): T;
}

/**
 * An object that owns one reference to an object of Core, which it releases when it is disposed.
 *
 * The native side holds the reference in the handle. If `dispose()` is never called, the engine
 * releases it when the handle is collected, but nothing may depend on that: when it happens is not
 * known. Objects of Core are immutable and thread safe once they are created (the mutable ones say
 * so), so a wrapper never shares a reference: whenever Core gives out one that it does not retain
 * for the caller, the binding retains its own, and the lifetime of a child never depends on that of
 * its parent.
 */
export abstract class NativeObject<Kind extends string> implements Disposable {
  #handle: Handle<Kind> | undefined;

  /** @param handle A handle that owns its reference: one that a `Create`, `Copy` or `Retain` binding returned. */
  protected constructor(handle: Handle<Kind>) {
    this.#handle = handle;
  }

  /**
   * Wraps a handle that owns its reference, such as the result of a `Create` or `Copy` binding.
   *
   * @internal
   */
  static adopting<T extends NativeObject<Kind>, Kind extends string>(this: AdoptingConstructor<T, Kind>, handle: Handle<Kind>): T {
    return new this(adopt, handle);
  }

  /**
   * Wraps a handle that the caller keeps, by retaining a reference of its own first. The `Get`
   * bindings already hand out an owning handle, so this is for a handle that is owned elsewhere.
   *
   * @param retain The `Retain` binding of the kind, such as `TRTypefaceRetain`.
   * @throws Error if Core does not return a reference.
   * @internal
   */
  static retaining<T extends NativeObject<Kind>, Kind extends string>(
    this: AdoptingConstructor<T, Kind>,
    handle: Handle<Kind>,
    retain: (handle: Handle<Kind>) => Handle<Kind> | undefined,
  ): T {
    const retained = retain(handle);
    if (retained === undefined) {
      throw new Error("Core did not return a reference.");
    }

    return new this(adopt, retained);
  }

  /** Tells whether `dispose()` has been called. */
  get isDisposed(): boolean {
    return this.#handle === undefined;
  }

  /**
   * The handle of the object of Core, to pass to the native bindings.
   *
   * @throws Error if the object is already disposed.
   * @internal
   */
  get nativeHandle(): Handle<Kind> {
    if (this.#handle === undefined) {
      throw new Error(`${this.constructor.name} is already disposed.`);
    }

    return this.#handle;
  }

  /**
   * Tells if both wrap the same object of Core.
   *
   * @throws Error if either is already disposed.
   */
  equals(other: NativeObject<string>): boolean {
    return getNativeBindings().handleEquals(this.nativeHandle, other.nativeHandle);
  }

  /** Releases the reference to the object of Core. Disposing an object again has no effect. */
  dispose(): void {
    const handle = this.#handle;
    if (handle !== undefined) {
      this.#handle = undefined;
      getNativeBindings().disposeHandle(handle);
    }
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}

/** Reads the handle of an optional wrapper, which is `undefined` (`NULL`) for none. */
export function handleOf<Kind extends string>(object: NativeObject<Kind> | undefined | null): Handle<Kind> | undefined {
  return object ? object.nativeHandle : undefined;
}
