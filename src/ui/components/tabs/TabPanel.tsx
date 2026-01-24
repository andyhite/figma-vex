import type { ReactNode } from 'react';

interface TabPanelProps {
  id: string;
  activeTab: string;
  children: ReactNode;
}

export function TabPanel({ id, activeTab, children }: TabPanelProps) {
  if (id !== activeTab) {
    return null;
  }

  return (
    <div className="tab-content px-4 pb-2 [&>*:last-child]:mb-2 [&>*:last-child>.form-group]:mb-2">
      {children}
    </div>
  );
}
