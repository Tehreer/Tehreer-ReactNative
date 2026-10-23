package com.tehreer.reactnative

import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import java.io.File
import java.io.IOException
import java.util.concurrent.Executors

/**
 * Gives JavaScript a file path for an asset of a release build. Metro puts a font into `res/raw`,
 * and Core reads files by path, so the resource is copied into the cache directory once.
 */
@ReactModule(name = TehreerAssetsModule.NAME)
class TehreerAssetsModule(context: ReactApplicationContext) : NativeTehreerAssetsSpec(context) {
    override fun getName() = NAME

    override fun resolveAsset(name: String, promise: Promise) {
        // The copy is disk I/O, so it must not run on the JS thread; one thread serializes two
        // requests for the same resource, so they never write the same file together.
        executor.execute {
            try {
                promise.resolve(copyRawResource(reactApplicationContext, name))
            } catch (e: Exception) {
                promise.reject("E_ASSET", e.message ?: "The asset $name could not be copied.", e)
            }
        }
    }

    companion object {
        const val NAME = "NativeTehreerAssets"

        private val executor = Executors.newSingleThreadExecutor { runnable ->
            Thread(runnable, "tehreer-assets").apply { isDaemon = true }
        }

        /**
         * Copies the `raw` resource to `cache/tehreer-assets/<install time>/<name>` unless it is
         * there. The install time is in the path so that an updated app, which keeps its cache,
         * never reads the font of the previous version.
         */
        internal fun copyRawResource(context: Context, name: String): String {
            val id = context.resources.getIdentifier(name, "raw", context.packageName)
            if (id == 0) {
                throw IOException("The app has no raw resource named '$name'.")
            }

            val installTime = context.packageManager.getPackageInfo(context.packageName, 0).lastUpdateTime
            val root = File(context.cacheDir, "tehreer-assets")
            val directory = File(root, installTime.toString())
            val target = File(directory, name)
            if (target.isFile && target.length() > 0) {
                return target.absolutePath
            }

            // Older versions are garbage now.
            root.listFiles()?.filter { it.name != directory.name }?.forEach { it.deleteRecursively() }
            if (!directory.isDirectory && !directory.mkdirs()) {
                throw IOException("The cache directory ${directory.path} could not be created.")
            }

            // Written beside the target and renamed, so that a crash never leaves half a font.
            val partial = File(directory, "$name.part")
            try {
                context.resources.openRawResource(id).use { input ->
                    partial.outputStream().use { output -> input.copyTo(output) }
                }
                if (partial.length() == 0L) {
                    throw IOException("The raw resource '$name' is empty.")
                }
                if (!partial.renameTo(target)) {
                    throw IOException("The copy of '$name' could not be moved to ${target.path}.")
                }
            } finally {
                partial.delete()
            }
            return target.absolutePath
        }
    }
}
