package expo.modules.auraaccessibility

import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class AuraAccessibilityModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("AuraAccessibilityService")

    Function("getStatus") {
      val service = AuraAccessibilityService.instance
      mapOf(
        "enabled" to (service?.isServiceEnabled() == true),
        "installed" to true,
        "permissionGranted" to (service?.isServiceEnabled() == true)
      )
    }

    AsyncFunction("openSettings") {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      appContext.reactContext?.startActivity(intent)
    }

    AsyncFunction("getRootInActiveWindow") { promise: Promise ->
      val service = AuraAccessibilityService.instance
      if (service == null) {
        promise.reject("SERVICE_DISABLED", "AccessibilityService not enabled", null)
        return@AsyncFunction
      }
      if (!service.isServiceEnabled()) {
        promise.reject("SERVICE_DISABLED", "AccessibilityService not enabled in Settings", null)
        return@AsyncFunction
      }
      val tree = service.getRootTree()
      if (tree.isEmpty()) {
        promise.reject("NO_WINDOW", "No active window found", null)
        return@AsyncFunction
      }
      promise.resolve(tree)
    }

    AsyncFunction("performAction") { params: Map<String, Any?>, promise: Promise ->
      val service = AuraAccessibilityService.instance
      if (service == null) {
        promise.reject("SERVICE_DISABLED", "AccessibilityService not enabled", null)
        return@AsyncFunction
      }
      if (!service.isServiceEnabled()) {
        promise.reject("SERVICE_DISABLED", "AccessibilityService not enabled in Settings", null)
        return@AsyncFunction
      }
      val type = params["type"] as? String
        ?: return@AsyncFunction promise.reject("INVALID_REQUEST", "Missing 'type' field", null)
      val result = service.handleAction(type, params)
      promise.resolve(result)
    }
  }
}
