import { useState, useEffect } from 'react';
import { usePluginMessage } from './usePluginMessage';
import type { StyleSummary } from '@figma-vex/shared';

/**
 * Hook for fetching style counts from the plugin.
 */
export function useStyles() {
  const [styleCounts, setStyleCounts] = useState<StyleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const { sendMessage, listenToMessage } = usePluginMessage();

  useEffect(() => {
    // Request styles on mount
    sendMessage({ type: 'get-styles' });

    // Listen for styles list
    const cleanup = listenToMessage((message) => {
      if (message.type === 'styles-list') {
        setStyleCounts(message.styles);
        setLoading(false);
      }
    });

    return cleanup;
  }, [sendMessage, listenToMessage]);

  const totalStyles = styleCounts
    ? styleCounts.paintCount +
      styleCounts.textCount +
      styleCounts.effectCount +
      styleCounts.gridCount
    : 0;

  return {
    styleCounts,
    totalStyles,
    loading,
  };
}
