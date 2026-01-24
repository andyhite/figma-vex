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

  return <div className="tab-content px-4">{children}</div>;
}
