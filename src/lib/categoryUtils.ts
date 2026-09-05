import { Category } from '../types';

export interface CategoryTreeNode {
  category: Category;
  depth: number;
  children: CategoryTreeNode[];
  pathString: string;
}

export interface FlattenedCategoryOption {
  category: Category;
  depth: number;
  pathString: string;
  hasChildren: boolean;
}

/**
 * Returns the breadcrumb ancestry of a category from root down to the target category.
 */
export function getCategoryPath(
  categoryId: string | undefined | null,
  categories: Category[]
): Category[] {
  if (!categoryId) return [];

  const categoryMap = new Map<string, Category>();
  categories.forEach((cat) => categoryMap.set(cat.id, cat));

  const path: Category[] = [];
  const visited = new Set<string>();
  let currentId: string | undefined | null = categoryId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const cat = categoryMap.get(currentId);
    if (!cat) break;
    path.unshift(cat);
    currentId = cat.parentId;
  }

  return path;
}

/**
 * Returns a human-friendly breadcrumb string, e.g. "دانشگاه « ترم اول « درس ریاضی"
 */
export function getCategoryPathString(
  categoryId: string | undefined | null,
  categories: Category[],
  separator = ' « '
): string {
  const path = getCategoryPath(categoryId, categories);
  if (path.length === 0) return '';
  return path.map((c) => c.name).join(separator);
}

/**
 * Returns all descendant category IDs including the starting category itself.
 */
export function getCategoryDescendantIds(
  categoryId: string,
  categories: Category[]
): string[] {
  const result = new Set<string>([categoryId]);
  const queue = [categoryId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = categories.filter((c) => c.parentId === current);
    for (const child of children) {
      if (!result.has(child.id)) {
        result.add(child.id);
        queue.push(child.id);
      }
    }
  }

  return Array.from(result);
}

/**
 * Builds a nested hierarchical tree from a flat list of categories.
 */
export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const nodeMap = new Map<string, CategoryTreeNode>();
  const rootNodes: CategoryTreeNode[] = [];

  // Create node map
  categories.forEach((cat) => {
    nodeMap.set(cat.id, {
      category: cat,
      depth: 0,
      children: [],
      pathString: '',
    });
  });

  // Link children & identify roots
  categories.forEach((cat) => {
    const node = nodeMap.get(cat.id)!;
    node.pathString = getCategoryPathString(cat.id, categories);

    if (cat.parentId && nodeMap.has(cat.parentId)) {
      const parentNode = nodeMap.get(cat.parentId)!;
      parentNode.children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  // Calculate depths recursively
  function assignDepth(nodes: CategoryTreeNode[], currentDepth: number) {
    nodes.forEach((n) => {
      n.depth = currentDepth;
      assignDepth(n.children, currentDepth + 1);
    });
  }

  assignDepth(rootNodes, 0);
  return rootNodes;
}

/**
 * Flattens the tree into a depth-ordered array suitable for <select> options or indented lists.
 */
export function getFlattenedCategoryTree(
  categories: Category[],
  indentPrefix = '— '
): FlattenedCategoryOption[] {
  const tree = buildCategoryTree(categories);
  const result: FlattenedCategoryOption[] = [];

  function traverse(nodes: CategoryTreeNode[]) {
    nodes.forEach((node) => {
      result.push({
        category: node.category,
        depth: node.depth,
        pathString: node.pathString,
        hasChildren: node.children.length > 0,
      });
      if (node.children.length > 0) {
        traverse(node.children);
      }
    });
  }

  traverse(tree);
  return result;
}

/**
 * Calculate total note count for a category plus all its subcategories recursively.
 */
export function getTotalCategoryNoteCount(
  categoryId: string,
  categories: Category[],
  categoryCounts: Record<string, number>
): number {
  const allIds = getCategoryDescendantIds(categoryId, categories);
  return allIds.reduce((sum, id) => sum + (categoryCounts[id] || 0), 0);
}

/**
 * Validates whether a candidate can be selected as parent of targetId (prevents circular loops).
 */
export function canBeParentCategory(
  targetId: string | null | undefined,
  candidateParentId: string | null | undefined,
  categories: Category[]
): boolean {
  if (!targetId) return true;
  if (!candidateParentId) return true;
  if (targetId === candidateParentId) return false;

  const descendantIds = getCategoryDescendantIds(targetId, categories);
  return !descendantIds.includes(candidateParentId);
}
