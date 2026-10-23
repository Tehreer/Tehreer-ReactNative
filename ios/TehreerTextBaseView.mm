#import "TehreerTextBaseView.h"

#import "fabric/TehreerTextBaseComponentDescriptor.h"

#import <react/renderer/components/TehreerSpec/EventEmitters.h>
#import <react/renderer/components/TehreerSpec/Props.h>

using namespace facebook::react;

@implementation TehreerTextBaseView {
  TehreerTextBaseShadowNode::ConcreteState::Shared _state;
}

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<TehreerTextBaseComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame
{
  if (self = [super initWithFrame:frame]) {
    static const auto defaultProps = std::make_shared<const TehreerTextBaseProps>();
    _props = defaultProps;

    // Only so that the measured size can be seen; painting the frame is for the painters.
    self.backgroundColor = [UIColor colorWithRed:0.20 green:0.45 blue:0.85 alpha:0.35];
  }
  return self;
}

- (void)updateState:(const State::Shared &)state oldState:(const State::Shared &)oldState
{
  _state = std::static_pointer_cast<const TehreerTextBaseShadowNode::ConcreteState>(state);
  if (!_state || !_eventEmitter) {
    return;
  }

  // Read from the frame itself, not from the layout: this is the handoff the component proves.
  const auto &data = _state->getData();
  std::static_pointer_cast<const TehreerTextBaseEventEmitter>(_eventEmitter)
      ->onFrameReady({.lineCount = data.lineCount(),
                      .width = static_cast<Float>(data.frameWidth()),
                      .height = static_cast<Float>(data.frameHeight())});
}

- (void)prepareForRecycle
{
  _state.reset();
  [super prepareForRecycle];
}

@end

// The class name that RCTThirdPartyComponentsProvider (generated from codegenConfig) looks up.
Class<RCTComponentViewProtocol> TehreerTextBaseViewCls(void)
{
  return TehreerTextBaseView.class;
}
