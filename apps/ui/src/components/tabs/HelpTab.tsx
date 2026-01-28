export function HelpTab() {
  return (
    <div className="help-section border-figma-border bg-figma-bg-secondary rounded border p-3">
      <h4 className="text-figma-text-secondary mb-2 text-[10px] font-semibold uppercase tracking-wide">
        Description Field Format
      </h4>
      <p className="text-figma-text-secondary mb-3 text-xs">
        Add these instructions to any variable&apos;s description field to control export:
      </p>

      <h4 className="text-figma-text-secondary mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide">
        Number Units
      </h4>
      <ul className="text-figma-text-secondary list-none space-y-1 text-xs">
        <li>
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            unit: none
          </code>{' '}
          — Output raw number (e.g., 1.5 for line-height)
        </li>
        <li>
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            unit: px
          </code>{' '}
          — Output with px (default)
        </li>
        <li>
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            unit: rem
          </code>{' '}
          — Convert to rem (16px base)
        </li>
        <li>
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            unit: rem:20
          </code>{' '}
          — Convert to rem with custom base
        </li>
        <li>
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            unit: em
          </code>{' '}
          — Output with em
        </li>
        <li>
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            unit: %
          </code>{' '}
          — Output as percentage
        </li>
        <li>
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            unit: ms
          </code>{' '}
          — Output with ms
        </li>
      </ul>

      <h4 className="text-figma-text-secondary mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide">
        Color Formats
      </h4>
      <ul className="text-figma-text-secondary list-none space-y-1 text-xs">
        <li>
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            format: hex
          </code>{' '}
          — #rrggbb (default)
        </li>
        <li>
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            format: rgb
          </code>{' '}
          — rgb(r, g, b)
        </li>
        <li>
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            format: rgba
          </code>{' '}
          — rgba(r, g, b, a)
        </li>
        <li>
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            format: hsl
          </code>{' '}
          — hsl(h, s%, l%)
        </li>
        <li>
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            format: oklch
          </code>{' '}
          — oklch(l% c h)
        </li>
      </ul>

      <h4 className="text-figma-text-secondary mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide">
        Examples
      </h4>
      <ul className="text-figma-text-secondary list-none space-y-1 text-xs">
        <li>
          Line height: Add{' '}
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            unit: none
          </code>{' '}
          → outputs{' '}
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">1.5</code>
        </li>
        <li>
          Font weight: Add{' '}
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            unit: none
          </code>{' '}
          → outputs{' '}
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">700</code>
        </li>
        <li>
          Z-index: Add{' '}
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            unit: none
          </code>{' '}
          → outputs{' '}
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">100</code>
        </li>
        <li>
          Spacing: Add{' '}
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            unit: rem
          </code>{' '}
          → outputs{' '}
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">1rem</code>
        </li>
      </ul>
    </div>
  );
}
