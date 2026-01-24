import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScssTab } from './ScssTab';
import * as usePluginMessage from '../../hooks/usePluginMessage';
import * as useClipboard from '../../hooks/useClipboard';

vi.mock('../../../hooks/usePluginMessage');
vi.mock('../../../hooks/useClipboard');

describe('ScssTab', () => {
  const mockSendMessage = vi.fn();
  let mockListenToMessage: (callback: (message: unknown) => void) => () => void;
  let messageHandler: ((message: unknown) => void) | null = null;
  const mockCopyToClipboard = vi.fn().mockResolvedValue(true);

  beforeEach(() => {
    vi.clearAllMocks();
    messageHandler = null;

    mockListenToMessage = vi.fn((callback: (message: unknown) => void) => {
      messageHandler = callback;
      return vi.fn();
    });

    vi.spyOn(usePluginMessage, 'usePluginMessage').mockReturnValue({
      sendMessage: mockSendMessage,
      listenToMessage: mockListenToMessage,
    });

    vi.spyOn(useClipboard, 'useClipboard').mockReturnValue({
      copyToClipboard: mockCopyToClipboard,
      copied: false,
    });
  });

  it('should send export-scss message when generate is clicked', async () => {
    render(
      <ScssTab prefix="ds" selectedCollections={['1']} includeCollectionComments={true} />
    );

    const button = screen.getByRole('button', { name: 'Generate SCSS' });
    await userEvent.click(button);

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: 'export-scss',
      options: {
        selector: ':root',
        prefix: 'ds',
        useModesAsSelectors: false,
        includeCollectionComments: true,
        includeModeComments: false,
        selectedCollections: ['1'],
      },
    });
  });

  it('should display output when scss-result message is received', async () => {
    render(
      <ScssTab prefix="" selectedCollections={[]} includeCollectionComments={true} />
    );

    act(() => {
      if (messageHandler) {
        messageHandler({
          type: 'scss-result',
          scss: '$color-red: #ff0000;',
        });
      }
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('$color-red: #ff0000;')).toBeInTheDocument();
    });
  });
});
