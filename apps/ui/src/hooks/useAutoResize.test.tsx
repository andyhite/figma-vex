import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, render, act } from '@testing-library/react';
import { useAutoResize } from './useAutoResize';
import * as useWindowResize from './useWindowResize';

vi.mock('./useWindowResize');

// Test component that properly attaches the ref
function TestComponent({
  height = 500,
  deps = [] as unknown[],
}: {
  height?: number;
  deps?: unknown[];
}) {
  const ref = useAutoResize(deps);

  return <div ref={ref} data-testid="container" style={{ height: `${height}px` }} />;
}

describe('useAutoResize', () => {
  const mockResizeWindow = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.spyOn(useWindowResize, 'useWindowResize').mockReturnValue({
      resizeWindow: mockResizeWindow,
    });

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => {
      return {
        observe: vi.fn(),
        disconnect: vi.fn(),
        unobserve: vi.fn(),
      };
    });

    // Mock MutationObserver
    global.MutationObserver = vi.fn().mockImplementation(() => {
      return {
        observe: vi.fn(),
        disconnect: vi.fn(),
        takeRecords: vi.fn(() => []),
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return a ref', () => {
    const { result } = renderHook(() => useAutoResize());

    expect(result.current).toBeDefined();
    expect(result.current.current).toBeNull();
  });

  it('should resize window when container height changes', () => {
    // Mock getBoundingClientRect on Element prototype
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      height: 500,
      width: 300,
      top: 0,
      left: 0,
      bottom: 500,
      right: 300,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    } as DOMRect);

    render(<TestComponent height={500} />);

    // Advance timers to trigger initial measurement (100ms delay)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(mockResizeWindow).toHaveBeenCalledWith(500);

    // Restore
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('should cap height at MAX_HEIGHT (1280px)', () => {
    // Mock getBoundingClientRect on Element prototype with height > MAX_HEIGHT
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      height: 1500,
      width: 300,
      top: 0,
      left: 0,
      bottom: 1500,
      right: 300,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    } as DOMRect);

    render(<TestComponent height={1500} />);

    // Advance timers to trigger initial measurement (100ms delay)
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should be capped at 1280
    expect(mockResizeWindow).toHaveBeenCalledWith(1280);

    // Restore
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('should not resize if height has not changed', () => {
    const { result } = renderHook(() => useAutoResize());

    const container = document.createElement('div');
    document.body.appendChild(container);
    result.current.current = container;

    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      height: 500,
      width: 300,
      top: 0,
      left: 0,
      bottom: 500,
      right: 300,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    } as DOMRect);

    const resizeObserverCallback = (global.ResizeObserver as unknown as ReturnType<typeof vi.fn>)
      .mock.calls[0]?.[0];
    if (resizeObserverCallback) {
      resizeObserverCallback();
    }

    vi.advanceTimersByTime(100);
    mockResizeWindow.mockClear();

    // Trigger again with same height
    if (resizeObserverCallback) {
      resizeObserverCallback();
    }

    vi.advanceTimersByTime(100);

    expect(mockResizeWindow).not.toHaveBeenCalled();
  });

  it('should debounce rapid resize events', () => {
    // Mock getBoundingClientRect
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    const mockGetBoundingClientRect = vi.fn().mockReturnValue({
      height: 500,
      width: 300,
      top: 0,
      left: 0,
      bottom: 500,
      right: 300,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    } as DOMRect);
    Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;

    render(<TestComponent height={500} />);

    // Clear initial call after initial measurement
    act(() => {
      vi.advanceTimersByTime(200);
    });
    mockResizeWindow.mockClear();

    // Change the mocked height
    mockGetBoundingClientRect.mockReturnValue({
      height: 600,
      width: 300,
      top: 0,
      left: 0,
      bottom: 600,
      right: 300,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    } as DOMRect);

    // Get the ResizeObserver callback
    const resizeObserverCallback = (global.ResizeObserver as unknown as ReturnType<typeof vi.fn>)
      .mock.calls[0]?.[0];

    // Trigger multiple rapid events
    act(() => {
      if (resizeObserverCallback) {
        resizeObserverCallback();
        vi.advanceTimersByTime(20);
        resizeObserverCallback();
        vi.advanceTimersByTime(20);
        resizeObserverCallback();
      }
    });

    // Should not be called yet (debounced)
    expect(mockResizeWindow).not.toHaveBeenCalled();

    // Advance past debounce period (50ms)
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // Should only be called once after debounce period
    expect(mockResizeWindow).toHaveBeenCalledTimes(1);

    // Restore
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('should cleanup observers on unmount', () => {
    const mockDisconnect = vi.fn();
    const mockObserve = vi.fn();
    const mockResizeObserver = vi.fn().mockImplementation(() => ({
      observe: mockObserve,
      disconnect: mockDisconnect,
      unobserve: vi.fn(),
    }));
    global.ResizeObserver = mockResizeObserver;

    const mockMutationDisconnect = vi.fn();
    const mockMutationObserve = vi.fn();
    const mockMutationObserver = vi.fn().mockImplementation(() => ({
      observe: mockMutationObserve,
      disconnect: mockMutationDisconnect,
      takeRecords: vi.fn(() => []),
    }));
    global.MutationObserver = mockMutationObserver;

    // Mock getBoundingClientRect
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      height: 500,
      width: 300,
      top: 0,
      left: 0,
      bottom: 500,
      right: 300,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    } as DOMRect);

    const { unmount } = render(<TestComponent height={500} />);

    // Advance timers to ensure effect runs and observers are set up
    act(() => {
      vi.advanceTimersByTime(10);
    });

    // Verify observers were created and observe was called
    expect(mockObserve).toHaveBeenCalled();
    expect(mockMutationObserve).toHaveBeenCalled();

    unmount();

    // Verify cleanup was called
    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockMutationDisconnect).toHaveBeenCalled();

    // Restore
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('should handle missing container gracefully', () => {
    renderHook(() => useAutoResize());

    // Ref is null, should not throw
    expect(() => {
      const resizeObserverCallback = (global.ResizeObserver as unknown as ReturnType<typeof vi.fn>)
        .mock.calls[0]?.[0];
      if (resizeObserverCallback) {
        resizeObserverCallback();
      }
      vi.advanceTimersByTime(100);
    }).not.toThrow();
  });

  it('should re-run when dependencies change', () => {
    const { result, rerender } = renderHook(({ deps }) => useAutoResize(deps), {
      initialProps: { deps: ['tab1'] },
    });

    // Set up container
    const container = document.createElement('div');
    document.body.appendChild(container);
    result.current.current = container;

    vi.advanceTimersByTime(10);
    const initialResizeObserver = (global.ResizeObserver as unknown as ReturnType<typeof vi.fn>)
      .mock.calls.length;

    // Update container ref for new render
    result.current.current = container;
    rerender({ deps: ['tab2'] });
    vi.advanceTimersByTime(10);

    // Should create new observers (effect re-runs)
    expect(
      (global.ResizeObserver as unknown as ReturnType<typeof vi.fn>).mock.calls.length
    ).toBeGreaterThan(initialResizeObserver);
  });
});
