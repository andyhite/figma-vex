# GitHub Integration in Generate Tab - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move GitHub dispatch functionality from a separate tab into the Generate tab as an optional checkbox.

**Architecture:** Add a "Send to GitHub" checkbox to ExportTab that appears when GitHub credentials are configured. When checked, the Generate button also triggers a GitHub dispatch using the same formats selected for generation. Remove the standalone GitHub tab and simplify GitHub settings by removing format selection.

**Tech Stack:** React, TypeScript, Figma Plugin API

---

### Task 1: Remove Export Types from GitHubSettings Component

**Files:**

- Modify: `apps/ui/src/components/settings/GitHubSettings.tsx`

**Step 1: Update the interface to remove export types**

Remove `initialExportTypes` prop and `githubExportTypes` from the settings change callback.

```tsx
interface GitHubSettingsProps {
  // Persisted settings
  initialRepository?: string;
  initialToken?: string;
  initialWorkflowFileName?: string;
  onSettingsChange?: (settings: {
    githubRepository: string;
    githubToken: string;
    githubWorkflowFileName: string;
  }) => void;
}
```

**Step 2: Remove export types state and toggle function**

Remove the `exportTypes` state, `toggleExportType` callback, and update `persistSettings` to not include export types.

**Step 3: Remove the Export Types FormGroup from the JSX**

Remove the entire `<FormGroup label="Export Types">` block and its associated FormHelpText.

**Step 4: Run typecheck to verify changes**

Run: `pnpm typecheck`
Expected: Errors in files that still reference `githubExportTypes` (App.tsx, SettingsTab.tsx)

---

### Task 2: Update SettingsTab to Remove Export Types Props

**Files:**

- Modify: `apps/ui/src/components/tabs/SettingsTab.tsx`

**Step 1: Find and update GitHubSettings usage**

Remove the `initialGithubExportTypes` prop being passed to GitHubSettings.

**Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Error in App.tsx for `initialGithubExportTypes` prop

---

### Task 3: Update App.tsx to Remove GitHub Tab and Export Types

**Files:**

- Modify: `apps/ui/src/App.tsx`

**Step 1: Remove GitHub tab from TABS array**

```tsx
const TABS = [
  { id: 'export', label: 'Generate' },
  { id: 'settings', label: 'Settings' },
  { id: 'help', label: 'Help' },
];
```

**Step 2: Remove GitHub tab description**

```tsx
const TAB_DESCRIPTIONS: Record<string, string> = {
  export: 'Generate CSS, JSON, or TypeScript exports from your Figma variables.',
  settings: 'Configure global export settings that apply to all export formats.',
  help: 'Learn how to configure variable exports using description fields.',
};
```

**Step 3: Remove GitHubActionTab import**

Remove: `import { GitHubActionTab } from './components/tabs/GitHubActionTab';`

**Step 4: Remove the GitHub TabPanel**

Remove the entire `<TabPanel id="github" ...>` block.

**Step 5: Add GitHub props to ExportTab**

```tsx
<ExportTab
  // ... existing props ...
  githubRepository={settings?.githubRepository ?? ''}
  githubToken={settings?.githubToken ?? ''}
  githubWorkflowFileName={settings?.githubWorkflowFileName ?? 'update-variables.yml'}
/>
```

**Step 6: Remove initialGithubExportTypes from SettingsTab**

Remove the `initialGithubExportTypes` prop from SettingsTab.

**Step 7: Run typecheck**

Run: `pnpm typecheck`
Expected: Errors in ExportTab for new GitHub props

---

### Task 4: Add GitHub Integration to ExportTab

**Files:**

- Modify: `apps/ui/src/components/tabs/ExportTab.tsx`

**Step 1: Add new imports**

```tsx
import type {
  ExportType,
  ExportOptions,
  StyleType,
  StyleOutputMode,
  NameFormatRule,
  UIMessage,
  GitHubDispatchOptions,
} from '@figma-vex/shared';
```

**Step 2: Add GitHub props to interface**

```tsx
interface ExportTabProps {
  // ... existing props ...

  // GitHub settings
  githubRepository: string;
  githubToken: string;
  githubWorkflowFileName: string;
}
```

**Step 3: Add GitHub props to component signature**

```tsx
export function ExportTab({
  // ... existing props ...
  githubRepository,
  githubToken,
  githubWorkflowFileName,
}: ExportTabProps) {
```

**Step 4: Add GitHub state**

```tsx
// GitHub integration state
const [sendToGitHub, setSendToGitHub] = useState(false);
const [githubStatus, setGithubStatus] = useState<{
  message: string;
  type: 'sending' | 'success' | 'error';
  visible: boolean;
} | null>(null);
```

**Step 5: Compute whether GitHub is configured**

```tsx
const isGitHubConfigured = githubRepository.trim() !== '' && githubToken.trim() !== '';
```

**Step 6: Update message listener for GitHub responses**

Add to the existing `listenToMessage` effect:

```tsx
} else if (message.type === 'github-dispatch-success') {
  setGithubStatus({ message: 'Sent to GitHub!', type: 'success', visible: true });
  setTimeout(() => {
    setGithubStatus((prev) => (prev ? { ...prev, visible: false } : null));
  }, 2000);
  setTimeout(() => {
    setGithubStatus(null);
  }, 2500);
}
```

Also update the error handler to check if it's a GitHub error:

```tsx
} else if (message.type === 'error') {
  // Check if we were sending to GitHub
  if (githubStatus?.type === 'sending') {
    setGithubStatus({ message: message.message, type: 'error', visible: true });
    setTimeout(() => {
      setGithubStatus((prev) => (prev ? { ...prev, visible: false } : null));
    }, 3000);
    setTimeout(() => {
      setGithubStatus(null);
    }, 3500);
  }
  // ... existing error handling ...
}
```

**Step 7: Update handleGenerate to also dispatch to GitHub**

Add after sending export messages:

```tsx
// Send to GitHub if enabled
if (sendToGitHub && isGitHubConfigured) {
  setGithubStatus({ message: 'Sending to GitHub...', type: 'sending', visible: true });

  const exportOptions: ExportOptions = {
    selector: selector.trim() || ':root',
    prefix: prefix.trim() || undefined,
    useModesAsSelectors,
    includeCollectionComments,
    includeModeComments,
    selectedCollections: selectedCollections.length > 0 ? selectedCollections : undefined,
    includeStyles,
    styleOutputMode,
    styleTypes,
    syncCalculations,
    numberPrecision,
  };

  const githubOptions: GitHubDispatchOptions = {
    repository: githubRepository.trim(),
    token: githubToken.trim(),
    workflowFileName: githubWorkflowFileName.trim() || 'update-variables.yml',
    exportTypes: selectedFormats,
    exportOptions,
  };

  sendMessage({ type: 'github-dispatch', githubOptions });
}
```

**Step 8: Add checkbox and status UI after format selection**

```tsx
{
  /* GitHub Integration */
}
{
  isGitHubConfigured && (
    <div className="border-figma-border border-t pt-3">
      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox
          checked={sendToGitHub}
          onChange={() => setSendToGitHub(!sendToGitHub)}
          aria-label="Send to GitHub"
        />
        <span className="text-figma-text text-xs">Send to GitHub</span>
      </label>
    </div>
  );
}
```

**Step 9: Update button text based on sendToGitHub**

```tsx
<Button onClick={handleGenerate} disabled={isGenerateDisabled}>
  {isGenerating ? 'Generating...' : sendToGitHub ? 'Generate & Send to GitHub' : 'Generate'}
</Button>
```

**Step 10: Add GitHub status indicator next to generate status**

```tsx
{
  githubStatus && (
    <span
      className={`ml-3 text-xs transition-opacity duration-500 ${
        githubStatus.visible ? 'opacity-100' : 'opacity-0'
      } ${
        githubStatus.type === 'success'
          ? 'text-figma-success'
          : githubStatus.type === 'error'
            ? 'text-figma-error'
            : 'text-figma-text-secondary'
      }`}
    >
      {githubStatus.message}
    </span>
  );
}
```

**Step 11: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

---

### Task 5: Delete GitHubActionTab Component

**Files:**

- Delete: `apps/ui/src/components/tabs/GitHubActionTab.tsx`

**Step 1: Delete the file**

Run: `rm apps/ui/src/components/tabs/GitHubActionTab.tsx`

**Step 2: Run build to verify no broken imports**

Run: `pnpm build`
Expected: PASS

---

### Task 6: Update Tests

**Files:**

- Modify: `apps/ui/src/App.test.tsx`
- Modify: `apps/ui/src/components/tabs/ExportTab.test.tsx`

**Step 1: Update App.test.tsx to remove GitHub tab references**

Remove any test cases that reference the GitHub tab.

**Step 2: Add GitHub integration tests to ExportTab.test.tsx**

Add tests for:

- GitHub checkbox is hidden when credentials not configured
- GitHub checkbox appears when credentials are configured
- Button text changes when checkbox is checked
- GitHub dispatch is sent when checkbox is checked and Generate clicked

**Step 3: Run tests**

Run: `pnpm test`
Expected: PASS

---

### Task 7: Remove githubExportTypes from PluginSettings (Optional Cleanup)

**Files:**

- Modify: `packages/shared/src/types/messages.ts`
- Modify: `apps/ui/src/hooks/useSettings.ts`

**Step 1: Remove githubExportTypes from PluginSettings interface**

Remove the line: `githubExportTypes: ExportType[];`

**Step 2: Remove from DEFAULT_SETTINGS in useSettings.ts**

Remove: `githubExportTypes: ['css', 'json'],`

**Step 3: Run typecheck and tests**

Run: `pnpm typecheck && pnpm test`
Expected: PASS

---

### Task 8: Final Verification

**Step 1: Run full build**

Run: `pnpm build`
Expected: PASS

**Step 2: Run all tests**

Run: `pnpm test`
Expected: PASS

**Step 3: Manual testing checklist**

- [ ] Generate tab shows format checkboxes (CSS, JSON, TypeScript)
- [ ] GitHub checkbox is hidden when no credentials configured
- [ ] GitHub checkbox appears when repository and token are set in Settings > GitHub
- [ ] Checking GitHub checkbox changes button to "Generate & Send to GitHub"
- [ ] Clicking generate with GitHub checked sends both local results and GitHub dispatch
- [ ] Success/error status shows for GitHub dispatch
- [ ] GitHub tab no longer appears in tab bar
- [ ] Settings > GitHub no longer shows export types checkboxes

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: integrate GitHub dispatch into Generate tab

- Add 'Send to GitHub' checkbox to Generate tab (visible when configured)
- Use Generate tab's format selection for GitHub dispatch
- Remove standalone GitHub tab
- Remove export types from GitHub settings (uses Generate tab selection)
- Update tests"
```
