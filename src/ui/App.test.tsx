import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import * as useCollections from './hooks/useCollections';
import * as useAutoResize from './hooks/useAutoResize';

vi.mock('./hooks/useCollections');
vi.mock('./hooks/useAutoResize');

describe('App', () => {
  const mockToggleCollection = vi.fn();
  const mockContainerRef = { current: null };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(useCollections, 'useCollections').mockReturnValue({
      collections: [
        { id: '1', name: 'Collection 1' },
        { id: '2', name: 'Collection 2' },
      ],
      selectedCollections: ['1', '2'],
      toggleCollection: mockToggleCollection,
      loading: false,
    });

    vi.spyOn(useAutoResize, 'useAutoResize').mockReturnValue(mockContainerRef);
  });

  it('should render tab bar with all tabs', () => {
    render(<App />);

    expect(screen.getByRole('button', { name: 'CSS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SCSS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'JSON' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TypeScript' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GitHub' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument();
  });

  it('should start with CSS tab active', () => {
    render(<App />);

    expect(screen.getByText('CSS Selector')).toBeInTheDocument();
  });

  it('should switch tabs when clicked', async () => {
    render(<App />);

    const scssTab = screen.getByRole('button', { name: 'SCSS' });
    await userEvent.click(scssTab);

    expect(screen.queryByLabelText('CSS Selector')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate SCSS' })).toBeInTheDocument();
  });

  it('should render collections checkbox list', () => {
    render(<App />);

    expect(screen.getByLabelText('Collection 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Collection 2')).toBeInTheDocument();
  });

  it('should toggle collection when checkbox is clicked', async () => {
    render(<App />);

    const checkbox = screen.getByLabelText('Collection 1');
    await userEvent.click(checkbox);

    expect(mockToggleCollection).toHaveBeenCalledWith('1');
  });

  it('should render prefix input', () => {
    render(<App />);

    expect(screen.getByText('Variable Prefix (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g., ds, theme')).toBeInTheDocument();
  });

  it('should update prefix when input changes', async () => {
    render(<App />);

    const input = screen.getByPlaceholderText('e.g., ds, theme');
    await userEvent.type(input, 'ds-');

    expect(input).toHaveValue('ds-');
  });

  it('should render include collection comments checkbox', () => {
    render(<App />);

    expect(screen.getByLabelText('Include collection comments')).toBeInTheDocument();
  });

  it('should toggle include collection comments', async () => {
    render(<App />);

    const checkbox = screen.getByLabelText('Include collection comments');
    await userEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  it('should show loading state when collections are loading', () => {
    vi.spyOn(useCollections, 'useCollections').mockReturnValue({
      collections: [],
      selectedCollections: [],
      toggleCollection: mockToggleCollection,
      loading: true,
    });

    render(<App />);

    expect(screen.getByText('Loading collections...')).toBeInTheDocument();
  });

  it('should show message when no collections found', () => {
    vi.spyOn(useCollections, 'useCollections').mockReturnValue({
      collections: [],
      selectedCollections: [],
      toggleCollection: mockToggleCollection,
      loading: false,
    });

    render(<App />);

    expect(screen.getByText('No collections found')).toBeInTheDocument();
  });

  it('should hide common options on help tab', async () => {
    render(<App />);

    const helpTab = screen.getByRole('button', { name: 'Help' });
    await userEvent.click(helpTab);

    expect(screen.queryByLabelText('Variable Prefix (optional)')).not.toBeInTheDocument();
    expect(screen.queryByText('Collections')).not.toBeInTheDocument();
  });

  it('should display tab description', () => {
    render(<App />);

    expect(
      screen.getByText(
        'Export variables as CSS custom properties with customizable selectors and formatting options.'
      )
    ).toBeInTheDocument();
  });
});
