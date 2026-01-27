export function HelpTab() {
  return (
    <div className="help-section rounded border border-figma-border bg-figma-bg-secondary p-3">
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-figma-text-secondary">
        Description Field Format
      </h4>
      <p className="mb-3 text-xs text-figma-text-secondary">
        Add these instructions to any variable&apos;s description field to control export:
      </p>

      <h4 className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide text-figma-text-secondary">
        Number Units
      </h4>
      <ul className="list-none space-y-1 text-xs text-figma-text-secondary">
        <li>
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            unit: none
          </code>{' '}
          — Output raw number (e.g., 1.5 for line-height)
        </li>
        <li>
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            unit: px
          </code>{' '}
          — Output with px (default)
        </li>
        <li>
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            unit: rem
          </code>{' '}
          — Convert to rem (16px base)
        </li>
        <li>
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            unit: rem:20
          </code>{' '}
          — Convert to rem with custom base
        </li>
        <li>
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            unit: em
          </code>{' '}
          — Output with em
        </li>
        <li>
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            unit: %
          </code>{' '}
          — Output as percentage
        </li>
        <li>
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            unit: ms
          </code>{' '}
          — Output with ms
        </li>
      </ul>

      <h4 className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide text-figma-text-secondary">
        Color Formats
      </h4>
      <ul className="list-none space-y-1 text-xs text-figma-text-secondary">
        <li>
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            format: hex
          </code>{' '}
          — #rrggbb (default)
        </li>
        <li>
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            format: rgb
          </code>{' '}
          — rgb(r, g, b)
        </li>
        <li>
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            format: rgba
          </code>{' '}
          — rgba(r, g, b, a)
        </li>
        <li>
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            format: hsl
          </code>{' '}
          — hsl(h, s%, l%)
        </li>
        <li>
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            format: oklch
          </code>{' '}
          — oklch(l% c h)
        </li>
      </ul>

      <h4 className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide text-figma-text-secondary">
        Examples
      </h4>
      <ul className="list-none space-y-1 text-xs text-figma-text-secondary">
        <li>
          Line height: Add{' '}
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            unit: none
          </code>{' '}
          → outputs{' '}
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">1.5</code>
        </li>
        <li>
          Font weight: Add{' '}
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            unit: none
          </code>{' '}
          → outputs{' '}
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">700</code>
        </li>
        <li>
          Z-index: Add{' '}
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            unit: none
          </code>{' '}
          → outputs{' '}
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">100</code>
        </li>
        <li>
          Spacing: Add{' '}
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            unit: rem
          </code>{' '}
          → outputs{' '}
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">1rem</code>
        </li>
      </ul>
    </div>
  );
}
