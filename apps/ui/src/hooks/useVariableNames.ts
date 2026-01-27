import { useState, useEffect } from 'react';
import { usePluginMessage } from './usePluginMessage';

/**
 * Hook for fetching all variable names from the plugin.
 */
export function useVariableNames() {
  const [variableNames, setVariableNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { sendMessage, listenToMessage } = usePluginMessage();

  useEffect(() => {
    // Request variable names on mount
    sendMessage({ type: 'get-variable-names' });

    // Listen for variable names list
    const cleanup = listenToMessage((message) => {
      if (message.type === 'variable-names-list') {
        setVariableNames(message.names);
        setLoading(false);
      }
    });

    return cleanup;
  }, [sendMessage, listenToMessage]);

  return {
    variableNames,
    loading,
  };
}
