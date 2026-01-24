import type { PluginMessage, UIMessage } from '@shared/types';

/**
 * Sends a message to the plugin backend.
 */
export function postMessage(message: PluginMessage): void {
  parent.postMessage({ pluginMessage: message }, '*');
}

/**
 * Sets up a message listener for messages from the plugin backend.
 */
export function onMessage(callback: (message: UIMessage) => void): () => void {
  const handler = (event: MessageEvent<{ pluginMessage: UIMessage }>) => {
    if (event.data.pluginMessage) {
      callback(event.data.pluginMessage);
    }
  };

  window.addEventListener('message', handler);

  // Return cleanup function
  return () => {
    window.removeEventListener('message', handler);
  };
}
