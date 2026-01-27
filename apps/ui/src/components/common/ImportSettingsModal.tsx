import { useEffect, useRef } from 'react';
import { Button } from './Button';

interface ImportSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  filename: string;
  warnings?: string[];
  error?: string;
  loading?: boolean;
}

export function ImportSettingsModal({
  isOpen,
  onClose,
  onConfirm,
  filename,
  warnings = [],
  error,
  loading = false,
}: ImportSettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap and initial focus
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    // Store previously focused element
    const previouslyFocused = document.activeElement as HTMLElement;

    // Focus the close button initially
    closeButtonRef.current?.focus();

    // Focus trap
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !modalRef.current) return;

      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      // Restore focus when modal closes
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isErrorMode = !!error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-figma-bg border-figma-border w-[400px] rounded border p-4 shadow-lg"
      >
        <h2 id="modal-title" className="text-figma-text mb-4 text-base font-semibold">
          {isErrorMode ? 'Import Error' : 'Import Settings'}
        </h2>

        {isErrorMode ? (
          <div className="mb-4">
            <div className="text-figma-text-secondary mb-2 flex items-center gap-1 text-xs font-medium">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-red-500"
              >
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M8 5V9M8 11H8.01"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Error
            </div>
            <p className="text-figma-text-secondary text-xs">{error}</p>
          </div>
        ) : (
          <>
            <div className="text-figma-text-secondary mb-4 text-xs">
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Processing settings...
                </div>
              ) : (
                <>
                  Ready to import settings from:
                  <div className="text-figma-text mt-1 font-mono">{filename}</div>
                </>
              )}
            </div>

            {warnings.length > 0 && !loading && (
              <div className="mb-4">
                <div className="text-figma-text-secondary mb-2 flex items-center gap-1 text-xs font-medium">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-figma-warning"
                  >
                    <path
                      d="M8 11V8M8 5H8.01"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  Warnings:
                </div>
                <ul className="text-figma-text-secondary ml-5 list-disc space-y-1 text-xs">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            {!loading && (
              <div className="text-figma-text-secondary mb-4 text-xs">
                This will replace your current settings.
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-2">
          <Button ref={closeButtonRef} variant="secondary" onClick={onClose}>
            {isErrorMode ? 'Close' : 'Cancel'}
          </Button>
          {!isErrorMode && onConfirm && (
            <Button variant="primary" onClick={onConfirm} disabled={loading}>
              Import
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
