interface SettingsNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'variables', label: 'Variables' },
  { id: 'calc', label: 'Calc' },
  { id: 'styles', label: 'Styles' },
  { id: 'github', label: 'GitHub' },
  { id: 'backup', label: 'Data' },
];

export function SettingsNavigation({ activeTab, onTabChange }: SettingsNavigationProps) {
  return (
    <div className="border-figma-border mr-4 w-20 flex-shrink-0 border-r pr-2">
      <nav className="space-y-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${
                isActive
                  ? 'bg-figma-bg-secondary text-figma-text font-medium'
                  : 'text-figma-text-secondary hover:bg-figma-bg-secondary hover:text-figma-text'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
