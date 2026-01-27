import { useState, useEffect, useCallback } from 'react';
import { usePluginMessage } from './usePluginMessage';
import type { CollectionInfo } from '@figma-vex/shared';

/**
 * Hook for fetching and managing variable collections.
 */
export function useCollections() {
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { sendMessage, listenToMessage } = usePluginMessage();

  useEffect(() => {
    // Request collections on mount
    sendMessage({ type: 'get-collections' });

    // Listen for collections list
    const cleanup = listenToMessage((message) => {
      if (message.type === 'collections-list') {
        setCollections(message.collections);
        // Select all collections by default
        setSelectedCollections(new Set(message.collections.map((c) => c.id)));
        setLoading(false);
      }
    });

    return cleanup;
  }, [sendMessage, listenToMessage]);

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
