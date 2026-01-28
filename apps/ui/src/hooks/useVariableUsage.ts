import { useState, useEffect, useCallback } from 'react';
import type { VariableUsageData } from '@figma-vex/shared';
import { usePluginMessage } from './usePluginMessage';

export interface UseVariableUsageOptions {
  /** If true, only scan the current page. If false, scan entire document. */
  currentPageOnly?: boolean;
}

/**
 * Hook for fetching and managing variable usage data
 */
export function useVariableUsage() {
  const [data, setData] = useState<VariableUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { sendMessage, listenToMessage } = usePluginMessage();

  const refresh = useCallback(
    (options: UseVariableUsageOptions = {}) => {
      setIsLoading(true);
      setError(null);
      sendMessage({ type: 'get-variable-usage', currentPageOnly: options.currentPageOnly });
    },
    [sendMessage]
  );

  useEffect(() => {
    const cleanup = listenToMessage((message) => {
      if (message.type === 'variable-usage-result') {
        setData(message.data);
        setIsLoading(false);
      } else if (message.type === 'error') {
        setError(message.message);
        setIsLoading(false);
      }
    });

    return cleanup;
  }, [listenToMessage]);

  return { data, isLoading, error, refresh };
}
