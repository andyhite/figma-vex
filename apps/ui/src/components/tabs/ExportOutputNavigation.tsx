import type { ExportType } from '@figma-vex/shared';

interface ExportOutputNavigationProps {
  activeTab: ExportType;
  onTabChange: (tab: ExportType) => void;
  formats: ExportType[];
}

const FORMAT_LABELS: Record<ExportType, string> = {
  css: 'CSS',
  json: 'JSON',
  typescript: 'TypeScript',
};

export function ExportOutputNavigation({
  activeTab,
  onTabChange,
  formats,
}: ExportOutputNavigationProps) {
  return (
    <div className="border-figma-border mr-4 w-20 flex-shrink-0 border-r pr-2">
      <nav className="space-y-1">
        {formats.map((format) => {
          const isActive = activeTab === format;
          return (
            <button
              key={format}
              onClick={() => onTabChange(format)}
              className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${
                isActive
                  ? 'bg-figma-bg-secondary text-figma-text font-medium'
                  : 'text-figma-text-secondary hover:bg-figma-bg-secondary hover:text-figma-text'
              }`}
            >
              {FORMAT_LABELS[format]}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
