import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWindowResize } from './useWindowResize';
import * as usePluginMessage from './usePluginMessage';

vi.mock('./usePluginMessage');

describe('useWindowResize', () => {
  const mockSendMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(usePluginMessage, 'usePluginMessage').mockReturnValue({
      sendMessage: mockSendMessage,
      listenToMessage: vi.fn(() => vi.fn()),
    });
  });

  it('should return resizeWindow function', () => {
    const { result } = renderHook(() => useWindowResize());

    expect(result.current.resizeWindow).toBeDefined();
    expect(typeof result.current.resizeWindow).toBe('function');
  });

  it('should send resize-window message with height', () => {
    const { result } = renderHook(() => useWindowResize());

    result.current.resizeWindow(500);

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: 'resize-window',
      height: 500,
    });
  });

  it('should send resize-window message with height and width', () => {
    const { result } = renderHook(() => useWindowResize());

    result.current.resizeWindow(500, 400);

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: 'resize-window',
      height: 500,
      width: 400,
    });
  });

  it('should maintain stable function reference across renders', () => {
    const { result, rerender } = renderHook(() => useWindowResize());

    const firstResizeWindow = result.current.resizeWindow;

    rerender();

    expect(result.current.resizeWindow).toBe(firstResizeWindow);
  });
});
