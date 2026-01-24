import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JsonTab } from './JsonTab';
import * as usePluginMessage from '../../hooks/usePluginMessage';
import * as useClipboard from '../../hooks/useClipboard';

vi.mock('../../../hooks/usePluginMessage');
vi.mock('../../../hooks/useClipboard');

describe('JsonTab', () => {
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

  it('should send export-json message when generate is clicked', async () => {
    render(<JsonTab selectedCollections={['1']} includeCollectionComments={true} />);

    const button = screen.getByRole('button', { name: 'Generate JSON' });
    await userEvent.click(button);

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: 'export-json',
      options: {
        selector: ':root',
        useModesAsSelectors: false,
        includeCollectionComments: true,
        includeModeComments: false,
        selectedCollections: ['1'],
      },
    });
  });

  it('should display output when json-result message is received', async () => {
    render(<JsonTab selectedCollections={[]} includeCollectionComments={true} />);

    act(() => {
      if (messageHandler) {
        messageHandler({
          type: 'json-result',
          json: '{"color": {"red": "#ff0000"}}',
        });
      }
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('{"color": {"red": "#ff0000"}}')).toBeInTheDocument();
    });
  });
});
