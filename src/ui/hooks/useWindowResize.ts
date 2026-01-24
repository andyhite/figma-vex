import { useCallback } from 'react';
import { usePluginMessage } from './usePluginMessage';

/**
 * Hook for resizing the plugin window dynamically.
 */
export function useWindowResize() {
  const { sendMessage } = usePluginMessage();

  const resizeWindow = useCallback(
    (height: number, width?: number) => {
      sendMessage({ type: 'resize-window', height, width });
    },
    [sendMessage]
  );

  return { resizeWindow };
}
