import { useState, useCallback } from 'react';
import { useClipboard } from './useClipboard';

export type StatusType = 'success' | 'error' | 'info';

export interface Status {
  message: string;
  type: StatusType;
}

interface UseOutputActionsOptions {
  filename: string;
  mimeType: string;
}

/**
 * Hook for handling copy and download actions for export output.
 * Fixes the race condition bug where copied state was used instead of the return value.
 */
export function useOutputActions({ filename, mimeType }: UseOutputActionsOptions) {
  const { copyToClipboard } = useClipboard();
  const [status, setStatus] = useState<Status>({ message: '', type: 'info' });

  const handleCopy = useCallback(
    async (output: string) => {
      if (!output) return;

      const success = await copyToClipboard(output);
      setStatus({
        message: success ? 'Copied to clipboard!' : 'Failed to copy',
        type: success ? 'success' : 'error',
      });
      setTimeout(() => setStatus({ message: '', type: 'info' }), 3000);
    },
    [copyToClipboard]
  );

  const handleDownload = useCallback(
    (output: string) => {
      if (!output) return;

      const blob = new Blob([output], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus({ message: 'Downloaded!', type: 'success' });
      setTimeout(() => setStatus({ message: '', type: 'info' }), 3000);
    },
    [filename, mimeType]
  );

  return { handleCopy, handleDownload, status, setStatus };
}
