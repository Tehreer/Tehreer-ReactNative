import type { CodegenTypes, HostComponent, ViewProps } from "react-native";
import { codegenNativeComponent } from "react-native";

/**
 * The props of the native view that paints lines of a composed frame: the one piece of `TLabel` and
 * `TTextView` that JavaScript cannot do, because it has no canvas. Layout, scrolling, highlights and
 * taps are JavaScript's; this view only draws.
 *
 * The defaults are Core's, so a prop that is not given is what a new `Renderer` or `FrameResolver`
 * has; the device tests compare the renderer's. Colors are `0xAARRGGBB`
 * numbers as the signed `Int32` they have to be.
 *
 * Fabric asks the size of a leaf on the thread that commits, where JavaScript cannot answer, so the
 * shadow node (C++) measures the typesetter of `typesetterId` with the frame resolver settings below
 * when there is one: that is how a `TLabel` gets its size. A view with a size of its own sets none of
 * them.
 *
 * @internal
 */
export interface NativeProps extends ViewProps {
  /** The id that `registerTypesetter` gave to the typesetter to measure, or 0 to measure nothing. */
  typesetterId?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;

  /** The settings of the frame resolver, for measuring; each is the property of `FrameResolver` of the same name. */
  maxLines?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  textAlignment?: CodegenTypes.WithDefault<CodegenTypes.Int32, 3>;
  isTruncationEnabled?: CodegenTypes.WithDefault<boolean, false>;
  truncationMode?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  truncationPlace?: CodegenTypes.WithDefault<CodegenTypes.Int32, 2>;
  extraLineSpacing?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  lineHeightMultiplier?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;
  isJustificationEnabled?: CodegenTypes.WithDefault<boolean, false>;
  justificationLevel?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;

  /** The id that `registerComposedFrame` gave to the frame to paint. */
  composedFrameId?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  /** The index of the first line to paint, and how many lines to paint from it. */
  firstLine?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  lineCount?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  /** Where the top left of the view is in the coordinates of the frame, in layout units. */
  originX?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  originY?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;

  /**
   * How the text is painted; each is the property of `Renderer` of the same name (`textColor` is its
   * `foregroundColor`). The shadow props say `glyph` because `shadowColor` and `shadowRadius` are
   * style props of every view, which React Native would apply to the box of the view as well.
   */
  textColor?: CodegenTypes.WithDefault<CodegenTypes.Int32, -16777216>;
  drawStyle?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  strokeColor?: CodegenTypes.WithDefault<CodegenTypes.Int32, -16777216>;
  strokeRadius?: CodegenTypes.WithDefault<CodegenTypes.Float, 0.5>;
  strokeCap?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  strokeJoin?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  strokeMiter?: CodegenTypes.WithDefault<CodegenTypes.Float, 1>;
  glyphShadowColor?: CodegenTypes.WithDefault<CodegenTypes.Int32, 0>;
  glyphShadowRadius?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  glyphShadowDx?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
  glyphShadowDy?: CodegenTypes.WithDefault<CodegenTypes.Float, 0>;
}

// eslint-disable-next-line no-restricted-exports
export default codegenNativeComponent<NativeProps>("TLinePaint", { interfaceOnly: true }) as HostComponent<NativeProps>;
