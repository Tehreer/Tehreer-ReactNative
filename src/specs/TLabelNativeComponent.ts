import type { CodegenTypes, HostComponent, ViewProps } from "react-native";
import { codegenNativeComponent } from "react-native";

/**
 * What the native label tells JavaScript when it has laid its text out: how many lines the frame has
 * and how big it is. The device tests compare it with the frame that the JavaScript API makes.
 *
 * @internal
 */
export interface FrameReadyEvent {
  readonly lineCount: CodegenTypes.Int32;
  readonly width: CodegenTypes.Float;
  readonly height: CodegenTypes.Float;
}

/** A tap, in the coordinates of the label. @internal */
export interface TapEvent {
  readonly x: CodegenTypes.Float;
  readonly y: CodegenTypes.Float;
}

/**
 * The props of the native label. JavaScript has resolved every default, so the native side reads
 * numbers: the component is not public API, `TLabel` is.
 *
 * @internal
 */
export interface NativeProps extends ViewProps {
  /** The id that `registerTypesetter` gave to the typesetter of the text. */
  typesetterId?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  /** The settings of the frame resolver, in the order of `FrameSettings` in `cpp/views/TextLayout.h`. */
  frameSettings?: ReadonlyArray<CodegenTypes.Float>;
  /** How the text is drawn, as numbers in the order of `RendererSettings` in `cpp/views/RendererSettings.h`. */
  rendererInts?: ReadonlyArray<CodegenTypes.Int32>;
  rendererFloats?: ReadonlyArray<CodegenTypes.Float>;
  onFrameReady?: CodegenTypes.DirectEventHandler<FrameReadyEvent>;
  onTextTap?: CodegenTypes.DirectEventHandler<TapEvent>;
}

// `interfaceOnly`: codegen writes Props, EventEmitters and the Java interface but no ShadowNode,
// State or ComponentDescriptor, which are written by hand in cpp/views (a shadow node that measures
// through Core cannot be a generated one). Codegen only accepts a default export.
// eslint-disable-next-line no-restricted-exports
export default codegenNativeComponent<NativeProps>("TLabel", { interfaceOnly: true }) as HostComponent<NativeProps>;
