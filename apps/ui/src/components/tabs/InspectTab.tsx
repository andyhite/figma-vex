import { useEffect, useState } from 'react';
import type {
  CollectionUsageInfo,
  VariableUsageInfo,
  NodeUsageLocation,
  AliasUsageLocation,
} from '@figma-vex/shared';
import { useVariableUsage } from '../../hooks/useVariableUsage';
import { Button } from '../common/Button';

/**
 * Badge component for variable type
 */
function TypeBadge({ type }: { type: VariableUsageInfo['type'] }) {
  const styles: Record<string, string> = {
    COLOR: 'bg-purple-500/20 text-purple-300',
    FLOAT: 'bg-blue-500/20 text-blue-300',
    STRING: 'bg-green-500/20 text-green-300',
    BOOLEAN: 'bg-orange-500/20 text-orange-300',
  };

  const labels: Record<string, string> = {
    COLOR: 'Color',
    FLOAT: 'Number',
    STRING: 'String',
    BOOLEAN: 'Boolean',
  };

  return (
    <span
      className={`text-2xs inline-flex items-center rounded px-1.5 py-0.5 font-medium ${styles[type] || 'bg-figma-bg-tertiary text-figma-text-secondary'}`}
    >
      {labels[type] || type}
    </span>
  );
}

/**
 * Property badge showing what property uses the variable
 */
function PropertyBadge({ property }: { property: string }) {
  // Format the property name nicely
  const displayProperty = property
    .replace('componentProperties.', '')
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase();

  return (
    <span className="text-2xs bg-figma-bg-tertiary text-figma-text-tertiary inline-flex items-center rounded px-1.5 py-0.5 font-medium">
      {displayProperty}
    </span>
  );
}

/**
 * Single node usage location row
 */
function NodeLocationRow({ location }: { location: NodeUsageLocation }) {
  return (
    <div className="text-2xs flex items-center gap-2 px-3 py-1.5">
      <span className="text-figma-text-tertiary">{location.nodeType.toLowerCase()}</span>
      <span className="text-figma-text-secondary flex-1 truncate" title={location.nodePath}>
        {location.nodePath}
      </span>
      <PropertyBadge property={location.property} />
    </div>
  );
}

/**
 * Single alias usage location row
 */
function AliasLocationRow({ location }: { location: AliasUsageLocation }) {
  return (
    <div className="text-2xs flex items-center gap-2 px-3 py-1.5">
      <span className="text-figma-text-tertiary">alias</span>
      <span className="text-figma-text-secondary flex-1 truncate">
        {location.collectionName}/{location.variableName}
      </span>
    </div>
  );
}

/**
 * Expandable usage details panel
 */
function UsageDetails({ variable }: { variable: VariableUsageInfo }) {
  const hasNodeLocations = variable.nodeLocations.length > 0;
  const hasAliasLocations = variable.aliasLocations.length > 0;
  const hasMore =
    variable.nodeBindings > variable.nodeLocations.length ||
    variable.aliasReferences > variable.aliasLocations.length;

  return (
    <div className="bg-figma-bg/50 border-figma-border border-t">
      {hasNodeLocations && (
        <div className="py-1">
          <div className="text-2xs text-figma-text-tertiary px-3 py-1 uppercase tracking-wide">
            Node bindings
          </div>
          {variable.nodeLocations.map((location, idx) => (
            <NodeLocationRow key={`${location.nodeId}-${idx}`} location={location} />
          ))}
        </div>
      )}
      {hasAliasLocations && (
        <div className="py-1">
          <div className="text-2xs text-figma-text-tertiary px-3 py-1 uppercase tracking-wide">
            Variable aliases
          </div>
          {variable.aliasLocations.map((location, idx) => (
            <AliasLocationRow key={`${location.variableId}-${idx}`} location={location} />
          ))}
        </div>
      )}
      {hasMore && (
        <div className="text-2xs text-figma-text-tertiary px-3 py-2 italic">
          +{' '}
          {variable.nodeBindings -
            variable.nodeLocations.length +
            variable.aliasReferences -
            variable.aliasLocations.length}{' '}
          more (showing first 50)
        </div>
      )}
    </div>
  );
}

/**
 * Usage count display
 */
function UsageDisplay({ variable }: { variable: VariableUsageInfo }) {
  if (variable.usageCount === 0) {
    return <span className="text-figma-error text-2xs font-medium">Unused</span>;
  }

  return (
    <div className="text-2xs text-figma-text-tertiary flex items-center gap-3">
      {variable.nodeBindings > 0 && (
        <span title="Nodes using this variable">
          <span className="text-figma-text-secondary">{variable.nodeBindings}</span> node
          {variable.nodeBindings !== 1 ? 's' : ''}
        </span>
      )}
      {variable.aliasReferences > 0 && (
        <span title="Variables referencing this variable">
          <span className="text-figma-text-secondary">{variable.aliasReferences}</span> alias
          {variable.aliasReferences !== 1 ? 'es' : ''}
        </span>
      )}
    </div>
  );
}

/**
 * Chevron icon for expand/collapse
 */
function ChevronIcon({ expanded, className = '' }: { expanded: boolean; className?: string }) {
  return (
    <svg
      className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

/**
 * Single variable row (expandable)
 */
function VariableRow({ variable }: { variable: VariableUsageInfo }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = variable.usageCount > 0;

  return (
    <div className="border-figma-border/50 border-b last:border-b-0">
      <button
        className={`flex w-full items-center justify-between px-3 py-2 text-left transition-colors ${
          hasDetails ? 'hover:bg-figma-bg-tertiary/50 cursor-pointer' : 'cursor-default'
        }`}
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        disabled={!hasDetails}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {hasDetails ? (
            <ChevronIcon expanded={isExpanded} className="text-figma-text-tertiary flex-shrink-0" />
          ) : (
            <div className="w-3" /> // Spacer for alignment
          )}
          <TypeBadge type={variable.type} />
          <span className="text-figma-text truncate text-xs" title={variable.name}>
            {variable.name}
          </span>
        </div>
        <UsageDisplay variable={variable} />
      </button>
      {isExpanded && hasDetails && <UsageDetails variable={variable} />}
    </div>
  );
}

/**
 * Collapsible collection section
 */
function CollectionSection({ collection }: { collection: CollectionUsageInfo }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const unusedCount = collection.variables.filter((v) => v.usageCount === 0).length;
  const usedCount = collection.variables.length - unusedCount;

  return (
    <div className="border-figma-border border-b">
      <button
        className="hover:bg-figma-bg-tertiary/50 flex w-full items-center gap-2 py-2.5 text-left transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronIcon expanded={isExpanded} className="text-figma-text-tertiary" />
        <span className="text-figma-text flex-1 text-xs font-medium">{collection.name}</span>
        <div className="text-2xs flex items-center gap-2">
          <span className="text-figma-text-secondary">{usedCount} used</span>
          {unusedCount > 0 && <span className="text-figma-error">{unusedCount} unused</span>}
        </div>
      </button>
      {isExpanded && (
        <div className="bg-figma-bg-secondary/30">
          {collection.variables.map((variable) => (
            <VariableRow key={variable.id} variable={variable} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Scope toggle button
 */
function ScopeToggle({
  currentPageOnly,
  onChange,
  disabled,
}: {
  currentPageOnly: boolean;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="border-figma-border inline-flex overflow-hidden rounded-md border">
      <button
        className={`text-2xs px-3 py-1.5 font-medium transition-colors ${
          currentPageOnly
            ? 'bg-figma-primary text-white'
            : 'bg-figma-bg-secondary text-figma-text-secondary hover:bg-figma-bg-tertiary'
        }`}
        onClick={() => onChange(true)}
        disabled={disabled}
      >
        Current page
      </button>
      <button
        className={`text-2xs border-figma-border border-l px-3 py-1.5 font-medium transition-colors ${
          !currentPageOnly
            ? 'bg-figma-primary text-white'
            : 'bg-figma-bg-secondary text-figma-text-secondary hover:bg-figma-bg-tertiary'
        }`}
        onClick={() => onChange(false)}
        disabled={disabled}
      >
        All pages
      </button>
    </div>
  );
}

/**
 * Summary stats display
 */
function SummaryStats({
  totalVariables,
  totalUsages,
  unusedCount,
}: {
  totalVariables: number;
  totalUsages: number;
  unusedCount: number;
}) {
  return (
    <div className="text-2xs flex items-center gap-4">
      <div>
        <span className="text-figma-text-secondary">Variables: </span>
        <span className="text-figma-text font-medium">{totalVariables}</span>
      </div>
      <div>
        <span className="text-figma-text-secondary">Usages: </span>
        <span className="text-figma-text font-medium">{totalUsages}</span>
      </div>
      {unusedCount > 0 && (
        <div>
          <span className="text-figma-text-secondary">Unused: </span>
          <span className="text-figma-error font-medium">{unusedCount}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Inspect tab - shows variable usage analysis
 */
export function InspectTab() {
  const { data, isLoading, error, refresh } = useVariableUsage();
  const [currentPageOnly, setCurrentPageOnly] = useState(true);

  // Load data on mount
  useEffect(() => {
    refresh({ currentPageOnly });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    refresh({ currentPageOnly });
  };

  const handleScopeChange = (newCurrentPageOnly: boolean) => {
    setCurrentPageOnly(newCurrentPageOnly);
    refresh({ currentPageOnly: newCurrentPageOnly });
  };

  // Calculate unused count
  const unusedCount =
    data?.collections.reduce(
      (acc, collection) => acc + collection.variables.filter((v) => v.usageCount === 0).length,
      0
    ) ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <ScopeToggle
          currentPageOnly={currentPageOnly}
          onChange={handleScopeChange}
          disabled={isLoading}
        />
        <Button onClick={handleRefresh} disabled={isLoading} variant="secondary">
          {isLoading ? 'Scanning...' : 'Refresh'}
        </Button>
      </div>

      {/* Stats bar */}
      {data && (
        <div className="border-figma-border mb-1 border-b pb-3">
          <SummaryStats
            totalVariables={data.totalVariables}
            totalUsages={data.totalUsages}
            unusedCount={unusedCount}
          />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-figma-error/10 border-figma-error/30 text-figma-error my-3 rounded-lg border p-3 text-xs">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoading && !data && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="border-figma-primary mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            <span className="text-figma-text-secondary text-xs">Scanning document...</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && data && data.collections.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-figma-text-tertiary mb-2 text-2xl">0</div>
            <p className="text-figma-text-secondary text-xs">No variables found</p>
            <p className="text-figma-text-tertiary text-2xs mt-1">
              {currentPageOnly ? 'Try scanning all pages' : 'Create some variables to get started'}
            </p>
          </div>
        </div>
      )}

      {/* Collection list */}
      {data && data.collections.length > 0 && (
        <div>
          {data.collections.map((collection) => (
            <CollectionSection key={collection.id} collection={collection} />
          ))}
        </div>
      )}
    </div>
  );
}
