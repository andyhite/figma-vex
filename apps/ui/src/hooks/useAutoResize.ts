import { useEffect, useRef } from 'react';
import { useWindowResize } from './useWindowResize';

/**
 * Hook that automatically resizes the window to exactly match the content height.
 * Measures the content container and resizes the window to fit precisely.
 */
export function useAutoResize(deps: unknown[] = []) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resizeWindow } = useWindowResize();
  const lastHeightRef = useRef<number>(0);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const measureAndResize = () => {
      // Use getBoundingClientRect to get the actual rendered height
      // This is more accurate than scrollHeight for measuring visible content
      const rect = container.getBoundingClientRect();
      const contentHeight = Math.ceil(rect.height);

      // Set a reasonable maximum height (800px) - beyond this, scrolling will be required
      const MAX_HEIGHT = 800;
      const height = Math.min(contentHeight, MAX_HEIGHT);

      // Only resize if the height actually changed (prevents infinite loops)
      if (height !== lastHeightRef.current && height > 0) {
        lastHeightRef.current = height;
        resizeWindow(height);
      }
    };

    // Debounced resize function to batch rapid changes
    const debouncedResize = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = window.setTimeout(measureAndResize, 50);
    };

    // Initial measurement after a short delay to ensure DOM is ready
    const initialTimeout = window.setTimeout(measureAndResize, 100);

    // Watch for content size changes using ResizeObserver
    // This fires when the content's actual size changes
    const resizeObserver = new ResizeObserver(() => {
      debouncedResize();
    });

    resizeObserver.observe(container);

    // Watch for DOM mutations (like when output appears/disappears or tabs change)
    const mutationObserver = new MutationObserver(() => {
      debouncedResize();
    });

    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: false, // Don't watch attributes to reduce noise
    });

    return () => {
      clearTimeout(initialTimeout);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resizeWindow, ...deps]);

  return containerRef;
}
