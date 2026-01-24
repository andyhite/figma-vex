import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabBar } from './TabBar';

describe('TabBar', () => {
  const tabs = [
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2' },
    { id: 'tab3', label: 'Tab 3' },
  ];

  it('should render all tabs', () => {
    render(<TabBar tabs={tabs} activeTab="tab1" onTabChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Tab 1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tab 2' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tab 3' })).toBeInTheDocument();
  });

  it('should highlight active tab', () => {
    render(
      <TabBar tabs={tabs} activeTab="tab2" onTabChange={() => {}} />
    );

    const activeButton = screen.getByRole('button', { name: 'Tab 2' });
    expect(activeButton.className).toContain('border-b-2');
    expect(activeButton.className).toContain('border-b-figma-primary');
  });

  it('should call onTabChange when tab is clicked', async () => {
    const handleTabChange = vi.fn();
    render(<TabBar tabs={tabs} activeTab="tab1" onTabChange={handleTabChange} />);

    const tab2 = screen.getByRole('button', { name: 'Tab 2' });
    await userEvent.click(tab2);

    expect(handleTabChange).toHaveBeenCalledWith('tab2');
  });

  it('should handle empty tabs array', () => {
    render(<TabBar tabs={[]} activeTab="" onTabChange={() => {}} />);

    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });
});
