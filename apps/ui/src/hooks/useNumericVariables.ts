import { useState, useEffect } from 'react';
import { usePluginMessage } from './usePluginMessage';
import type { NumericVariableInfo } from '@figma-vex/shared';

/**
 * Hook for fetching numeric variables from the plugin.
 */
export function useNumericVariables() {
  const [variables, setVariables] = useState<NumericVariableInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { sendMessage, listenToMessage } = usePluginMessage();

  useEffect(() => {
    // Request numeric variables on mount
    sendMessage({ type: 'get-numeric-variables' });

    // Listen for numeric variables list
    const cleanup = listenToMessage((message) => {
      if (message.type === 'numeric-variables-list') {
        setVariables(message.variables);
        setLoading(false);
      }
    });

    return cleanup;
  }, [sendMessage, listenToMessage]);

  return {
    variables,
    loading,
  };
}
