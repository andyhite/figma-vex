import { useState, useEffect, useCallback, useRef } from 'react';
import { usePluginMessage } from './usePluginMessage';
import type { CollectionInfo } from '@figma-vex/shared';

interface UseCollectionsOptions {
  /** Initial selected collection IDs to restore from saved settings */
  initialSelectedCollections?: string[];
}

/**
 * Hook for fetching and managing variable collections.
 */
export function useCollections(options: UseCollectionsOptions = {}) {
  const { initialSelectedCollections } = options;
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { sendMessage, listenToMessage } = usePluginMessage();

  // Track if we've applied initial selections
  const hasAppliedInitial = useRef(false);

  useEffect(() => {
    // Request collections on mount
    sendMessage({ type: 'get-collections' });

    // Listen for collections list
    const cleanup = listenToMessage((message) => {
      if (message.type === 'collections-list') {
        setCollections(message.collections);

        // If we have initial selections from saved settings and haven't applied them yet,
        // use them (filtered to only include valid collection IDs)
        if (initialSelectedCollections && !hasAppliedInitial.current) {
          const validIds = new Set(message.collections.map((c) => c.id));
          const restoredSelections = initialSelectedCollections.filter((id) => validIds.has(id));
          // Only use restored selections if there are any valid ones
          if (restoredSelections.length > 0) {
            setSelectedCollections(new Set(restoredSelections));
          } else {
            // Fall back to selecting all collections
            setSelectedCollections(new Set(message.collections.map((c) => c.id)));
          }
          hasAppliedInitial.current = true;
        } else if (!hasAppliedInitial.current) {
          // No initial selections, select all collections by default
          setSelectedCollections(new Set(message.collections.map((c) => c.id)));
          hasAppliedInitial.current = true;
        }

        setLoading(false);
      }
    });

    return cleanup;
  }, [sendMessage, listenToMessage, initialSelectedCollections]);

  const toggleCollection = useCallback((collectionId: string) => {
    setSelectedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });
  }, []);

  return {
    collections,
    selectedCollections: Array.from(selectedCollections),
    toggleCollection,
    loading,
  };
}
