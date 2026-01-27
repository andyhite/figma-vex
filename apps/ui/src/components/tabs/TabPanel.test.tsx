import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TabPanel } from './TabPanel';

describe('TabPanel', () => {
  it('should render children when activeTab matches id', () => {
    render(
      <TabPanel id="tab1" activeTab="tab1">
        <div>Tab 1 Content</div>
      </TabPanel>
    );

    expect(screen.getByText('Tab 1 Content')).toBeInTheDocument();
  });

  it('should not render children when activeTab does not match id', () => {
    render(
      <TabPanel id="tab1" activeTab="tab2">
        <div>Tab 1 Content</div>
      </TabPanel>
    );

    expect(screen.queryByText('Tab 1 Content')).not.toBeInTheDocument();
  });

  it('should render multiple children when active', () => {
    render(
      <TabPanel id="tab1" activeTab="tab1">
        <div>First</div>
        <div>Second</div>
      </TabPanel>
    );

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
