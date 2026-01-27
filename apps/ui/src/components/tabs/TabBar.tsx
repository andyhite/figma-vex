interface TabBarProps {
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="tabs m-0 mb-4 flex gap-0 border-b border-figma-bg-secondary bg-figma-bg px-4 pb-0 pt-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab mb-[-1px] cursor-pointer border-none bg-none px-3 py-2.5 text-xs font-medium transition-all ${
            activeTab === tab.id
              ? 'border-b-2 border-b-figma-primary text-figma-text'
              : 'text-figma-text-secondary hover:bg-[rgba(255,255,255,0.05)] hover:text-figma-text'
          }`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
