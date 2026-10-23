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
  /** Called by the native view whenever the shadow node hands it a new frame. */
  onFrameReady?: CodegenTypes.DirectEventHandler<FrameReadyEvent>;
}

// `interfaceOnly`: codegen writes Props, EventEmitters and the Java interface but no ShadowNode,
// State or ComponentDescriptor, which are written by hand in cpp/fabric (a shadow node that
// measures through Core cannot be a generated one). Codegen only accepts a default export.
// eslint-disable-next-line no-restricted-exports
export default codegenNativeComponent<NativeProps>("TehreerTextBase", { interfaceOnly: true }) as HostComponent<NativeProps>;
