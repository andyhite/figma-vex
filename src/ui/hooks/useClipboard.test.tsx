import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useClipboard } from './useClipboard';

describe('useClipboard', () => {
  const originalClipboard = navigator.clipboard;
  const mockWriteText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: mockWriteText,
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
  });

  it('should return copyToClipboard function and copied state', () => {
    const { result } = renderHook(() => useClipboard());

    expect(result.current.copyToClipboard).toBeDefined();
    expect(result.current.copied).toBe(false);
  });

  it('should copy text to clipboard and set copied to true', async () => {
    vi.useRealTimers(); // Use real timers for async clipboard operations
    mockWriteText.mockResolvedValue(undefined);
    const { result } = renderHook(() => useClipboard());

    await act(async () => {
      await result.current.copyToClipboard('test text');
    });

    expect(mockWriteText).toHaveBeenCalledWith('test text');
    expect(result.current.copied).toBe(true);
  });

  it('should reset copied state after 2 seconds', async () => {
    mockWriteText.mockResolvedValue(undefined);
    const { result } = renderHook(() => useClipboard());

    // Copy text - this starts the 2 second timer
    await act(async () => {
      await result.current.copyToClipboard('test text');
    });

    expect(result.current.copied).toBe(true);

    // Advance timer past the 2 second reset
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.copied).toBe(false);
  });

  it('should use fallback method when clipboard API fails', async () => {
    vi.useRealTimers(); // Use real timers for async clipboard operations
    mockWriteText.mockRejectedValue(new Error('Clipboard API not available'));
    const mockExecCommand = vi.fn().mockReturnValue(true);
    document.execCommand = mockExecCommand;

    const { result } = renderHook(() => useClipboard());

    const createElementSpy = vi.spyOn(document, 'createElement');
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    await act(async () => {
      await result.current.copyToClipboard('test text');
    });

    expect(createElementSpy).toHaveBeenCalledWith('textarea');
    expect(appendChildSpy).toHaveBeenCalled();
    expect(mockExecCommand).toHaveBeenCalledWith('copy');
    expect(removeChildSpy).toHaveBeenCalled();
    expect(result.current.copied).toBe(true);
  });

  it('should return false when fallback method also fails', async () => {
    mockWriteText.mockRejectedValue(new Error('Clipboard API not available'));
    const mockExecCommand = vi.fn().mockImplementation(() => {
      throw new Error('execCommand failed');
    });
    document.execCommand = mockExecCommand;

    const { result } = renderHook(() => useClipboard());

    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    const success = await result.current.copyToClipboard('test text');

    expect(success).toBe(false);
    expect(removeChildSpy).toHaveBeenCalled();
    // State should remain false when copy fails
    expect(result.current.copied).toBe(false);
  });

  it('should handle fallback cleanup even if execCommand throws', async () => {
    mockWriteText.mockRejectedValue(new Error('Clipboard API not available'));
    const mockExecCommand = vi.fn().mockImplementation(() => {
      throw new Error('execCommand failed');
    });
    document.execCommand = mockExecCommand;

    const { result } = renderHook(() => useClipboard());

    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    const success = await result.current.copyToClipboard('test text');

    expect(success).toBe(false);
    expect(removeChildSpy).toHaveBeenCalled();
  });
});
