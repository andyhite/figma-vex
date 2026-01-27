import { useState, useCallback, useEffect } from 'react';
import { usePluginMessage } from './usePluginMessage';
import { useOutputActions, type Status } from './useOutputActions';
import type { UIMessage } from '@figma-vex/shared';

/**
 * Result message types that contain export output
 */
type ExportResultType = 'css-result' | 'scss-result' | 'json-result' | 'typescript-result';

/**
 * Maps result types to their output property names
 */
const resultPropertyMap: Record<ExportResultType, string> = {
  'css-result': 'css',
  'scss-result': 'scss',
  'json-result': 'json',
  'typescript-result': 'typescript',
};

interface UseExportListenerOptions {
  /** The message type to listen for (e.g., 'css-result') */
  resultType: ExportResultType;
  /** Filename for download */
  filename: string;
  /** MIME type for download */
  mimeType: string;
}

interface UseExportListenerReturn {
  /** The current output string */
  output: string;
  /** Current status (message and type) */
  status: Status;
  /** Manually set status */
  setStatus: (status: Status) => void;
  /** Copy output to clipboard */
  handleCopy: (output: string) => Promise<void>;
  /** Download output as file */
  handleDownload: (output: string) => void;
  /** Send a message to the plugin */
  sendMessage: ReturnType<typeof usePluginMessage>['sendMessage'];
}

/**
 * Hook for handling export result messages with common patterns.
 *
 * Extracts the duplicated message listener logic from export tabs:
 * - Listens for specific result type and error messages
 * - Manages output state
 * - Provides status management
 * - Provides copy/download actions
 *
 * @example
 * ```tsx
 * const { output, status, setStatus, handleCopy, handleDownload, sendMessage } = useExportListener({
 *   resultType: 'css-result',
 *   filename: 'variables.css',
 *   mimeType: 'text/css',
 * });
 *
 * const handleExport = useCallback(() => {
 *   sendMessage({ type: 'export-css', options });
 *   setStatus({ message: 'Generating...', type: 'info' });
 * }, [sendMessage, setStatus, options]);
 * ```
 */
export function useExportListener({
  resultType,
  filename,
  mimeType,
}: UseExportListenerOptions): UseExportListenerReturn {
  const [output, setOutput] = useState('');
  const { sendMessage, listenToMessage } = usePluginMessage();
  const { handleCopy, handleDownload, status, setStatus } = useOutputActions({
    filename,
    mimeType,
  });

  // Get the property name to extract from the result message
  const outputProperty = resultPropertyMap[resultType];

  // Listen for export results
  const handleMessage = useCallback(
    (message: UIMessage) => {
      if (message.type === resultType) {
        // Extract output from the correct property (cast to any for dynamic property access)
        const messageOutput = (message as Record<string, unknown>)[outputProperty];
        if (typeof messageOutput === 'string') {
          setOutput(messageOutput);
          setStatus({ message: 'Generated successfully!', type: 'success' });
        }
      } else if (message.type === 'error') {
        setStatus({ message: message.message, type: 'error' });
      }
    },
    [resultType, outputProperty, setStatus]
  );

  // Set up message listener
  useEffect(() => {
    const cleanup = listenToMessage(handleMessage);
    return cleanup;
  }, [listenToMessage, handleMessage]);

  return {
    output,
    status,
    setStatus,
    handleCopy,
    handleDownload,
    sendMessage,
  };
}
