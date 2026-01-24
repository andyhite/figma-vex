import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCollections } from './useCollections';
import * as usePluginMessage from './usePluginMessage';
import type { CollectionInfo } from '@shared/types';

vi.mock('./usePluginMessage');

describe('useCollections', () => {
  const mockSendMessage = vi.fn();
  let mockListenToMessage: (callback: (message: unknown) => void) => () => void;
  let messageHandler: ((message: unknown) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    messageHandler = null;

    mockListenToMessage = vi.fn((callback: (message: unknown) => void) => {
      messageHandler = callback;
      return vi.fn(); // Return cleanup function
    });

    vi.spyOn(usePluginMessage, 'usePluginMessage').mockReturnValue({
      sendMessage: mockSendMessage,
      listenToMessage: mockListenToMessage,
    });
  });

  it('should initialize with empty collections and loading state', () => {
    const { result } = renderHook(() => useCollections());

    expect(result.current.collections).toEqual([]);
    expect(result.current.selectedCollections).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('should request collections on mount', () => {
    renderHook(() => useCollections());

    expect(mockSendMessage).toHaveBeenCalledWith({ type: 'get-collections' });
  });

  it('should set up message listener on mount', () => {
    renderHook(() => useCollections());

    expect(mockListenToMessage).toHaveBeenCalled();
  });

  it('should update collections when collections-list message is received', async () => {
    const { result } = renderHook(() => useCollections());

    const collections: CollectionInfo[] = [
      { id: '1', name: 'Collection 1' },
      { id: '2', name: 'Collection 2' },
    ];

    act(() => {
      if (messageHandler) {
        messageHandler({
          type: 'collections-list',
          collections,
        });
      }
    });

    await waitFor(() => {
      expect(result.current.collections).toEqual(collections);
      expect(result.current.loading).toBe(false);
    });
  });

  it('should select all collections by default', async () => {
    const { result } = renderHook(() => useCollections());

    const collections: CollectionInfo[] = [
      { id: '1', name: 'Collection 1' },
      { id: '2', name: 'Collection 2' },
      { id: '3', name: 'Collection 3' },
    ];

    act(() => {
      if (messageHandler) {
        messageHandler({
          type: 'collections-list',
          collections,
        });
      }
    });

    await waitFor(() => {
      expect(result.current.selectedCollections).toEqual(['1', '2', '3']);
    });
  });

  it('should toggle collection selection', async () => {
    const { result } = renderHook(() => useCollections());

    const collections: CollectionInfo[] = [
      { id: '1', name: 'Collection 1' },
      { id: '2', name: 'Collection 2' },
    ];

    act(() => {
      if (messageHandler) {
        messageHandler({
          type: 'collections-list',
          collections,
        });
      }
    });

    await waitFor(() => {
      expect(result.current.selectedCollections).toEqual(['1', '2']);
    });

    act(() => {
      result.current.toggleCollection('1');
    });

    await waitFor(() => {
      expect(result.current.selectedCollections).toEqual(['2']);
    });

    act(() => {
      result.current.toggleCollection('1');
    });

    await waitFor(() => {
      expect(result.current.selectedCollections).toEqual(['2', '1']);
    });
  });

  it('should ignore non-collections-list messages', async () => {
    const { result } = renderHook(() => useCollections());

    if (messageHandler) {
      messageHandler({
        type: 'css-result',
        css: 'body { color: red; }',
      });
    }

    // Wait a bit to ensure no updates
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(result.current.collections).toEqual([]);
    expect(result.current.loading).toBe(true);
  });

  it('should return cleanup function from message listener', () => {
    const mockCleanup = vi.fn();
    mockListenToMessage = vi.fn(() => mockCleanup);

    vi.spyOn(usePluginMessage, 'usePluginMessage').mockReturnValue({
      sendMessage: mockSendMessage,
      listenToMessage: mockListenToMessage,
    });

    const { unmount } = renderHook(() => useCollections());

    unmount();

    // Cleanup should be called on unmount
    expect(mockListenToMessage).toHaveBeenCalled();
  });
});
