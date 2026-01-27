import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TypeScriptTab } from './TypeScriptTab';
import * as usePluginMessage from '../../hooks/usePluginMessage';
import * as useOutputActions from '../../hooks/useOutputActions';
import type { UIMessage } from '@figma-vex/shared';

vi.mock('../../../hooks/usePluginMessage');
vi.mock('../../../hooks/useOutputActions');

describe('TypeScriptTab', () => {
  const mockSendMessage = vi.fn();
  let mockListenToMessage: (callback: (message: UIMessage) => void) => () => void;
  let messageHandler: ((message: UIMessage) => void) | null = null;
  const mockSetStatus = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    messageHandler = null;

    mockListenToMessage = vi.fn((callback: (message: UIMessage) => void) => {
      messageHandler = callback;
      return vi.fn();
    });

    vi.spyOn(usePluginMessage, 'usePluginMessage').mockReturnValue({
      sendMessage: mockSendMessage,
      listenToMessage: mockListenToMessage,
    });

    vi.spyOn(useOutputActions, 'useOutputActions').mockReturnValue({
      handleCopy: vi.fn(),
      handleDownload: vi.fn(),
      status: { message: '', type: 'info' },
      setStatus: mockSetStatus,
    });
  });

  it('should send export-typescript message when generate is clicked', async () => {
    render(
      <TypeScriptTab
        prefix="ds"
        selectedCollections={['1']}
        includeModeComments={false}
        syncCalculations={false}
        includeStyles={false}
        styleOutputMode="variables"
        styleTypes={[]}
      />
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
        includeStyles: false,
        styleOutputMode: 'variables',
        styleTypes: [],
        syncCalculations: false,
      },
    });
  });

  it('should display output when typescript-result message is received', async () => {
    render(
      <TypeScriptTab
        prefix=""
        selectedCollections={[]}
        includeModeComments={false}
        syncCalculations={false}
        includeStyles={false}
        styleOutputMode="variables"
        styleTypes={[]}
      />
    );

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
