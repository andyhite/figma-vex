import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScssTab } from './ScssTab';
import * as usePluginMessage from '../../hooks/usePluginMessage';
import * as useOutputActions from '../../hooks/useOutputActions';
import type { UIMessage } from '@figma-vex/shared';

vi.mock('../../../hooks/usePluginMessage');
vi.mock('../../../hooks/useOutputActions');

describe('ScssTab', () => {
  const mockSendMessage = vi.fn();
  let mockListenToMessage: (callback: (message: UIMessage) => void) => () => void;
  let messageHandler: ((message: UIMessage) => void) | null = null;
  const mockSetStatus = vi.fn();

  const defaultProps = {
    prefix: '',
    selectedCollections: [] as string[],
    includeCollectionComments: true,
    includeModeComments: false,
    syncCalculations: false,
    includeStyles: false,
    styleOutputMode: 'variables' as const,
    styleTypes: [] as never[],
    remBaseVariableId: null,
    nameFormatRules: [] as never[],
    syncCodeSyntax: true,
    numberPrecision: 4,
    exportAsCalcExpressions: false,
  };

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

  it('should send export-scss message when generate is clicked', async () => {
    render(<ScssTab {...defaultProps} prefix="ds" selectedCollections={['1']} />);

    const button = screen.getByRole('button', { name: 'Generate SCSS' });
    await userEvent.click(button);

    expect(mockSendMessage).toHaveBeenCalledWith({
      type: 'export-scss',
      options: expect.objectContaining({
        selector: ':root',
        prefix: 'ds',
        useModesAsSelectors: false,
        includeCollectionComments: true,
        includeModeComments: false,
        selectedCollections: ['1'],
        exportAsCalcExpressions: false,
      }),
    });
  });

  it('should display output when scss-result message is received', async () => {
    render(<ScssTab {...defaultProps} />);

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
