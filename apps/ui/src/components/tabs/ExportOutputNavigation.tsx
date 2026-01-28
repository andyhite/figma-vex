import { useCallback, useRef, useEffect } from 'react';
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
  const tabRefs = useRef<Map<ExportType, HTMLButtonElement>>(new Map());

  // Focus the active tab when it changes via keyboard
  useEffect(() => {
    const activeButton = tabRefs.current.get(activeTab);
    if (activeButton && document.activeElement?.closest('[role="tablist"]')) {
      activeButton.focus();
    }
  }, [activeTab]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const currentIndex = formats.indexOf(activeTab);

      let newIndex: number | null = null;

      switch (event.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault();
          newIndex = currentIndex > 0 ? currentIndex - 1 : formats.length - 1;
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault();
          newIndex = currentIndex < formats.length - 1 ? currentIndex + 1 : 0;
          break;
        case 'Home':
          event.preventDefault();
          newIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          newIndex = formats.length - 1;
          break;
      }

      if (newIndex !== null) {
        onTabChange(formats[newIndex]);
      }
    },
    [formats, activeTab, onTabChange]
  );

  return (
    <div className="border-figma-border mr-4 w-20 flex-shrink-0 border-r pr-2">
      <nav
        role="tablist"
        aria-label="Export format output"
        aria-orientation="vertical"
        className="space-y-1"
        onKeyDown={handleKeyDown}
      >
        {formats.map((format) => {
          const isActive = activeTab === format;
          return (
            <button
              key={format}
              ref={(el) => {
                if (el) tabRefs.current.set(format, el);
              }}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
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
