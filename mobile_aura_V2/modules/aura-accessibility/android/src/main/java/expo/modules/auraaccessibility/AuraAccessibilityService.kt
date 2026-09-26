package expo.modules.auraaccessibility

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.graphics.Rect
import android.os.Bundle
import android.provider.Settings
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class AuraAccessibilityService : AccessibilityService() {

  companion object {
    @Volatile var instance: AuraAccessibilityService? = null
      private set
  }

  override fun onServiceConnected() {
    instance = this
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {}

  override fun onInterrupt() {}

  override fun onDestroy() {
    instance = null
  }

  fun isServiceEnabled(): Boolean {
    val expected = "${packageName}/${AuraAccessibilityService::class.java.canonicalName}"
    val enabled = Settings.Secure.getString(contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES)
    return enabled?.contains(expected) == true
  }

  fun getRootTree(): Map<String, Any?> {
    val root = rootInActiveWindow ?: return emptyMap()
    val nodeMap = buildNodeMap(root)
    root.recycle()
    return mapOf(
      "root" to nodeMap,
      "packageName" to (packageName ?: ""),
      "activityName" to (currentActivityName() ?: "")
    )
  }

  private fun currentActivityName(): String? {
    val root = rootInActiveWindow ?: return null
    val label = root.packageName?.toString()
    root.recycle()
    return label
  }

  @Suppress("UNCHECKED_CAST")
  private fun buildNodeMap(node: AccessibilityNodeInfo): Map<String, Any?> {
    val bounds = Rect()
    node.getBoundsInScreen(bounds)
    val children = mutableListOf<Map<String, Any?>>()
    for (i in 0 until node.childCount) {
      val child = node.getChild(i) ?: continue
      children.add(buildNodeMap(child))
      child.recycle()
    }
    return mapOf(
      "id" to "${System.identityHashCode(node)}",
      "className" to (node.className?.toString() ?: ""),
      "text" to (node.text?.toString() ?: ""),
      "contentDescription" to (node.contentDescription?.toString() ?: ""),
      "resourceId" to (node.viewIdResourceName ?: ""),
      "packageName" to (node.packageName?.toString() ?: ""),
      "clickable" to node.isClickable,
      "editable" to node.isEditable,
      "scrollable" to node.isScrollable,
      "focusable" to node.isFocusable,
      "enabled" to node.isEnabled,
      "checkable" to node.isCheckable,
      "checked" to node.isChecked,
      "selected" to node.isSelected,
      "focused" to node.isFocused,
      "password" to node.isPassword,
      "longClickable" to node.isLongClickable,
      "bounds" to mapOf(
        "left" to bounds.left,
        "top" to bounds.top,
        "right" to bounds.right,
        "bottom" to bounds.bottom
      ),
      "children" to children
    )
  }

  fun handleAction(type: String, params: Map<String, Any?>): Map<String, Any?> {
    return try {
      when (type) {
        "tap_bounds" -> tapBounds(params)
        "tap_text" -> tapByText(params["target"] as? String ?: "")
        "tap_description" -> tapByDescription(params["target"] as? String ?: "")
        "tap_id" -> tapByResourceId(params["target"] as? String ?: "")
        "type" -> typeText(params["text"] as? String ?: "")
        "scroll" -> handleScroll(params)
        "swipe" -> handleSwipe(params)
        "long_press" -> longPressBounds(params)
        "double_tap" -> doubleTapBounds(params)
        "back" -> pressBack()
        "home" -> pressHome()
        "recent" -> pressRecents()
        else -> mapOf("success" to false, "error" to "Unknown action: $type")
      }
    } catch (e: Exception) {
      mapOf("success" to false, "error" to (e.message ?: "Action failed"))
    }
  }

  private fun boundsMapToRect(bounds: Any?): Rect {
    @Suppress("UNCHECKED_CAST")
    val m = bounds as? Map<String, Any?> ?: return Rect(0, 0, 0, 0)
    return Rect(
      (m["left"] as? Number)?.toInt() ?: 0,
      (m["top"] as? Number)?.toInt() ?: 0,
      (m["right"] as? Number)?.toInt() ?: 0,
      (m["bottom"] as? Number)?.toInt() ?: 0
    )
  }

  private fun centerOf(rect: Rect): Pair<Float, Float> {
    return Pair(
      ((rect.left + rect.right) / 2).toFloat(),
      ((rect.top + rect.bottom) / 2).toFloat()
    )
  }

  private fun tapBounds(params: Map<String, Any?>): Map<String, Any?> {
    val rect = boundsMapToRect(params["bounds"])
    val (cx, cy) = centerOf(rect)
    return dispatchTap(cx, cy)
  }

  private fun tapByText(text: String): Map<String, Any?> {
    val root = rootInActiveWindow ?: return mapOf("success" to false, "error" to "No active window")
    val node = findFirst(root) { it.text?.toString()?.contains(text, ignoreCase = true) == true }
      ?: return mapOf("success" to false, "error" to "Text not found: $text")
    val rect = Rect()
    node.getBoundsInScreen(rect)
    val (cx, cy) = centerOf(rect)
    root.recycle()
    return dispatchTap(cx, cy)
  }

  private fun tapByDescription(desc: String): Map<String, Any?> {
    val root = rootInActiveWindow ?: return mapOf("success" to false, "error" to "No active window")
    val node = findFirst(root) { it.contentDescription?.toString()?.contains(desc, ignoreCase = true) == true }
      ?: return mapOf("success" to false, "error" to "Description not found: $desc")
    val rect = Rect()
    node.getBoundsInScreen(rect)
    val (cx, cy) = centerOf(rect)
    root.recycle()
    return dispatchTap(cx, cy)
  }

  private fun tapByResourceId(id: String): Map<String, Any?> {
    val root = rootInActiveWindow ?: return mapOf("success" to false, "error" to "No active window")
    val node = findFirst(root) { it.viewIdResourceName == id }
      ?: return mapOf("success" to false, "error" to "Resource ID not found: $id")
    val rect = Rect()
    node.getBoundsInScreen(rect)
    val (cx, cy) = centerOf(rect)
    root.recycle()
    return dispatchTap(cx, cy)
  }

  private fun typeText(text: String): Map<String, Any?> {
    val root = rootInActiveWindow ?: return mapOf("success" to false, "error" to "No active window")
    val node = findFirst(root) { it.isEditable }
      ?: return mapOf("success" to false, "error" to "No editable field found")
    val focused = node.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
    val setText = node.performAction(
      AccessibilityNodeInfo.ACTION_SET_TEXT,
      Bundle().apply { putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text) }
    )
    root.recycle()
    return if (setText) {
      mapOf("success" to true)
    } else {
      mapOf("success" to false, "error" to "Failed to set text (ACTION_SET_TEXT returned false)")
    }
  }

  private fun handleScroll(params: Map<String, Any?>): Map<String, Any?> {
    val direction = params["direction"] as? String ?: "down"
    val root = rootInActiveWindow
      ?: return mapOf("success" to false, "error" to "No active window")

    val scrollable = findFirst(root) { it.isScrollable }
      ?: return run { root.recycle(); mapOf("success" to false, "error" to "No scrollable element found") }

    val action = when (direction) {
      "up" -> AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
      "down" -> AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
      "left" -> AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
      "right" -> AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
      else -> AccessibilityNodeInfo.ACTION_SCROLL_FORWARD
    }
    val result = scrollable.performAction(action)
    root.recycle()
    return if (result) {
      mapOf("success" to true)
    } else {
      mapOf("success" to false, "error" to "Scroll action failed (element may not be scrollable in this direction)")
    }
  }

  private fun handleSwipe(params: Map<String, Any?>): Map<String, Any?> {
    val startBounds = params["startBounds"] as? Map<String, Any?>
    val endBounds = params["endBounds"] as? Map<String, Any?>

    val startRect = boundsMapToRect(startBounds ?: params["bounds"])
    val endRect = boundsMapToRect(endBounds ?: params["bounds"])

    val (sx, sy) = centerOf(startRect)
    val (ex, ey) = centerOf(endRect)

    val path = Path().apply {
      moveTo(sx, sy)
      lineTo(ex, ey)
    }
    val stroke = GestureDescription.StrokeDescription(path, 0, 300)
    val gesture = GestureDescription.Builder().addStroke(stroke).build()
    val callback = object : GestureResultCallback() {
      var success = false
      override fun onCompleted(gestureDescription: GestureDescription) { success = true }
      override fun onCancelled(gestureDescription: GestureDescription) { success = false }
    }
    dispatchGesture(gesture, callback, null)
    return mapOf("success" to true)
  }

  private fun longPressBounds(params: Map<String, Any?>): Map<String, Any?> {
    val rect = boundsMapToRect(params["bounds"])
    val (cx, cy) = centerOf(rect)
    val path = Path().apply { moveTo(cx, cy) }
    val stroke = GestureDescription.StrokeDescription(path, 0, 600)
    val gesture = GestureDescription.Builder().addStroke(stroke).build()
    val callback = object : GestureResultCallback() {
      var success = false
      override fun onCompleted(g: GestureDescription) { success = true }
      override fun onCancelled(g: GestureDescription) { success = false }
    }
    dispatchGesture(gesture, callback, null)
    return mapOf("success" to true)
  }

  private fun doubleTapBounds(params: Map<String, Any?>): Map<String, Any?> {
    val rect = boundsMapToRect(params["bounds"])
    val (cx, cy) = centerOf(rect)
    val path1 = Path().apply { moveTo(cx, cy) }
    val stroke1 = GestureDescription.StrokeDescription(path1, 0, 50)
    val gesture1 = GestureDescription.Builder().addStroke(stroke1).build()
    dispatchGesture(gesture1, null, null)
    val path2 = Path().apply { moveTo(cx, cy) }
    val stroke2 = GestureDescription.StrokeDescription(path2, 100, 50)
    val gesture2 = GestureDescription.Builder().addStroke(stroke2).build()
    dispatchGesture(gesture2, null, null)
    return mapOf("success" to true)
  }

  private fun dispatchTap(cx: Float, cy: Float): Map<String, Any?> {
    val path = Path().apply { moveTo(cx, cy) }
    val stroke = GestureDescription.StrokeDescription(path, 0, 50)
    val gesture = GestureDescription.Builder().addStroke(stroke).build()
    val callback = object : GestureResultCallback() {
      var success = false
      override fun onCompleted(g: GestureDescription) { success = true }
      override fun onCancelled(g: GestureDescription) { success = false }
    }
    dispatchGesture(gesture, callback, null)
    return mapOf("success" to true)
  }

  private fun pressBack(): Map<String, Any?> {
    return if (performGlobalAction(GLOBAL_ACTION_BACK)) {
      mapOf("success" to true)
    } else {
      mapOf("success" to false, "error" to "Back action failed")
    }
  }

  private fun pressHome(): Map<String, Any?> {
    return if (performGlobalAction(GLOBAL_ACTION_HOME)) {
      mapOf("success" to true)
    } else {
      mapOf("success" to false, "error" to "Home action failed")
    }
  }

  private fun pressRecents(): Map<String, Any?> {
    return if (performGlobalAction(GLOBAL_ACTION_RECENTS)) {
      mapOf("success" to true)
    } else {
      mapOf("success" to false, "error" to "Recents action failed")
    }
  }

  private fun findFirst(node: AccessibilityNodeInfo, predicate: (AccessibilityNodeInfo) -> Boolean): AccessibilityNodeInfo? {
    if (predicate(node)) return node
    for (i in 0 until node.childCount) {
      val child = node.getChild(i) ?: continue
      val found = findFirst(child, predicate)
      if (found != null) return found
    }
    return null
  }
}
