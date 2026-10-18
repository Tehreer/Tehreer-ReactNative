#import "TehreerModuleProvider.h"

#import "TehreerModule.h"

@implementation TehreerModuleProvider

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::TehreerModule>(params.jsInvoker);
}

@end
