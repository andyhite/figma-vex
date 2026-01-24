import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePluginMessage } from './usePluginMessage';
import * as pluginBridge from '../services/pluginBridge';
import type { PluginMessage, UIMessage } from '@shared/types';

vi.mock('../services/pluginBridge');

describe('usePluginMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return sendMessage and listenToMessage functions', () => {
    const { result } = renderHook(() => usePluginMessage());

    expect(result.current.sendMessage).toBeDefined();
    expect(result.current.listenToMessage).toBeDefined();
    expect(typeof result.current.sendMessage).toBe('function');
    expect(typeof result.current.listenToMessage).toBe('function');
  });

  it('should call postMessage when sendMessage is called', () => {
    const mockPostMessage = vi.spyOn(pluginBridge, 'postMessage');
    const { result } = renderHook(() => usePluginMessage());

    const message: PluginMessage = { type: 'get-collections' };
    result.current.sendMessage(message);

    expect(mockPostMessage).toHaveBeenCalledWith(message);
  });

  it('should call onMessage when listenToMessage is called', () => {
    const mockCleanup = vi.fn();
    const mockOnMessage = vi.spyOn(pluginBridge, 'onMessage').mockReturnValue(mockCleanup);
    const { result } = renderHook(() => usePluginMessage());

    const callback = vi.fn();
    const cleanup = result.current.listenToMessage(callback);

    expect(mockOnMessage).toHaveBeenCalledWith(callback);
    expect(cleanup).toBe(mockCleanup);
  });

  it('should maintain stable function references across renders', () => {
    const { result, rerender } = renderHook(() => usePluginMessage());

    const firstSendMessage = result.current.sendMessage;
    const firstListenToMessage = result.current.listenToMessage;

    rerender();

    expect(result.current.sendMessage).toBe(firstSendMessage);
    expect(result.current.listenToMessage).toBe(firstListenToMessage);
  });
});
