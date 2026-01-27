import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExportListener } from './useExportListener';
import type { UIMessage } from '@figma-vex/shared';

// Mock the dependencies
const mockSendMessage = vi.fn();
const mockListenToMessage = vi.fn();
const mockCopyToClipboard = vi.fn();

vi.mock('./usePluginMessage', () => ({
  usePluginMessage: () => ({
    sendMessage: mockSendMessage,
    listenToMessage: mockListenToMessage,
  }),
}));

vi.mock('./useClipboard', () => ({
  useClipboard: () => ({
    copyToClipboard: mockCopyToClipboard,
  }),
}));

describe('useExportListener', () => {
  let messageHandler: ((message: UIMessage) => void) | null = null;
  let cleanupFn: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    messageHandler = null;
    cleanupFn = null;

    // Capture the message handler when listenToMessage is called
    mockListenToMessage.mockImplementation((handler: (message: UIMessage) => void) => {
      messageHandler = handler;
      cleanupFn = vi.fn();
      return cleanupFn;
    });
  });

  it('should initialize with empty output and info status', () => {
    const { result } = renderHook(() =>
      useExportListener({
        resultType: 'css-result',
        filename: 'variables.css',
        mimeType: 'text/css',
      })
    );

    expect(result.current.output).toBe('');
    expect(result.current.status.type).toBe('info');
  });

  it('should set up message listener on mount', () => {
    renderHook(() =>
      useExportListener({
        resultType: 'css-result',
        filename: 'variables.css',
        mimeType: 'text/css',
      })
    );

    expect(mockListenToMessage).toHaveBeenCalledTimes(1);
    expect(messageHandler).toBeDefined();
  });

  it('should update output when receiving css-result message', () => {
    const { result } = renderHook(() =>
      useExportListener({
        resultType: 'css-result',
        filename: 'variables.css',
        mimeType: 'text/css',
      })
    );

    act(() => {
      messageHandler?.({ type: 'css-result', css: ':root { --color: red; }' } as UIMessage);
    });

    expect(result.current.output).toBe(':root { --color: red; }');
    expect(result.current.status.type).toBe('success');
    expect(result.current.status.message).toBe('Generated successfully!');
  });

  it('should update output when receiving json-result message', () => {
    const { result } = renderHook(() =>
      useExportListener({
        resultType: 'json-result',
        filename: 'variables.json',
        mimeType: 'application/json',
      })
    );

    act(() => {
      messageHandler?.({ type: 'json-result', json: '{"color": "red"}' } as UIMessage);
    });

    expect(result.current.output).toBe('{"color": "red"}');
  });

  it('should update output when receiving typescript-result message', () => {
    const { result } = renderHook(() =>
      useExportListener({
        resultType: 'typescript-result',
        filename: 'variables.d.ts',
        mimeType: 'text/typescript',
      })
    );

    act(() => {
      messageHandler?.({
        type: 'typescript-result',
        typescript: 'export const color = "red";',
      } as UIMessage);
    });

    expect(result.current.output).toBe('export const color = "red";');
  });

  it('should set error status when receiving error message', () => {
    const { result } = renderHook(() =>
      useExportListener({
        resultType: 'css-result',
        filename: 'variables.css',
        mimeType: 'text/css',
      })
    );

    act(() => {
      messageHandler?.({ type: 'error', message: 'Something went wrong' } as UIMessage);
    });

    expect(result.current.status.type).toBe('error');
    expect(result.current.status.message).toBe('Something went wrong');
  });

  it('should ignore unrelated message types', () => {
    const { result } = renderHook(() =>
      useExportListener({
        resultType: 'css-result',
        filename: 'variables.css',
        mimeType: 'text/css',
      })
    );

    act(() => {
      messageHandler?.({ type: 'json-result', json: '{"color": "red"}' } as UIMessage);
    });

    expect(result.current.output).toBe('');
  });

  it('should provide sendMessage function', () => {
    const { result } = renderHook(() =>
      useExportListener({
        resultType: 'css-result',
        filename: 'variables.css',
        mimeType: 'text/css',
      })
    );

    expect(result.current.sendMessage).toBe(mockSendMessage);
  });

  it('should allow setting status manually', () => {
    const { result } = renderHook(() =>
      useExportListener({
        resultType: 'css-result',
        filename: 'variables.css',
        mimeType: 'text/css',
      })
    );

    act(() => {
      result.current.setStatus({ message: 'Generating...', type: 'info' });
    });

    expect(result.current.status.message).toBe('Generating...');
    expect(result.current.status.type).toBe('info');
  });

  it('should cleanup listener on unmount', () => {
    const { unmount } = renderHook(() =>
      useExportListener({
        resultType: 'css-result',
        filename: 'variables.css',
        mimeType: 'text/css',
      })
    );

    unmount();

    expect(cleanupFn).toHaveBeenCalled();
  });
});
