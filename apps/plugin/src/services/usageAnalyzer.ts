import type {
  VariableUsageData,
  VariableUsageInfo,
  CollectionUsageInfo,
  NodeUsageLocation,
  AliasUsageLocation,
} from '@figma-vex/shared';

/**
 * Options for analyzing variable usage
 */
export interface AnalyzeUsageOptions {
  /** If true, scan only the current page. If false, scan entire document. Default: false */
  currentPageOnly?: boolean;
}

/**
 * Batch size for processing nodes - yields control back to Figma between batches
 */
const BATCH_SIZE = 500;

/**
 * Maximum number of locations to track per variable (to prevent memory issues)
 */
const MAX_LOCATIONS_PER_VARIABLE = 50;

/**
 * Fields on nodes that can have bound variables
 * Based on Figma's VariableBindableNodeField and related types
 */
const BOUND_VARIABLE_FIELDS = [
  // Node fields
  'width',
  'height',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingBottom',
  'itemSpacing',
  'counterAxisSpacing',
  'topLeftRadius',
  'topRightRadius',
  'bottomLeftRadius',
  'bottomRightRadius',
  'strokeWeight',
  'opacity',
  // Array fields (fills, strokes, effects have arrays of variable aliases)
  'fills',
  'strokes',
  'effects',
  'layoutGrids',
  // Component properties
  'componentProperties',
  // Text fields
  'textRangeFills',
] as const;

/**
 * Internal usage tracking structure
 */
interface UsageTracking {
  nodeBindings: number;
  aliasReferences: number;
  nodeLocations: NodeUsageLocation[];
  aliasLocations: AliasUsageLocation[];
}

/**
 * Get the path to a node (e.g., "Page 1 / Frame / Button")
 */
function getNodePath(node: BaseNode): string {
  const parts: string[] = [];
  let current: BaseNode | null = node;

  while (current && current.type !== 'DOCUMENT') {
    if (current.name) {
      parts.unshift(current.name);
    }
    current = current.parent;
  }

  return parts.join(' / ');
}

/**
 * Counts how many times each variable is used in the document
 */
export async function analyzeVariableUsage(
  variables: Variable[],
  collections: VariableCollection[],
  options: AnalyzeUsageOptions = {}
): Promise<VariableUsageData> {
  // Create a map from variable ID to collection name for alias lookups
  const variableCollectionMap = new Map<string, string>();
  const collectionNameMap = new Map<string, string>();

  for (const collection of collections) {
    collectionNameMap.set(collection.id, collection.name);
  }

  for (const variable of variables) {
    variableCollectionMap.set(
      variable.id,
      collectionNameMap.get(variable.variableCollectionId) || 'Unknown'
    );
  }

  // Initialize usage tracking
  const usageMap = new Map<string, UsageTracking>();

  for (const variable of variables) {
    usageMap.set(variable.id, {
      nodeBindings: 0,
      aliasReferences: 0,
      nodeLocations: [],
      aliasLocations: [],
    });
  }

  // Count node bindings by traversing nodes (with batching to prevent UI freeze)
  await countNodeBindings(usageMap, options);

  // Count alias references from other variables
  countAliasReferences(variables, usageMap, variableCollectionMap);

  // Build result grouped by collection
  return buildResult(variables, collections, usageMap);
}

/**
 * Yield control back to Figma's main thread to prevent UI freezing
 */
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Add a node location to the usage tracking
 */
function addNodeLocation(
  usageMap: Map<string, UsageTracking>,
  variableId: string,
  node: SceneNode,
  property: string
): void {
  const usage = usageMap.get(variableId);
  if (!usage) return;

  usage.nodeBindings++;

  // Only track detailed locations up to the limit
  if (usage.nodeLocations.length < MAX_LOCATIONS_PER_VARIABLE) {
    usage.nodeLocations.push({
      nodeId: node.id,
      nodeName: node.name,
      nodePath: getNodePath(node),
      nodeType: node.type,
      property,
    });
  }
}

/**
 * Process a single node's variable bindings
 */
function processNodeBindings(node: SceneNode, usageMap: Map<string, UsageTracking>): void {
  const boundVars = node.boundVariables;
  if (!boundVars) return;

  // Check each possible bound variable field
  for (const field of BOUND_VARIABLE_FIELDS) {
    const binding = boundVars[field as keyof typeof boundVars];

    if (!binding) continue;

    if (Array.isArray(binding)) {
      // Array fields (fills, strokes, effects, etc.)
      for (const item of binding) {
        if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
          addNodeLocation(usageMap, item.id, node, field);
        }
      }
    } else if (typeof binding === 'object') {
      if ('id' in binding && typeof binding.id === 'string') {
        // Single variable alias
        addNodeLocation(usageMap, binding.id, node, field);
      } else {
        // componentProperties is a record
        for (const [propName, propBinding] of Object.entries(binding)) {
          if (
            propBinding &&
            typeof propBinding === 'object' &&
            'id' in propBinding &&
            typeof propBinding.id === 'string'
          ) {
            addNodeLocation(usageMap, propBinding.id, node, `componentProperties.${propName}`);
          }
        }
      }
    }
  }
}

/**
 * Traverse nodes and count variable bindings
 * Uses batching to prevent freezing Figma's UI
 */
async function countNodeBindings(
  usageMap: Map<string, UsageTracking>,
  options: AnalyzeUsageOptions
): Promise<void> {
  // Skip invisible instance children for better performance
  const previousSkipSetting = figma.skipInvisibleInstanceChildren;
  figma.skipInvisibleInstanceChildren = true;

  try {
    // Choose scope: current page or entire document
    const root = options.currentPageOnly ? figma.currentPage : figma.root;
    const allNodes = root.findAll();

    // Process nodes in batches to prevent UI freeze
    for (let i = 0; i < allNodes.length; i += BATCH_SIZE) {
      const batchEnd = Math.min(i + BATCH_SIZE, allNodes.length);

      for (let j = i; j < batchEnd; j++) {
        processNodeBindings(allNodes[j] as SceneNode, usageMap);
      }

      // Yield control back to Figma between batches
      if (batchEnd < allNodes.length) {
        await yieldToMain();
      }
    }
  } finally {
    // Restore previous setting
    figma.skipInvisibleInstanceChildren = previousSkipSetting;
  }
}

/**
 * Count how many variables alias to each variable
 */
function countAliasReferences(
  variables: Variable[],
  usageMap: Map<string, UsageTracking>,
  variableCollectionMap: Map<string, string>
): void {
  for (const variable of variables) {
    // Check each mode's value
    for (const value of Object.values(variable.valuesByMode)) {
      // Check if value is a variable alias
      if (
        value &&
        typeof value === 'object' &&
        'type' in value &&
        value.type === 'VARIABLE_ALIAS' &&
        'id' in value
      ) {
        const targetId = value.id;
        const targetUsage = usageMap.get(targetId);
        if (targetUsage) {
          targetUsage.aliasReferences++;

          // Track the alias location if within limit
          if (targetUsage.aliasLocations.length < MAX_LOCATIONS_PER_VARIABLE) {
            targetUsage.aliasLocations.push({
              variableId: variable.id,
              variableName: variable.name,
              collectionName: variableCollectionMap.get(variable.id) || 'Unknown',
            });
          }
        }
      }
    }
  }
}

/**
 * Build the final result structure grouped by collection
 */
function buildResult(
  variables: Variable[],
  collections: VariableCollection[],
  usageMap: Map<string, UsageTracking>
): VariableUsageData {
  const collectionMap = new Map<string, CollectionUsageInfo>();

  // Initialize collections
  for (const collection of collections) {
    collectionMap.set(collection.id, {
      id: collection.id,
      name: collection.name,
      variables: [],
    });
  }

  let totalUsages = 0;

  // Add variables to their collections
  for (const variable of variables) {
    const usage = usageMap.get(variable.id) || {
      nodeBindings: 0,
      aliasReferences: 0,
      nodeLocations: [],
      aliasLocations: [],
    };
    const usageCount = usage.nodeBindings + usage.aliasReferences;
    totalUsages += usageCount;

    const variableInfo: VariableUsageInfo = {
      id: variable.id,
      name: variable.name,
      type: variable.resolvedType as 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN',
      usageCount,
      nodeBindings: usage.nodeBindings,
      aliasReferences: usage.aliasReferences,
      nodeLocations: usage.nodeLocations,
      aliasLocations: usage.aliasLocations,
    };

    const collection = collectionMap.get(variable.variableCollectionId);
    if (collection) {
      collection.variables.push(variableInfo);
    }
  }

  // Sort variables within each collection by name
  for (const collection of collectionMap.values()) {
    collection.variables.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }

  // Convert to array and sort collections by name
  const collectionsArray = Array.from(collectionMap.values())
    .filter((c) => c.variables.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    collections: collectionsArray,
    totalVariables: variables.length,
    totalUsages,
  };
}
