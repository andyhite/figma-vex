import { toCssName } from '@plugin/formatters/nameFormatter';

/**
 * Natural sort comparator that handles numeric segments properly.
 * "1", "2", "10" sorts as 1, 2, 10 (not 1, 10, 2)
 */
export function naturalCompare(a: string, b: string): number {
  const regex = /(\d+)|(\D+)/g;
  const aParts = a.match(regex) || [];
  const bParts = b.match(regex) || [];

  const len = Math.min(aParts.length, bParts.length);
  for (let i = 0; i < len; i++) {
    const aPart = aParts[i];
    const bPart = bParts[i];

    const aNum = parseInt(aPart, 10);
    const bNum = parseInt(bPart, 10);

    // Both are numbers - compare numerically
    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) {
        return aNum - bNum;
      }
    } else {
      // At least one is not a number - compare as strings
      const cmp = aPart.localeCompare(bPart);
      if (cmp !== 0) {
        return cmp;
      }
    }
  }

  // If all compared parts are equal, shorter string comes first
  return aParts.length - bParts.length;
}

/**
 * Filters collections based on selected collection IDs.
 * If no IDs specified, returns all collections.
 */
export function filterCollections(
  collections: VariableCollection[],
  selectedCollectionIds?: string[]
): VariableCollection[] {
  if (selectedCollectionIds && selectedCollectionIds.length > 0) {
    return collections.filter((c) => selectedCollectionIds.includes(c.id));
  }

  return collections;
}

/**
 * Gets variables for a collection, sorted by CSS-normalized name.
 * Use this for CSS and TypeScript exports.
 */
export function getCollectionVariables(variables: Variable[], collectionId: string): Variable[] {
  return variables
    .filter((v) => v.variableCollectionId === collectionId)
    .sort((a, b) => naturalCompare(toCssName(a.name), toCssName(b.name)));
}

/**
 * Gets variables for a collection, sorted by raw name.
 * Use this for JSON exports where path structure matters.
 */
export function getCollectionVariablesByName(
  variables: Variable[],
  collectionId: string
): Variable[] {
  return variables
    .filter((v) => v.variableCollectionId === collectionId)
    .sort((a, b) => naturalCompare(a.name, b.name));
}
