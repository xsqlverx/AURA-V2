import type { AccessibilityNodeInfo, FlatNode, UITree } from './accessibility';

export type CompactNode = {
  i: number;
  t?: string;
  d?: string;
  r?: string;
  c?: string;
  cl: boolean;
  e: boolean;
  s: boolean;
  b: [number, number, number, number];
  ch?: number[];
};

export type CompactTree = {
  pkg: string;
  act: string;
  ts: number;
  nodes: CompactNode[];
};

const CLASS_SHORT_MAP: Record<string, string> = {
  'android.widget.TextView': 'Tv',
  'android.widget.Button': 'Btn',
  'android.widget.EditText': 'Et',
  'android.widget.ImageButton': 'Ib',
  'android.widget.ImageView': 'Iv',
  'android.widget.CheckBox': 'Cb',
  'android.widget.Switch': 'Sw',
  'android.widget.ScrollView': 'Sv',
  'android.widget.ListView': 'Lv',
  'android.widget.RecyclerView': 'Rv',
  'android.widget.ProgressBar': 'Pg',
  'android.widget.SeekBar': 'Sk',
  'android.widget.Spinner': 'Sp',
  'android.widget.ToggleButton': 'Tb',
  'android.view.View': 'V',
  'android.view.ViewGroup': 'Vg',
  'android.view.ViewRootImpl': 'Vr',
  'android.widget.FrameLayout': 'Fl',
  'android.widget.LinearLayout': 'Ll',
  'android.widget.RelativeLayout': 'Rl',
  'android.widget.GridLayout': 'Gl',
  'androidx.appcompat.widget.Toolbar': 'Tb',
  'com.google.android.material.appbar.AppBarLayout': 'Ab',
};

function shortClassName(cls: string): string {
  const parts = cls.split('.');
  return parts[parts.length - 1] || cls;
}

export function flattenTree(node: AccessibilityNodeInfo, depth: number = 0): FlatNode[] {
  const result: FlatNode[] = [];
  let index = 0;

  function walk(n: AccessibilityNodeInfo, d: number) {
    const flat: FlatNode = {
      id: n.id,
      text: n.text,
      description: n.contentDescription,
      resourceId: n.resourceId,
      className: CLASS_SHORT_MAP[n.className] || n.classNameShort || shortClassName(n.className),
      clickable: n.clickable,
      editable: n.editable,
      scrollable: n.scrollable,
      enabled: n.enabled,
      bounds: n.bounds,
      depth: d,
      index,
    };
    result.push(flat);
    index++;

    for (const child of n.children) {
      walk(child, d + 1);
    }
  }

  walk(node, depth);
  return result;
}

export function buildUITree(
  root: AccessibilityNodeInfo,
  packageName: string,
  activityName: string,
): UITree {
  return {
    root,
    timestamp: Date.now(),
    packageName,
    activityName,
    flatNodes: flattenTree(root),
  };
}

export function toCompact(tree: UITree): CompactTree {
  const nodes: CompactNode[] = tree.flatNodes.map((n) => {
    const compact: CompactNode = {
      i: n.index,
      cl: n.clickable,
      e: n.enabled,
      s: n.scrollable,
      b: [n.bounds.left, n.bounds.top, n.bounds.right, n.bounds.bottom],
    };
    if (n.text) compact.t = n.text;
    if (n.description) compact.d = n.description;
    if (n.resourceId) compact.r = n.resourceId;
    if (n.className) compact.c = n.className;
    if (n.editable) (compact as any).ed = true;
    return compact;
  });

  return {
    pkg: tree.packageName,
    act: tree.activityName,
    ts: tree.timestamp,
    nodes,
  };
}

export function compactToString(compact: CompactTree): string {
  return JSON.stringify(compact);
}

export function formatForLLM(tree: UITree): string {
  const lines: string[] = [];
  lines.push(`Screen: ${tree.activityName} (${tree.packageName})`);
  lines.push(`Nodes: ${tree.flatNodes.length}`);
  lines.push('');

  for (const node of tree.flatNodes) {
    if (!node.text && !node.description && !node.resourceId && !node.clickable && !node.editable && !node.scrollable) {
      continue;
    }

    const indent = '  '.repeat(Math.min(node.depth, 6));
    const parts: string[] = [];

    if (node.text) parts.push(`"${node.text}"`);
    if (node.description) parts.push(`desc="${node.description}"`);
    if (node.resourceId) parts.push(`id=${node.resourceId}`);
    if (node.clickable) parts.push('[click]');
    if (node.editable) parts.push('[edit]');
    if (node.scrollable) parts.push('[scroll]');
    if (!node.enabled) parts.push('[disabled]');

    parts.push(`@${node.bounds.left},${node.bounds.top}`);

    lines.push(`${indent}[${node.index}] ${node.className} ${parts.join(' ')}`);
  }

  return lines.join('\n');
}

export function filterInteractiveNodes(tree: UITree): FlatNode[] {
  return tree.flatNodes.filter(
    (n) => n.clickable || n.editable || n.scrollable || n.description,
  );
}

export function findNodeByText(tree: UITree, text: string): FlatNode | null {
  const lower = text.toLowerCase();
  return tree.flatNodes.find((n) => n.text.toLowerCase().includes(lower)) || null;
}

export function findNodeByDescription(tree: UITree, desc: string): FlatNode | null {
  const lower = desc.toLowerCase();
  return tree.flatNodes.find((n) => n.description.toLowerCase().includes(lower)) || null;
}

export function findNodeByResourceId(tree: UITree, resourceId: string): FlatNode | null {
  return tree.flatNodes.find((n) => n.resourceId === resourceId) || null;
}

export function findEditableNodes(tree: UITree): FlatNode[] {
  return tree.flatNodes.filter((n) => n.editable);
}

export function findClickableNodes(tree: UITree): FlatNode[] {
  return tree.flatNodes.filter((n) => n.clickable);
}

export function findScrollableNodes(tree: UITree): FlatNode[] {
  return tree.flatNodes.filter((n) => n.scrollable);
}

export function nodeCenter(node: FlatNode): { x: number; y: number } {
  return {
    x: Math.round((node.bounds.left + node.bounds.right) / 2),
    y: Math.round((node.bounds.top + node.bounds.bottom) / 2),
  };
}

export function nodeArea(node: FlatNode): number {
  return (node.bounds.right - node.bounds.left) * (node.bounds.bottom - node.bounds.top);
}
