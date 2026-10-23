package com.tehreer.reactnative

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

/**
 * The only module this package registers is the asset resolver. The main TurboModule is C++ and is
 * found through the autolinked CMake project; Fabric views will be added here.
 */
class TehreerPackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == TehreerAssetsModule.NAME) TehreerAssetsModule(reactContext) else null

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
            TehreerAssetsModule.NAME to ReactModuleInfo(
                TehreerAssetsModule.NAME,
                TehreerAssetsModule::class.java.name,
                false, // canOverrideExistingModule
                false, // needsEagerInit
                false, // isCxxModule
                true, // isTurboModule
            ),
        )
    }
}
