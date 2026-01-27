import { useCallback } from 'react';
import { postMessage, onMessage } from '../services/pluginBridge';
import type { PluginMessage, UIMessage } from '@figma-vex/shared';

/**
 * Hook for sending and receiving messages from the plugin backend.
 */
export function usePluginMessage() {
  const sendMessage = useCallback((message: PluginMessage) => {
    postMessage(message);
  }, []);

  const listenToMessage = useCallback((callback: (message: UIMessage) => void) => {
    return onMessage(callback);
  }, []);

  return { sendMessage, listenToMessage };
}
