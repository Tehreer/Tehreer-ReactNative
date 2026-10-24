import type { CodegenTypes, HostComponent, ViewProps } from "react-native";
import { codegenNativeComponent } from "react-native";

/**
 * What the native view read from the state of the shadow node when it received a frame.
 *
 * @internal
 */
export interface FrameReadyEvent {
  /** The number of lines of the frame that Core composed. */
  readonly lineCount: CodegenTypes.Int32;
  /** The width of that frame, in layout units. */
  readonly width: CodegenTypes.Float;
  /** The height of that frame, in layout units. */
  readonly height: CodegenTypes.Float;
  /**
   * The id that names the frame to `acquireViewFrame`, so that JavaScript can ask Core about the
   * very frame the view paints (hit testing, selection rectangles). 0 when there is none.
   */
  readonly frameId: CodegenTypes.Int32;
}

/** A tap, in the coordinates of the text (the scroll offset is already added). @internal */
export interface TextTapEvent {
  readonly x: CodegenTypes.Float;
  readonly y: CodegenTypes.Float;
}

/** The scroll offset of a scrollable view, in layout units. @internal */
export interface TextScrollEvent {
  readonly x: CodegenTypes.Float;
  readonly y: CodegenTypes.Float;
}

/** @internal */
export interface NativeProps extends ViewProps {
  /** The text, as a JavaScript string; C++ converts it back to UTF-16 for Core. */
  text?: string;
  /** The tag the typeface is registered with in `TypefaceManager`; 0 or an unknown tag measures nothing. */
  typefaceTag?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  /** The type size, in layout units. */
  typeSize?: CodegenTypes.WithDefault<CodegenTypes.Float, 14>;
  /** The most lines of the frame; 0 for no limit. */
  maxLines?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  /**
   * The id of attributed text made by `registerViewText`; when it is not 0 it replaces `text`,
   * `typefaceTag` and `typeSize`. An id that is not registered (any more) shows nothing.
   */
  textId?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  /** The foreground color, `0xAARRGGBB` as a signed 32-bit number. Opaque black by default. */
  textColor?: CodegenTypes.WithDefault<CodegenTypes.Int32, -16777216>;
  /** A `TextAlignment`; leading by default. */
  textAlignment?: CodegenTypes.WithDefault<CodegenTypes.Int32, 3>;
  truncationEnabled?: CodegenTypes.WithDefault<boolean, false>;
  /** A `BreakMode`. */
  truncationMode?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  /** A `TruncationPlace`; the end by default. */
  truncationPlace?: CodegenTypes.WithDefault<CodegenTypes.Int32, 2>;
  extraLineSpacing?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  lineHeightMultiplier?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;
  justificationEnabled?: CodegenTypes.WithDefault<boolean, false>;
  justificationLevel?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;
  /**
   * Makes the view a scroll view over the whole text: the frame is laid out once for the width, and
   * scrolling only paints the lines in view.
   */
  scrollable?: CodegenTypes.WithDefault<boolean, false>;
  /** The range of code units to cover with `selectionColor`, behind the text; -1 for none. Paints only, never re-lays out. */
  selectionStart?: CodegenTypes.WithDefault<CodegenTypes.Int32, -1>;
  selectionEnd?: CodegenTypes.WithDefault<CodegenTypes.Int32, -1>;
  selectionColor?: CodegenTypes.WithDefault<CodegenTypes.Int32, 1429442815>;
  /** Where to scroll when `scrollToToken` changes. */
  scrollToOffset?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  scrollToToken?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  onTextTap?: CodegenTypes.DirectEventHandler<TextTapEvent>;
  onTextScroll?: CodegenTypes.DirectEventHandler<TextScrollEvent>;
  /** Called by the native view whenever the shadow node hands it a new frame. */
  onFrameReady?: CodegenTypes.DirectEventHandler<FrameReadyEvent>;
}

// `interfaceOnly`: codegen writes Props, EventEmitters and the Java interface but no ShadowNode,
// State or ComponentDescriptor, which are written by hand in cpp/fabric (a shadow node that
// measures through Core cannot be a generated one). Codegen only accepts a default export.
// eslint-disable-next-line no-restricted-exports
export default codegenNativeComponent<NativeProps>("TehreerTextBase", { interfaceOnly: true }) as HostComponent<NativeProps>;
