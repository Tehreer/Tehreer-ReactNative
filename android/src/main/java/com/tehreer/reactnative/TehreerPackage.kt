package com.tehreer.reactnative

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.uimanager.ViewManager

/**
 * Autolinking only accepts an Android library that has a package class. The package registers no
 * module: the TurboModule is C++ and is found through the autolinked CMake project. The package registers the
 * view managers of the Fabric components, whose shadow nodes are C++ too.
 */
class TehreerPackage : BaseReactPackage() {
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        listOf(TehreerTextBaseManager())

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? = null

    override fun getReactModuleInfoProvider() =
        com.facebook.react.module.model.ReactModuleInfoProvider { emptyMap<String, ReactModuleInfo>() }
}
