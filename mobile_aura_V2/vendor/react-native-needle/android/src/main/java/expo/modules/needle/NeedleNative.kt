package expo.modules.needle

/**
 * Thin JNI surface over Needle's four C entry points.
 *
 * The native library is arm64-only (see build.gradle), so loading is allowed to
 * fail: on a 32-bit device we report unavailable instead of taking the app down
 * with an UnsatisfiedLinkError.
 */
internal object NeedleNative {
  val available: Boolean = try {
    System.loadLibrary("needlejni")
    true
  } catch (e: Throwable) {
    false
  }

  external fun nativeLoad(model: ByteArray): Int
  external fun nativeInit(systemPrompt: String?, toolsJson: String?, toolIndexPath: String?): Int
  external fun nativeComplete(input: String, maxNewTokens: Int): String?
  external fun nativeReset()
}
