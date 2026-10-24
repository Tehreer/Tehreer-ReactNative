import type { CodegenTypes, HostComponent, ViewProps } from "react-native";
import { codegenNativeComponent } from "react-native";

// Codegen reads the types of one file, so these repeat those of TLabelNativeComponent.ts.
/** @internal */
export interface FrameReadyEvent {
  readonly lineCount: CodegenTypes.Int32;
  readonly width: CodegenTypes.Float;
  readonly height: CodegenTypes.Float;
}

/** A tap, in the coordinates of the text (the scroll offset is already added). @internal */
export interface TapEvent {
  readonly x: CodegenTypes.Float;
  readonly y: CodegenTypes.Float;
}

/** The distance of the top of the view from the top of the text, in layout units. @internal */
export interface ScrollEvent {
  readonly x: CodegenTypes.Float;
  readonly y: CodegenTypes.Float;
}

/**
 * The props of the native text view; see `TLabelNativeComponent.ts`. The text is laid out once for
 * the width, and the view keeps a view for each line that is in sight.
 *
 * @internal
 */
export interface NativeProps extends ViewProps {
  typesetterId?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  frameSettings?: ReadonlyArray<CodegenTypes.Float>;
  textColor?: CodegenTypes.WithDefault<CodegenTypes.Int32, -16777216>;
  /** The color of a line under each line of text; 0 (transparent) for none. */
  separatorColor?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  /** `fromIndex`, `toIndex` and `0xAARRGGBB` color of each highlighted range, one after the other. */
  highlights?: ReadonlyArray<CodegenTypes.Int32>;
  /** Where to scroll when `scrollToToken` changes, in layout units; JavaScript has made it a finite number. */
  scrollToOffset?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  scrollToToken?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  onFrameReady?: CodegenTypes.DirectEventHandler<FrameReadyEvent>;
  onTextTap?: CodegenTypes.DirectEventHandler<TapEvent>;
  onTextScroll?: CodegenTypes.DirectEventHandler<ScrollEvent>;
}

// eslint-disable-next-line no-restricted-exports
export default codegenNativeComponent<NativeProps>("TTextView", { interfaceOnly: true }) as HostComponent<NativeProps>;
