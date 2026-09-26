import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { buildUITree } from './tree';

export type AccessibilityNodeInfo = {
  id: string;
  className: string;
  text: string;
  contentDescription: string;
  resourceId: string;
  packageName: string;
  classNameShort: string;
  clickable: boolean;
  editable: boolean;
  scrollable: boolean;
  focusable: boolean;
  enabled: boolean;
  checkable: boolean;
  checked: boolean;
  selected: boolean;
  focused: boolean;
  password: boolean;
  longClickable: boolean;
  bounds: { left: number; top: number; right: number; bottom: number };
  children: AccessibilityNodeInfo[];
  depth: number;
};

export type UITree = {
  root: AccessibilityNodeInfo;
  timestamp: number;
  packageName: string;
  activityName: string;
  flatNodes: FlatNode[];
};

export type FlatNode = {
  id: string;
  text: string;
  description: string;
  resourceId: string;
  className: string;
  clickable: boolean;
  editable: boolean;
  scrollable: boolean;
  enabled: boolean;
  bounds: { left: number; top: number; right: number; bottom: number };
  depth: number;
  index: number;
};

export type ActionType =
  | 'tap_text'
  | 'tap_description'
  | 'tap_id'
  | 'tap_bounds'
  | 'type'
  | 'scroll'
  | 'back'
  | 'home'
  | 'recent'
  | 'long_press'
  | 'wait_for'
  | 'read_text'
  | 'swipe'
  | 'double_tap';

export type ActionRequest = {
  type: ActionType;
  target?: string;
  text?: string;
  resourceId?: string;
  bounds?: { left: number; top: number; right: number; bottom: number };
  direction?: 'up' | 'down' | 'left' | 'right';
  timeoutMs?: number;
};

export type ActionResponse = {
  success: boolean;
  error?: string;
  tree?: UITree;
  text?: string;
  durationMs: number;
};

export type ServiceStatus = {
  enabled: boolean;
  installed: boolean;
  permissionGranted: boolean;
};

const EMPTY_TREE: UITree = {
  root: {
    id: '0',
    className: 'android.view.View',
    text: '',
    contentDescription: '',
    resourceId: '',
    packageName: '',
    classNameShort: 'View',
    clickable: false,
    editable: false,
    scrollable: false,
    focusable: false,
    enabled: true,
    checkable: false,
    checked: false,
    selected: false,
    focused: false,
    password: false,
    longClickable: false,
    bounds: { left: 0, top: 0, right: 0, bottom: 0 },
    children: [],
    depth: 0,
  },
  timestamp: 0,
  packageName: '',
  activityName: '',
  flatNodes: [],
};

let AccessibilityBridge: any = null;
if (Platform.OS === 'android') {
  try { AccessibilityBridge = requireOptionalNativeModule('AuraAccessibilityService'); } catch {}
}

export async function getServiceStatus(): Promise<ServiceStatus> {
  if (!AccessibilityBridge) {
    return { enabled: false, installed: false, permissionGranted: false };
  }
  try {
    return await AccessibilityBridge.getStatus();
  } catch {
    return { enabled: false, installed: false, permissionGranted: false };
  }
}

export async function openAccessibilitySettings(): Promise<void> {
  if (AccessibilityBridge) {
    await AccessibilityBridge.openSettings();
  }
}

export async function captureUITree(): Promise<UITree> {
  if (!AccessibilityBridge) {
    return EMPTY_TREE;
  }

  try {
    const raw = await AccessibilityBridge.getRootInActiveWindow();
    return buildUITree(raw.root, raw.packageName, raw.activityName);
  } catch {
    return EMPTY_TREE;
  }
}

export async function performAction(request: ActionRequest): Promise<ActionResponse> {
  const start = Date.now();

  if (!AccessibilityBridge) {
    return {
      success: false,
      error: 'AccessibilityService not available',
      durationMs: Date.now() - start,
    };
  }

  try {
    const result = await AccessibilityBridge.performAction(request);
    return { ...result, durationMs: Date.now() - start };
  } catch (e: any) {
    return {
      success: false,
      error: e?.message || 'Action failed',
      durationMs: Date.now() - start,
    };
  }
}

export async function findNode(
  tree: UITree,
  matcher: (node: FlatNode) => boolean,
): Promise<FlatNode | null> {
  for (const node of tree.flatNodes) {
    if (matcher(node)) return node;
  }
  return null;
}

export async function findNodes(
  tree: UITree,
  matcher: (node: FlatNode) => boolean,
): Promise<FlatNode[]> {
  return tree.flatNodes.filter(matcher);
}
