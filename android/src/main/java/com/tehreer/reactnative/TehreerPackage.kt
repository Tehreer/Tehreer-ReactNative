package com.tehreer.reactnative

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

/**
 * Autolinking only accepts an Android library that has a package class. The main TurboModule is C++
 * and is found through the autolinked CMake project; this package registers the asset resolver and
 * the view managers of the Fabric components, whose shadow nodes are C++ too.
 */
class TehreerPackage : BaseReactPackage() {
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        listOf(TLabelManager(), TTextViewManager())

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
