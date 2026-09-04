package expo.modules.needle

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.CodedException
import java.io.File

class NeedleLoadException(message: String) : CodedException(message)

/**
 * Expo module wrapping Cactus's Needle 2 — a 45M-parameter model for structured
 * extraction and tool calling, running fully on-device.
 *
 * Inference is single-session and stateful in the native library (there is one
 * global context behind those four C functions), so every call is serialised on
 * a lock. Work runs on AsyncFunction's background dispatcher, never the UI
 * thread — a completion takes hundreds of milliseconds.
 */
class NeedleModule : Module() {
  private val lock = Any()
  private var loaded = false

  override fun definition() = ModuleDefinition {
    Name("Needle")

    /** Load the .cact model from a file path. Idempotent per process. */
    AsyncFunction("load") { path: String ->
      synchronized(lock) {
        if (!NeedleNative.available) throw NeedleLoadException("Needle is not available on this device (arm64 only)")
        val file = File(path.removePrefix("file://"))
        if (!file.exists()) throw NeedleLoadException("Model not found at $path")
        val rc = NeedleNative.nativeLoad(file.readBytes())
        if (rc != 0) throw NeedleLoadException("needle_load failed with code $rc")
        loaded = true
        true
      }
    }

    /** False on a device with no arm64 build of the engine. */
    Function("isSupported") { NeedleNative.available }

    Function("isLoaded") { loaded }

    /**
     * Load the model shipped inside the module's assets.
     *
     * This is the normal path: the weights travel with the app, so the first
     * extraction works offline with no download and no storage permission.
     * Assets are read straight into memory — no copy to disk first.
     */
    AsyncFunction("loadBundled") { assetName: String ->
      synchronized(lock) {
        if (!NeedleNative.available) throw NeedleLoadException("Needle is not available on this device (arm64 only)")
        val ctx = appContext.reactContext
          ?: throw NeedleLoadException("No Android context available")
        // The weights are downloaded, not vendored, so "asset missing" is a
        // routine first-run state rather than a bug — name the fix.
        val bytes = try {
          ctx.assets.open(assetName).use { it.readBytes() }
        } catch (e: java.io.FileNotFoundException) {
          throw NeedleLoadException(
            "Model asset '$assetName' is not in the APK. " +
              "Run `npx react-native-needle fetch-model` and rebuild, " +
              "or call loadModel(path) with a model you ship yourself."
          )
        }
        val rc = NeedleNative.nativeLoad(bytes)
        if (rc != 0) throw NeedleLoadException("needle_load failed with code $rc")
        loaded = true
        true
      }
    }

    /**
     * Set the system prompt and the tool schema. `toolsJson` is what makes the
     * model emit a conforming call rather than free text, so extraction callers
     * pass their field schema here.
     */
    AsyncFunction("init") { systemPrompt: String?, toolsJson: String?, toolIndexPath: String? ->
      synchronized(lock) {
        if (!loaded) throw NeedleLoadException("Call load() before init()")
        NeedleNative.nativeInit(systemPrompt, toolsJson, toolIndexPath)
      }
    }

    AsyncFunction("complete") { input: String, maxNewTokens: Int ->
      synchronized(lock) {
        if (!loaded) throw NeedleLoadException("Call load() before complete()")
        NeedleNative.nativeComplete(input, maxNewTokens)
      }
    }

    AsyncFunction("reset") {
      synchronized(lock) { NeedleNative.nativeReset() }
    }
  }
}
