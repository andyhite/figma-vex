import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TypeScriptTab } from './TypeScriptTab';
import * as usePluginMessage from '../../hooks/usePluginMessage';
import * as useClipboard from '../../hooks/useClipboard';

vi.mock('../../../hooks/usePluginMessage');
vi.mock('../../../hooks/useClipboard');

describe('TypeScriptTab', () => {
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

  it('should send export-typescript message when generate is clicked', async () => {
    render(
      <TypeScriptTab prefix="ds" selectedCollections={['1']} />
    );

    const button = screen.getByRole('button', { name: 'Generate TypeScript' });
    await userEvent.click(button);

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: 'export-typescript',
      options: {
        selector: ':root',
        prefix: 'ds',
        useModesAsSelectors: false,
        includeCollectionComments: false,
        includeModeComments: false,
        selectedCollections: ['1'],
      },
    });
  });

  it('should display output when typescript-result message is received', async () => {
    render(<TypeScriptTab prefix="" selectedCollections={[]} />);

    act(() => {
      if (messageHandler) {
        messageHandler({
          type: 'typescript-result',
          typescript: 'export type CSSVariables = { "--color-red": string; };',
        });
      }
    });

    await waitFor(() => {
      expect(
        screen.getByDisplayValue('export type CSSVariables = { "--color-red": string; };')
      ).toBeInTheDocument();
    });
  });
});
