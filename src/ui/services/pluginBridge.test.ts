import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { postMessage, onMessage } from './pluginBridge';
import type { PluginMessage, UIMessage } from '@shared/types';

describe('pluginBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('postMessage', () => {
    it('should send message to parent window', () => {
      const mockPostMessage = vi.fn();
      window.parent.postMessage = mockPostMessage;

      const message: PluginMessage = { type: 'get-collections' };
      postMessage(message);

      expect(mockPostMessage).toHaveBeenCalledWith({ pluginMessage: message }, '*');
    });

    it('should send export-css message', () => {
      const mockPostMessage = vi.fn();
      window.parent.postMessage = mockPostMessage;

      const message: PluginMessage = {
        type: 'export-css',
        options: {
          selector: ':root',
          prefix: 'ds',
          includeCollectionComments: false,
          includeModeComments: false,
          useModesAsSelectors: false,
        },
      };
      postMessage(message);

      expect(mockPostMessage).toHaveBeenCalledWith({ pluginMessage: message }, '*');
    });

    it('should send resize-window message', () => {
      const mockPostMessage = vi.fn();
      window.parent.postMessage = mockPostMessage;

      const message: PluginMessage = {
        type: 'resize-window',
        height: 500,
        width: 400,
      };
      postMessage(message);

      expect(mockPostMessage).toHaveBeenCalledWith({ pluginMessage: message }, '*');
    });
  });

  describe('onMessage', () => {
    it('should set up message listener and call callback', () => {
      const callback = vi.fn();
      const cleanup = onMessage(callback);

      const message: UIMessage = {
        type: 'collections-list',
        collections: [
          { id: '1', name: 'Collection 1' },
          { id: '2', name: 'Collection 2' },
        ],
      };

      // Simulate message event
      const event = new MessageEvent('message', {
        data: { pluginMessage: message },
      });
      window.dispatchEvent(event);

      expect(callback).toHaveBeenCalledWith(message);

      // Cleanup
      cleanup();
    });

    it('should ignore events without pluginMessage', () => {
      const callback = vi.fn();
      const cleanup = onMessage(callback);

      const event = new MessageEvent('message', {
        data: { otherData: 'test' },
      });
      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();

      cleanup();
    });

    it('should return cleanup function that removes listener', () => {
      const callback = vi.fn();
      const cleanup = onMessage(callback);

      cleanup();

      const message: UIMessage = {
        type: 'collections-list',
        collections: [],
      };

      const event = new MessageEvent('message', {
        data: { pluginMessage: message },
      });
      window.dispatchEvent(event);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple message types', () => {
      const callback = vi.fn();
      const cleanup = onMessage(callback);

      const messages: UIMessage[] = [
        {
          type: 'collections-list',
          collections: [],
        },
        {
          type: 'css-result',
          css: 'body { color: red; }',
        },
        {
          type: 'error',
          message: 'Something went wrong',
        },
      ];

      messages.forEach((msg) => {
        const event = new MessageEvent('message', {
          data: { pluginMessage: msg },
        });
        window.dispatchEvent(event);
      });

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, messages[0]);
      expect(callback).toHaveBeenNthCalledWith(2, messages[1]);
      expect(callback).toHaveBeenNthCalledWith(3, messages[2]);

      cleanup();
    });
  });
});
