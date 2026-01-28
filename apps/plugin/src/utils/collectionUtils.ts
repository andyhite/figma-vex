import { toCssName } from '@plugin/formatters/nameFormatter';

/**
 * Filters collections based on selected collection IDs.
 * If no IDs specified, returns all collections.
 */
export function filterCollections(
  collections: VariableCollection[],
  selectedCollectionIds?: string[]
): VariableCollection[] {
  console.log(
    '[filterCollections] Input collections:',
    collections.map((c) => `${c.name} (${c.id})`)
  );
  console.log('[filterCollections] Selected IDs:', selectedCollectionIds);

  if (selectedCollectionIds && selectedCollectionIds.length > 0) {
    const filtered = collections.filter((c) => selectedCollectionIds.includes(c.id));
    console.log(
      '[filterCollections] Filtered result:',
      filtered.map((c) => c.name)
    );
    return filtered;
  }

  console.log('[filterCollections] No filter applied, returning all collections');
  return collections;
}

/**
 * Gets variables for a collection, sorted by CSS-normalized name.
 * Use this for CSS and TypeScript exports.
 */
export function getCollectionVariables(variables: Variable[], collectionId: string): Variable[] {
  return variables
    .filter((v) => v.variableCollectionId === collectionId)
    .sort((a, b) => toCssName(a.name).localeCompare(toCssName(b.name)));
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
    .sort((a, b) => a.name.localeCompare(b.name));
}
