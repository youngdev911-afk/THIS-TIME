# AppForge AI — Project Architecture Documentation

> **Version:** 1.0  
> **Date:** 2026-09-30  
> **Purpose:** Deep structural breakdown of the entire codebase — every file, component, function, style, and data flow.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Folder & File Map](#2-folder--file-map)
3. [UI & Component Layout](#3-ui--component-layout)
4. [State & Functions Index](#4-state--functions-index)
5. [CSS & Styling Map](#5-css--styling-map)
6. [Supabase Edge Functions](#6-supabase-edge-functions)
7. [Database Schema](#7-database-schema)
8. [Data Flow](#8-data-flow)
9. [Configuration Files](#9-configuration-files)

---

## 1. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | React | 18.3.1 |
| Build Tool | Vite | 5.4.2 |
| Language | TypeScript | 5.5.3 |
| Styling | Tailwind CSS (base/utilities) + custom CSS | 3.4.1 |
| Icons | lucide-react | 0.446.0 |
| Backend | Supabase (Edge Functions + Postgres) | — |
| AI Model | Gemini 3.5 Flash Lite (via Google Generative Language API) | — |
| Runtime (Edge Functions) | Deno | — |
| Package Manager | npm | — |

---

## 2. Folder & File Map

### Root-Level Files

| File | Purpose |
|------|---------|
| `index.html` | Vite HTML entry point. Sets page title, meta tags (OG/Twitter), and mounts `#root`. Loads `/src/main.tsx`. |
| `package.json` | npm manifest. Defines scripts (`dev`, `build`, `lint`, `preview`, `typecheck`) and dependencies. |
| `package-lock.json` | Lock file for reproducible installs. |
| `vite.config.ts` | Vite configuration. Registers React plugin, sets `@` path alias to `./src`, excludes `lucide-react` from dep pre-bundling. |
| `tsconfig.json` | Root TypeScript config. References `tsconfig.app.json` and `tsconfig.node.json`. |
| `tsconfig.app.json` | TypeScript config for `src/`. Target ES2020, bundler module resolution, `strict` mode, JSX react-jsx, path alias `@/* → src/*`. |
| `tsconfig.node.json` | TypeScript config for `vite.config.ts`. Target ES2022, bundler resolution, strict. |
| `eslint.config.js` | ESLint flat config. Uses `@eslint/js`, `typescript-eslint`, `react-hooks`, `react-refresh` plugins. Ignores `dist/`. |
| `postcss.config.js` | PostCSS config. Loads `tailwindcss` and `autoprefixer` plugins. |
| `tailwind.config.js` | Tailwind config. Content scans `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`. No theme extensions. |
| `.gitignore` | Ignores `node_modules`, `dist`, `.env`, logs, IDE files. |
| `.bolt/config.json` | Bolt template identifier: `bolt-vite-react-ts`. |

### `src/` Directory

| File | Lines | Purpose |
|------|-------|---------|
| `src/main.tsx` | 10 | React entry point. Creates root on `#root`, wraps `<App />` in `<StrictMode>`, imports `index.css`. |
| `src/App.tsx` | 195 | Main application component. Contains all state, both views (dashboard + workspace), all modals, and 4 sub-components. |
| `src/types.ts` | 54 | All TypeScript interfaces and type aliases for the entire app. |
| `src/templates.ts` | 185 | Starter template definitions and blank project file generator. |
| `src/geminiClient.ts` | 62 | Client-side API wrapper that calls the `generate-app` edge function. |
| `src/index.css` | 47 | Global stylesheet: font imports, Tailwind directives, all custom CSS classes, animations, responsive breakpoints. |
| `src/vite-env.d.ts` | — | Vite environment type declarations. |

### `supabase/` Directory

| File | Purpose |
|------|---------|
| `supabase/config.toml` | Edge function config. Sets `verify_jwt = false` for both `generate-app` and `save-api-key`. |
| `supabase/migrations/20260916111228_create_app_secrets_table.sql` | Creates `app_secrets` table with RLS enabled, no policies (service-role-only access). |
| `supabase/functions/generate-app/index.ts` | Main AI generation edge function. Contains system prompt, Gemini API caller, API key rotation system, JSON parser with truncation salvage, and HTTP handler. |
| `supabase/functions/save-api-key/index.ts` | Edge function that saves a Gemini API key to the `app_secrets` table via upsert. |

---

## 3. UI & Component Layout

### 3.1 Component Tree

```
App (default export)
├── Dashboard View (currentView === "dashboard")
│   ├── Topbar
│   ├── Hero Card + Guide Card (dashboard-hero-grid)
│   ├── Beast Mode Banner
│   ├── Project Toolbar (search + sort)
│   ├── Project Grid (project cards + new project tile)
│   ├── NewProjectModal (conditional)
│   └── Toasts
│
└── Workspace View (currentView === "workspace")
    ├── Workspace Topbar
    ├── Workspace Body (3-column grid)
    │   ├── File Sidebar (left)
    │   ├── Preview Area (center)
    │   │   ├── Preview Toolbar (browser chrome + device switcher)
    │   │   ├── Runtime Error Banner (conditional)
    │   │   └── Preview Frame (iframe OR code editor)
    │   └── AI Sidebar (right)
    │       ├── AI Header
    │       ├── Chat Scroll (messages + build progress + retry)
    │       ├── Quick Prompts
    │       └── Chat Composer (textarea + send button)
    ├── SettingsModal (conditional)
    ├── HistoryModal (conditional)
    └── Toasts
```

### 3.2 Sub-Components

| Component | File Location | Lines | Props | Renders |
|-----------|--------------|-------|-------|---------|
| `App` | `src/App.tsx:22` | 22–180 | none (root) | Dashboard or Workspace view based on `currentView` |
| `NewProjectModal` | `src/App.tsx:182` | 182–184 | `selected`, `setSelected`, `onClose`, `onCreate`, `onTemplate` | Modal with project type selection (Website/Mobile), template strip, Cancel/Continue buttons |
| `SettingsModal` | `src/App.tsx:186` | 186–188 | `theme`, `setTheme`, `apiKeyInput`, `setApiKeyInput`, `apiKeySaving`, `apiKeySaved`, `setApiKeySaving`, `setApiKeySaved`, `onClose`, `showToast` | Modal with theme dropdown, API key input + save button, secure note |
| `HistoryModal` | `src/App.tsx:190` | 190–192 | `project`, `onClose`, `onRestore` | Modal listing all snapshots with Restore buttons |
| `Toasts` | `src/App.tsx:194` | 194 | `toasts` | Fixed bottom-right toast notifications |

### 3.3 Dashboard View — Section-by-Section

| Section | App.tsx Line | CSS Class(es) | Key Elements |
|---------|-------------|---------------|--------------|
| **Topbar** | 126–128 | `.topbar`, `.brand-lockup`, `.brand-mark`, `.topbar-user`, `.user-pill`, `.ghost-button` | AppForge logo (Sparkles icon), user email pill, Sign Out button |
| **Hero Card** | 132–137 | `.hero-card`, `.panel-card`, `.eyebrow`, `.light-action` | "Build apps with AI. Zero friction." headline, description, "New Project" button → opens modal |
| **Guide Card** | 138–141 | `.guide-card`, `.section-label`, `.guide-list` | 3-step platform guide (01, 02, 03) |
| **Beast Mode Banner** | 143–146 | `.beast-banner`, `.beast-icon`, `.beast-copy`, `.pipeline`, `.beast-action` | Flame icon, "Hard Coding Mode BEAST MODE" title, dual-phase pipeline diagram, "Launch Beast Mode" button |
| **Project Toolbar** | 147 | `.project-toolbar`, `.search-field`, `.sort-button` | Search input (filters projects by name), sort dropdown button |
| **Workspace Heading** | 148 | `.workspace-heading` | "ACTIVE WORKSPACES (N)" label with Clock3 icon |
| **Project Grid** | 149–152 | `.project-grid`, `.project-card`, `.panel-card`, `.project-card-top`, `.project-symbol`, `.icon-button`, `.project-card-bottom`, `.status-dot`, `.orange-link`, `.new-project-card` | Map of project cards (name, description, last-updated, open/delete) + dashed "New Project" tile |
| **NewProjectModal** | 154 | `.modal-backdrop`, `.modal-card`, `.creation-options`, `.template-strip`, `.modal-footer` | Website/Mobile type selector, template buttons, Cancel/Continue |

### 3.4 Workspace View — Section-by-Section

| Section | App.tsx Line | CSS Class(es) | Key Elements |
|---------|-------------|---------------|--------------|
| **Workspace Topbar** | 161 | `.workspace-topbar`, `.back-button`, `.workspace-title`, `.brand-mark.small`, `.draft-tag`, `.workspace-actions`, `.workspace-link`, `.publish-button` | Back arrow, inline-editable project name, "draft" tag, Versions/Export/Settings/Publish buttons |
| **File Sidebar** | 163 | `.file-sidebar`, `.sidebar-title`, `.file-row`, `.file-icon`, `.PanelLeftClose` | Collapsible file list with monospace icons (◇ HTML, # CSS, ›_ JS), active file highlighted with orange left-border |
| **Sidebar Toggle** | 164 | `.sidebar-open`, `.PanelLeft` | Appears when sidebar is collapsed; clicking reopens it |
| **Preview Toolbar** | 166 | `.preview-toolbar`, `.browser-chrome`, `.traffic`, `.url-bar`, `.device-switcher`, `.live-status` | Traffic-light dots, URL bar showing `appforge.preview/{name}`, Desktop/Tablet/Mobile toggle buttons, Live status, Refresh + Open-in-new-tab buttons |
| **Runtime Error Banner** | 167 | `.runtime-banner` | Shows runtime errors from preview iframe with "Fix automatically" button and dismiss (X) |
| **Preview Frame** | 168–171 | `.preview-frame`, `.preview-frame.mobile`, `.preview-frame.tablet`, `.preview-iframe`, `.generation-overlay`, `.code-editor`, `.code-tabs` | Either `<iframe>` (preview mode) or code editor (code mode). Generation overlay appears during AI building. |
| **AI Sidebar** | 173 | `.ai-sidebar`, `.ai-header`, `.ai-agent`, `.chat-scroll`, `.chat-message`, `.build-message`, `.retry-button`, `.quick-prompts`, `.chat-composer` | AI Agent header with status, scrollable chat messages, build progress indicator, retry button, 6 quick-prompt chips, textarea + send button |

### 3.5 Modals — Section-by-Section

| Modal | Trigger | Key Interactive Elements |
|-------|---------|--------------------------|
| **NewProjectModal** | "New Project" button (dashboard) or "Launch Beast Mode" | Website/Mobile radio-style cards (Globe/DevicePhone icons), template strip (first 3 templates), Cancel + Continue buttons |
| **SettingsModal** | Settings icon (workspace topbar) | Theme dropdown (Dark/Light), API key password input + Save button, secure-note with ShieldCheck icon, Done button |
| **HistoryModal** | "Versions" button (workspace topbar) | List of snapshots with label + timestamp, Restore button per snapshot |

---

## 4. State & Functions Index

### 4.1 State Variables (all in `App` component)

| Variable | Type | Initial Value | Line | Purpose |
|----------|------|---------------|------|---------|
| `currentView` | `ViewType` | `"dashboard"` | 23 | Controls which view is rendered: `"dashboard"` or `"workspace"` |
| `newAppModalOpen` | `boolean` | `false` | 24 | Controls visibility of New Project modal |
| `selectedCreationType` | `ProjectType` | `"website"` | 25 | Selected project type in New Project modal |
| `theme` | `Theme` | `"dark"` | 26 | UI theme (currently dark-only design) |
| `settingsModalOpen` | `boolean` | `false` | 27 | Controls visibility of Settings modal |
| `historyModalOpen` | `boolean` | `false` | 28 | Controls visibility of Version History modal |
| `projects` | `Project[]` | `[VibeCart seed]` | 29–35 | Array of all projects; seeded with one VibeCart E-Commerce project |
| `activeProjectId` | `string` | `"proj-1"` | 36 | ID of the currently open project |
| `workspaceTab` | `"preview" \| "code"` | `"preview"` | 38 | Toggles between iframe preview and code editor |
| `previewDevice` | `PreviewDevice` | `"desktop"` | 39 | Current preview device: desktop, tablet, or mobile |
| `activeFile` | `string` | `"index.html"` | 40 | Currently selected file in code editor |
| `editedCode` | `string` | `""` | 41 | Content of the code editor textarea |
| `chatInput` | `string` | `""` | 42 | Current text in chat composer |
| `isGenerating` | `boolean` | `false` | 43 | True while AI generation is in progress |
| `generationStep` | `string` | `""` | 44 | Current step description shown during generation |
| `generationProgress` | `number` | `0` | 45 | Progress percentage (0–100) during generation |
| `runtimeError` | `string \| null` | `null` | 46 | Runtime error captured from preview iframe |
| `lastFailedPrompt` | `string \| null` | `null` | 47 | Stores last failed prompt for retry functionality |
| `toasts` | `Toast[]` | `[]` | 48 | Active toast notifications |
| `apiKeyInput` | `string` | `""` | 49 | Input value for API key in Settings modal |
| `apiKeySaving` | `boolean` | `false` | 50 | True while API key is being saved |
| `apiKeySaved` | `boolean` | `false` | 51 | True after API key has been saved successfully |
| `previewKey` | `number` | `0` | 52 | Counter incremented to force iframe remount on refresh/update |
| `search` | `string` | `""` | 53 | Search query for filtering projects on dashboard |
| `sidebarOpen` | `boolean` | `true` | 54 | Controls file sidebar visibility in workspace |

### 4.2 Derived Values (useMemo)

| Variable | Line | Purpose |
|----------|------|---------|
| `activeProject` | 37 | Finds the project matching `activeProjectId` from `projects` array; falls back to `projects[0]` |
| `bundleHtml` | 105–111 | Builds a complete HTML string by injecting `styles.css` into `<head>` and `app.js` into `<body>` of `index.html`. Used for "open in new tab" export. |
| `previewHtml` | 112–120 | Same as `bundleHtml` but also injects a `window.onerror` postMessage listener and wraps JS in try/catch to capture runtime errors. Used as `srcDoc` for the preview iframe. |
| `isDark` | 121 | Boolean: `theme === "dark"` |
| `filteredProjects` | 122 | Projects filtered by `search` string (case-insensitive name match) |

### 4.3 useRef

| Ref | Type | Line | Purpose |
|-----|------|------|---------|
| `chatEndRef` | `HTMLDivElement` | 55 | Attached to empty `<div>` at end of chat scroll area; used to auto-scroll to latest message |

### 4.4 useEffect Hooks

| Hook | Line | Dependencies | Purpose |
|------|------|-------------|---------|
| File sync | 57 | `activeProjectId`, `activeFile`, `activeProject` | Sets `editedCode` to the active file's content when project or file changes |
| Chat auto-scroll | 58 | `activeProject?.chatHistory`, `isGenerating` | Scrolls chat to bottom when new messages arrive or generation status changes |
| Runtime error listener | 59–62 | `[]` (mount once) | Adds `message` event listener on `window` to receive `RUNTIME_ERROR` postMessages from the preview iframe; cleans up on unmount |

### 4.5 useCallback

| Function | Line | Purpose |
|----------|------|---------|
| `showToast` | 63–66 | Creates a toast with unique ID, adds it to `toasts` array, auto-removes after 3500ms via `setTimeout` |

### 4.6 Functions

| Function | Line | Parameters | Returns | Purpose |
|----------|------|-----------|---------|---------|
| `formatUpdated` | 14–20 | `timestamp: number` | `string` | Converts timestamp to relative time string ("Xm ago", "Xh ago", "Xd ago") |
| `openProject` | 68–71 | `id: string`, `type?: ProjectType` | void | Sets active project ID, switches to workspace view, sets preview device based on project type |
| `handleStartNewProject` | 73–83 | `template?: Template \| null` | void | Creates a new Project object with unique ID, initial files (from template or blank), welcome chat message, and initial snapshot. Adds to projects array, opens workspace. |
| `handleSendMessage` | 85–103 | `customPrompt?: string \| null` | `Promise<void>` | Core AI interaction function. Adds user message to chat, calls `generateAppWithGemini`, merges returned files into project, creates snapshot, updates preview. Handles errors (rate limits, general) and adds error messages to chat. |
| `handleFixAutomatically` | *(inline at line 167)* | none | void | Calls `handleSendMessage` with a runtime-error-fixing prompt. Defined inline in the runtime banner button. |

### 4.7 Event Handlers (inline)

| Element | Line | Event | Action |
|---------|------|-------|--------|
| Project name input (workspace topbar) | 161 | `onChange` | Updates project name in `projects` state |
| File sidebar buttons | 163 | `onClick` | Sets `activeFile` and switches to `workspaceTab = "code"` |
| Sidebar collapse icon | 163 | `onClick` | Sets `sidebarOpen = false` |
| Sidebar reopen button | 164 | `onClick` | Sets `sidebarOpen = true` |
| Device switcher buttons | 166 | `onClick` | Sets `previewDevice` to "desktop", "tablet", or "mobile" |
| Refresh button | 166 | `onClick` | Increments `previewKey` to force iframe remount |
| Open in new tab button | 166 | `onClick` | Creates blob URL from `bundleHtml`, opens in new tab, revokes after 10s |
| Runtime error "Fix automatically" | 167 | `onClick` | Calls `handleSendMessage` with error-fixing prompt |
| Runtime error dismiss (X) | 167 | `onClick` | Sets `runtimeError = null` |
| Code file tabs | 170 | `onClick` | Sets `activeFile` to clicked filename |
| Save file button | 170 | `onClick` | Updates project files with `editedCode`, increments `previewKey`, switches to preview, shows toast |
| Code editor textarea | 170 | `onChange` | Sets `editedCode` to textarea value |
| Chat message textarea | 173 | `onChange` | Sets `chatInput` |
| Chat textarea | 173 | `onKeyDown` | Enter (without Shift) calls `handleSendMessage()` |
| Chat send button | 173 | `onClick` | Calls `handleSendMessage()` |
| Quick prompt buttons (×6) | 173 | `onClick` | Calls `handleSendMessage` with preset prompt string |
| Retry button | 173 | `onClick` | Clears `lastFailedPrompt`, re-sends the failed prompt |
| Search input (dashboard) | 147 | `onChange` | Sets `search` state |
| Delete project button | 150 | `onClick` | Filters project out of `projects`, shows toast |
| Open workspace link | 150 | `onClick` | Calls `openProject(p.id)` |
| New Project button (dashboard hero) | 136 | `onClick` | Opens New Project modal |
| New Project tile (dashboard grid) | 151 | `onClick` | Opens New Project modal |
| Beast Mode button | 145 | `onClick` | Opens New Project modal + shows info toast |
| Back button (workspace) | 161 | `onClick` | Sets `currentView = "dashboard"` |
| Versions button | 161 | `onClick` | Opens History modal |
| Settings button | 161 | `onClick` | Opens Settings modal |
| Theme dropdown (Settings) | 187 | `onChange` | Sets `theme` |
| API key input (Settings) | 187 | `onChange` | Sets `apiKeyInput`, resets `apiKeySaved` |
| Save key button (Settings) | 187 | `onClick` | POSTs API key to `save-api-key` edge function; handles success/error |
| Restore snapshot (History) | 176 | `onClick` | Replaces project files with snapshot files, closes modal, refreshes preview, shows toast |

### 4.8 API Calls

| Call | File | Line | Method | Endpoint | Purpose |
|------|------|------|--------|----------|---------|
| `generateAppWithGemini` | `src/geminiClient.ts:35` | 35 | POST | `${VITE_SUPABASE_URL}/functions/v1/generate-app` | Sends prompt + existing files + project type; receives AI-generated files |
| Save API key | `src/App.tsx:187` | 187 | POST | `${VITE_SUPABASE_URL}/functions/v1/save-api-key` | Sends API key to be stored securely in `app_secrets` table |
| Gemini API (server-side) | `supabase/functions/generate-app/index.ts:54` | 54 | POST | `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key={key}` | Calls Google Gemini with system instruction + prompt |
| Supabase query (server-side) | `supabase/functions/generate-app/index.ts:262` | 262 | SELECT | `app_secrets` table | Fetches saved Gemini API key |
| Supabase upsert (server-side) | `supabase/functions/save-api-key/index.ts:30` | 30 | UPSERT | `app_secrets` table | Stores/updates Gemini API key |

---

## 5. CSS & Styling Map

### 5.1 Font Imports (`src/index.css:1`)

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Inter:wght@400;500;600;700;800&display=swap');
```

| Font | Used For |
|------|---------|
| **Inter** | All UI text (body, headings, buttons, labels, descriptions) |
| **DM Mono** | Monospace labels, file names, URLs, timestamps, status indicators, code editor |

### 5.2 Tailwind Directives (`src/index.css:2-4`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Tailwind is configured with content scanning of `./index.html` and `./src/**/*.{js,ts,jsx,tsx}`. No theme extensions. The app primarily uses custom CSS classes rather than Tailwind utility classes in JSX.

### 5.3 CSS Custom Class Map

| Class Name | CSS Line | Used In | Purpose |
|------------|---------|---------|---------|
| `.app-shell` | 13 | Dashboard root div | min-height: 100vh, letter-spacing |
| `.workspace-shell` | 13 | Workspace root div | min-height: 100vh, letter-spacing |
| `.topbar` | 14 | Dashboard header | 62px height, border-bottom, flex layout, dark bg (#090909) |
| `.workspace-topbar` | 14, 43 | Workspace header | 44px height (overridden), border, flex, dark bg |
| `.brand-lockup` | 15 | Dashboard brand area | Flex, 800 weight, 17px, -0.04em letter-spacing |
| `.workspace-title` | 15, 43 | Workspace title area | Flex, 13px, flex:1 |
| `.brand-mark` | 16 | Logo icon container | 34×34px, light bg (#f3f1ed), border, 9px radius, grid center |
| `.brand-mark.small` | 17 | Workspace/AI sidebar logo | 27×27px, 7px radius |
| `.topbar-user` | 18 | Dashboard top-right area | Flex, gap:10px |
| `.workspace-actions` | 18, 44 | Workspace top-right buttons | Flex, gap:3px |
| `.device-switcher` | 18, 44 | Preview device toggle | Flex, gap:8px |
| `.user-pill` | 19 | Email display | Monospace, dark bg, border, 9px radius |
| `.draft-tag` | 19 | "draft" label in workspace | Same style as user-pill |
| `.ghost-button` | 20 | Sign Out, Cancel buttons | Dark bg, border, flex, 12px |
| `.workspace-link` | 20, 44 | Versions, Export, Settings buttons | Same as ghost-button |
| `.dashboard-main` | 22 | Dashboard main content | Max-width 1240px, auto margins, padding |
| `.dashboard-hero-grid` | 23 | Hero + Guide container | CSS Grid, 1.35fr 1fr, 24px gap |
| `.panel-card` | 24 | Hero, Guide, Project cards | Dark bg (#0c0c0c), border, 15px radius, shadow |
| `.hero-card` | 25 | Hero section | Padding, min-height 235px |
| `.eyebrow` | 26 | Small label above hero | Monospace, 11px, flex with gap |
| `.section-label` | 26 | Guide card header | Same as eyebrow |
| `.hero-card h1` | 28 | Hero headline | 38px, 800 weight, -0.06em letter-spacing |
| `.hero-card h1 span` | 29 | "Zero friction." text | Muted color (#99958f), 400 weight |
| `.hero-card p` | 30 | Hero description | Max-width 620px, muted, 13px, 1.7 line-height |
| `.light-action` | 31, 32 | "New Project" button (hero) | Light bg (#f4f2ef), dark text, hover lift |
| `.orange-action` | 31, 42 | Continue, Save key, Restore, Done buttons | Orange-red gradient, white text |
| `.publish-button` | 31, 44 | Publish button | Light bg, dark text |
| `.beast-action` | 31, 42 | Launch Beast Mode button | Orange-red gradient |
| `.guide-card` | 34 | Guide card | Padding 28px 26px |
| `.guide-list` | 36 | Guide steps container | CSS Grid, 10px gap |
| `.guide-list div` | 37 | Individual guide step | Flex, border, dark bg, 12px text |
| `.guide-list b` | 38 | Step number (01, 02, 03) | Monospace, light color |
| `.beast-banner` | 40 | Beast Mode section | Gradient bg, border, flex, inset shadow |
| `.beast-icon` | 41 | Flame icon container | 56×56px, orange-red gradient, white |
| `.beast-copy` | 42 | Beast Mode text area | flex:1 |
| `.pipeline` | 42 | Phase 1 → Phase 2 diagram | Flex, monospace, nowrap |
| `.project-toolbar` | 43 | Search + sort row | Flex, 12px gap, margin |
| `.search-field` | 43 | Search input container | Flex, dark bg, border, 10px radius |
| `.sort-button` | 43 | Sort dropdown | Flex, monospace, dark bg |
| `.workspace-heading` | 43 | "ACTIVE WORKSPACES" label | Monospace, flex, muted color |
| `.project-grid` | 43 | Project cards grid | 3-column grid, 18px gap |
| `.project-card` | 43 | Individual project card | Min-height 197px, flex column |
| `.project-card-top` | 43 | Card top row (icon + menu) | Flex, space-between |
| `.project-symbol` | 43 | Sparkles icon in card | 38×38px, orange, border |
| `.icon-button` | 43 | Card menu button | Transparent, muted color |
| `.project-card-bottom` | 43 | Card footer row | Flex, space-between, top border |
| `.status-dot` | 43 | Last-updated text | Monospace, green first-letter |
| `.orange-link` | 43 | "Open workspace" link | Orange (#ff6a1a), transparent bg |
| `.new-project-card` | 43 | Dashed new project tile | Dashed border, centered flex |
| `.back-button` | 44 | Back arrow | Transparent, 28px font |
| `.workspace-body` | 44 | 3-column workspace layout | Grid: 164px / 1fr / 316px |
| `.file-sidebar` | 44 | File list panel | Dark bg, right border, padding-top |
| `.sidebar-title` | 44 | "Files" header | Flex, space-between, 12px |
| `.file-row` | 44 | Individual file button | Monospace, left border, flex |
| `.file-icon` | 44 | File type icon (◇, #, ›_) | Orange, 14px width |
| `.sidebar-open` | 44 | Sidebar reopen button | Absolute positioned, small |
| `.preview-area` | 44 | Preview container | Flex column, dark bg (#060606) |
| `.preview-toolbar` | 44 | Browser chrome bar | 40px height, flex, space-between |
| `.browser-chrome` | 44 | Traffic lights + URL | Flex, gap:8px |
| `.traffic` | 44 | Traffic light dot | 9×9px circle |
| `.traffic.red` | 44 | Red dot | bg: #e53b5e |
| `.traffic.yellow` | 44 | Yellow dot | bg: #e2a234 |
| `.traffic.green` | 44 | Green dot | bg: #31b87c |
| `.url-bar` | 44 | URL display | Monospace, 165px, ellipsis |
| `.device-switcher button` | 44 | Device toggle buttons | Transparent, muted |
| `.device-switcher button.selected` | 44 | Active device button | Light text, bg #262626 |
| `.live-status` | 44 | "● Live" indicator | Green (#39dc89), monospace |
| `.preview-frame` | 44 | Preview container | Flex, centered, padding |
| `.preview-frame.mobile` | 44 | Mobile preview | Side padding 24% |
| `.preview-frame.tablet` | 44 | Tablet preview | Side padding 10% |
| `.preview-iframe` | 44 | Preview iframe element | 100% w/h, border, white bg, 8px radius |
| `.preview-frame.mobile .preview-iframe` | 44 | Mobile iframe | 22px radius, 7px border |
| `.code-editor` | 44 | Code editor container | Flex column, border, dark bg |
| `.code-tabs` | 44 | File tab bar | Flex, gap, border-bottom |
| `.code-tabs button` | 44 | File tab | Monospace, transparent |
| `.code-tabs button.selected` | 44 | Active tab | White text, bg #242424 |
| `.code-tabs .save-code` | 44 | Save file button | margin-left:auto, orange bg |
| `.code-editor textarea` | 44 | Code editing area | Monospace, dark bg, 18px padding |
| `.ai-sidebar` | 44 | AI chat panel | Flex column, left border, dark bg |
| `.ai-header` | 44 | AI panel header | 40px height, flex, space-between |
| `.ai-agent` | 44 | Agent identity block | Flex, gap:8px |
| `.green-dot` | 44 | Status indicator dot | 6×6px circle, green (#35d58a) |
| `.chat-scroll` | 44 | Chat messages scroll area | Flex:1, overflow auto, gap:11px |
| `.chat-message` | 44 | Individual chat bubble | Max-width 91%, 11px, 11px radius |
| `.chat-message.user` | 44 | User message bubble | Light bg (#f0eee9), dark text |
| `.chat-message.assistant` | 44 | AI message bubble | Dark bg (#181818), muted text, border |
| `.chat-message small` | 44 | Changes summary | Orange text, top border, 9px |
| `.build-message` | 44 | Build progress indicator | Dark bg, border, monospace |
| `.mini-progress` | 44 | Mini progress bar | 5px height, dark track |
| `.progress-track` | 44 | Full progress bar | 5px (overridden to 6px), 240px width |
| `.mini-progress div, .progress-track div` | 44 | Progress bar fill | Orange-red gradient, transition |
| `.retry-button` | 44 | Retry failed request | Dark red bg, orange text |
| `.quick-prompts` | 44 | Quick prompt chips container | Flex wrap, gap, top border |
| `.quick-prompts button` | 44 | Individual quick prompt chip | Monospace, 9px, dark bg, border |
| `.chat-composer` | 44 | Chat input area | Flex, gap:7px, top border |
| `.chat-composer textarea` | 44 | Chat input textarea | Flex:1, dark bg, border, 11px |
| `.chat-composer button` | 44 | Send button | 32×32px, orange bg, white |
| `.runtime-banner` | 44 | Runtime error display | Absolute, dark red bg, red text |
| `.generation-overlay` | 44 | Building overlay | Absolute, near-opaque dark bg, grid center |
| `.generation-mark` | 44 | Building icon | 56×56px, orange gradient, pulse animation |
| `.modal-backdrop` | 44 | Modal overlay | Fixed inset, dark blur, grid center |
| `.modal-card` | 44 | Modal container | Max 620px, dark bg, border, 15px radius |
| `.modal-heading` | 44 | Modal header section | Relative, bottom border |
| `.creation-options` | 44 | New project type grid | 2-column grid, 10px gap |
| `.creation-options button` | 44 | Type selection card | Flex column, dark bg, border |
| `.creation-options button.selected` | 44 | Selected type card | Orange border, dark orange bg |
| `.template-strip` | 44 | Template buttons row | Flex wrap, top border |
| `.modal-footer` | 44 | Modal button row | Flex, right-aligned, gap |
| `.settings-card label` | 44 | Settings form label | Block, 11px, muted |
| `.key-row` | 44 | API key input + button | Flex, gap:7px |
| `.secure-note` | 44 | Security note box | Flex, dark bg, border, 10px text |
| `.history-list` | 44 | Snapshot list | Grid, 8px gap |
| `.history-row` | 44 | Individual snapshot row | Flex, space-between, dark bg |
| `.toast-stack` | 44 | Toast container | Fixed bottom-right, grid |
| `.toast` | 44 | Individual toast | Dark bg, border, shadow, flex |
| `.success-icon` | 44 | Success toast icon | Green (#3bd28a) |
| `.error-icon` | 44 | Error toast icon | Red (#f35b5b) |

### 5.4 Animations

| Name | CSS Line | Duration | Applied To | Effect |
|------|---------|----------|-----------|--------|
| `pulse` | 45 | 1.6s infinite | `.generation-mark` (line 44) | Scale 1→1.04 + opacity 1→0.8 and back |

### 5.5 Responsive Breakpoints

| Breakpoint | CSS Line | Key Changes |
|-----------|---------|-------------|
| `max-width: 950px` | 46 | Hero grid → 1 column; Beast banner wraps; Pipeline goes full width; Project grid → 2 columns; Workspace body → 2 columns (sidebar + preview); AI sidebar becomes absolute positioned overlay; Workspace link buttons hidden |
| `max-width: 650px` | 47 | Topbar padding reduced; User pill hidden; Dashboard padding reduced; Hero card padding/font reduced; Beast banner/icon/action go full width; Project grid → 1 column; Workspace body → block (no grid); File sidebar hidden; URL bar narrower; Mobile preview padding reduced; AI sidebar width capped at 90vw; Project name input narrower; Creation options → 1 column; Pipeline font smaller; Beast title smaller |

### 5.6 Icon Usage Map (lucide-react)

| Icon | Imported As | Used In |
|------|------------|---------|
| `Sparkles` | `Sparkles` | Brand logo (dashboard + workspace + AI sidebar), hero eyebrow, project symbol, generation overlay |
| `Monitor` | `Monitor` | Desktop device toggle button |
| `Tablet` | `Tablet` | Tablet device toggle button |
| `Smartphone` | `Smartphone` | Mobile device toggle button |
| `RefreshCw` | `RefreshCw` | Refresh preview button |
| `ExternalLink` | `ExternalLink` | Open preview in new tab button |
| `Code2` | `Code2` | Guide card label, Beast Mode pipeline Phase 1 |
| `Settings` | `Settings` | Settings button (workspace topbar) |
| `History` | `History` | Versions button (workspace topbar) |
| `Plus` | `Plus` | New Project buttons, Continue button, new project tile |
| `Trash2` | `Trash2` | Imported but not currently rendered in the redesigned UI |
| `Send` | `Send` | Chat send button |
| `Check` | `Check` | Toast notification icon |
| `Globe` | `Globe` | Website/Web App option in New Project modal |
| `Smartphone` | `DevicePhone` | Mobile App option in New Project modal |
| `KeyRound` | `KeyRound` | Imported but not currently rendered in the redesigned UI |
| `Search` | `Search` | Project search field (dashboard) |
| `ChevronDown` | `ChevronDown` | Sort dropdown button |
| `ChevronRight` | `ChevronRight` | Open workspace link, Beast Mode pipeline arrow |
| `Terminal` | `Terminal` | Imported but not currently rendered |
| `Download` | `Download` | Sign Out button (dashboard), Export button (workspace) |
| `Rocket` | `Rocket` | Publish button, Launch Beast Mode button |
| `Flame` | `Flame` | Beast Mode icon |
| `X` | `X` | Modal close buttons, runtime error dismiss |
| `Clock3` | `Clock3` | Active workspaces heading |
| `PanelLeftClose` | `PanelLeftClose` | File sidebar collapse button |
| `PanelLeft` | `PanelLeft` | File sidebar reopen button |
| `MoreHorizontal` | `MoreHorizontal` | Project card menu button, AI header button |
| `Copy` | `Copy` | Imported but not currently rendered |
| `WandSparkles` | `WandSparkles` | New Project modal eyebrow, Beast Mode pipeline Phase 2 |
| `ShieldCheck` | `ShieldCheck` | Settings modal secure note |
| `Zap` | `Zap` | Imported but not currently rendered |

---

## 6. Supabase Edge Functions

### 6.1 `generate-app` Edge Function

**File:** `supabase/functions/generate-app/index.ts` (330 lines)  
**Runtime:** Deno  
**JWT Verification:** Disabled (`verify_jwt = false` in config.toml)

#### Constants

| Name | Line | Value | Purpose |
|------|------|-------|---------|
| `corsHeaders` | 3–7 | Standard CORS headers | Required for Supabase client acceptance |
| `GEMINI_MODEL` | 9 | `"gemini-3.5-flash-lite"` | Google Gemini model identifier |
| `SYSTEM_INSTRUCTION` | 11–35 | Multi-line string | Full system prompt defining AI behavior, JSON output schema, and 10 critical rules |
| `FALLBACK_KEYS` | 71–79 | Array of 7 API key strings | Pre-configured API keys for rotation |
| `KEY_COOLDOWN_MS` | 85 | `60_000` (60 seconds) | Cooldown before exhausted keys are re-included in pool |

#### Module-Level State

| Variable | Line | Type | Purpose |
|----------|------|------|---------|
| `rotationIndex` | 81 | `number` | Tracks which key to try next (round-robin) |
| `exhaustedKeys` | 82 | `Set<string>` | Keys that hit limits or errors |
| `exhaustedAt` | 83 | `number` | Timestamp of last exhaustion (for cooldown) |

#### Functions

| Function | Lines | Parameters | Returns | Purpose |
|----------|-------|-----------|---------|---------|
| `buildPromptText` | 37–51 | `prompt: string`, `pType: string`, `existingFiles?: Record<string, string>` | `string` | Constructs the full text prompt sent to Gemini. Includes user prompt, project type, and existing file contents (if any). |
| `callGemini` | 53–69 | `apiKey: string`, `promptText: string` | `Promise<Response>` | Makes a single HTTP POST to the Gemini API endpoint with the given key and prompt. |
| `getAvailableKeys` | 87–98 | `primaryKeys: string[]` | `string[]` | Returns all non-exhausted keys (primary + fallback). Clears exhaustion if cooldown has passed. Falls back to all keys if pool is empty. |
| `markKeyExhausted` | 100–103 | `key: string` | `void` | Adds key to `exhaustedKeys` set and updates `exhaustedAt` timestamp. |
| `callGeminiWithRotation` | 105–150 | `primaryKeys: string[]`, `promptText: string` | `{ ok: true; response: Response } \| { ok: false; error: string }` | **Core rotation logic.** Iterates through available keys starting from `rotationIndex`. On success: updates rotation index, returns response. On 429/503: marks key exhausted, waits 800ms, continues. On invalid key (403): marks exhausted, continues. On 5xx: marks exhausted, waits 1200ms, continues. On other errors: breaks. Returns error if all keys exhausted. |
| `tryParseJson` | 152–227 | `rawText: string` | `{ parsed: Record<string, unknown> \| null; truncated: boolean }` | Parses Gemini's JSON response. Strips markdown code fences. On parse failure, attempts to salvage truncated JSON by counting open quotes/braces and closing them. |

#### Main Handler (`Deno.serve`, lines 229–329)

| Step | Line | Action |
|------|------|--------|
| 1. CORS preflight | 230–232 | Returns 200 with CORS headers for OPTIONS requests |
| 2. Parse body | 234–240 | Extracts `prompt`, `existingFiles`, `projectType` from request JSON |
| 3. Validate prompt | 242–247 | Returns 400 if prompt is missing or not a string |
| 4. Build prompt text | 249–250 | Calls `buildPromptText` with prompt, project type, and existing files |
| 5. Create Supabase client | 252–255 | Uses service role key for privileged access |
| 6. Collect primary keys | 257–268 | Gathers keys from `GEMINI_API_KEY` env var and `app_secrets` table |
| 7. Call Gemini with rotation | 270–279 | Calls `callGeminiWithRotation` with all primary keys + fallback keys |
| 8. Parse Gemini response | 281–284 | Extracts `candidates[0].content.parts[0].text` and `finishReason` |
| 9. Validate response text | 286–291 | Returns 502 if no text returned |
| 10. Parse JSON | 293–304 | Calls `tryParseJson`; returns error if parse fails (with MAX_TOKENS-specific message) |
| 11. Validate files object | 306–312 | Returns 502 if `files` is missing or not an object |
| 12. Add truncation note | 314–317 | Appends truncation warning to explanation if JSON was salvaged |
| 13. Return result | 319–322 | Returns JSON with `explanation`, `changesSummary`, and `files` |
| 14. Error catch | 323–328 | Returns 500 with error message for any unhandled exception |

### 6.2 `save-api-key` Edge Function

**File:** `supabase/functions/save-api-key/index.ts` (55 lines)  
**Runtime:** Deno  
**JWT Verification:** Disabled

#### Main Handler (`Deno.serve`, lines 9–54)

| Step | Line | Action |
|------|------|--------|
| 1. CORS preflight | 10–12 | Returns 200 with CORS headers for OPTIONS |
| 2. Parse body | 14–16 | Extracts `apiKey` from request JSON |
| 3. Validate | 18–23 | Returns 400 if key is missing or shorter than 10 characters |
| 4. Create Supabase client | 25–28 | Uses service role key |
| 5. Upsert key | 30–35 | Upserts `{ key: "gemini_api_key", value: apiKey, updated_at }` into `app_secrets` table with `onConflict: "key"` |
| 6. Handle error | 37–42 | Returns 500 if upsert fails |
| 7. Return success | 44–47 | Returns `{ success: true, message: "API key saved successfully" }` |
| 8. Error catch | 48–53 | Returns 500 for unhandled exceptions |

---

## 7. Database Schema

### Table: `app_secrets`

**Migration:** `supabase/migrations/20260916111228_create_app_secrets_table.sql`

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `key` | `text` | PRIMARY KEY | Secret identifier (e.g., `"gemini_api_key"`) |
| `value` | `text` | NOT NULL | The secret value (API key string) |
| `created_at` | `timestamptz` | DEFAULT `now()` | Row creation timestamp |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Last update timestamp |

**Security:**
- Row Level Security: **ENABLED** (line 25)
- Policies: **NONE** — table is only accessible via the service role key (used in edge functions). The `anon` and `authenticated` roles cannot read or write. This ensures API keys are never exposed to the browser.

---

## 8. Data Flow

### 8.1 Application Startup

```
index.html
  └─ loads /src/main.tsx
       └─ imports src/index.css (fonts + Tailwind + custom CSS)
       └─ creates React root on #root
       └─ renders <App /> inside <StrictMode>
            └─ useState initializes:
                 • currentView = "dashboard"
                 • projects = [VibeCart seed project]
                 • activeProjectId = "proj-1"
                 • theme = "dark"
            └─ Dashboard view renders
```

### 8.2 Project Creation Flow

```
User clicks "New Project"
  └─ setNewAppModalOpen(true)
       └─ NewProjectModal renders
            ├─ User selects Website or Mobile → setSelectedCreationType()
            ├─ User clicks a template → handleStartNewProject(template)
            └─ User clicks Continue → handleStartNewProject(null)
                 ├─ Creates newId = `proj-${Date.now()}`
                 ├─ Determines pType from template or selectedCreationType
                 ├─ Gets initialFiles from template.files or createBlankFiles(pType)
                 ├─ Creates newProj object with:
                 │    • id, name, projectType, description, updatedAt
                 │    • files (initialFiles)
                 │    • chatHistory (welcome message)
                 │    • snapshots (initial snapshot)
                 ├─ setProjects(prev => [newProj, ...prev])
                 ├─ setActiveProjectId(newId)
                 ├─ setNewAppModalOpen(false)
                 ├─ setCurrentView("workspace")
                 ├─ setPreviewDevice based on pType
                 └─ showToast("New project created!")
```

### 8.3 AI Generation Flow

```
User types in chat composer and presses Enter (or clicks Send)
  └─ handleSendMessage(customPrompt | null)
       ├─ Gets promptToSend from customPrompt or chatInput.trim()
       ├─ Guards: returns if empty or already generating
       ├─ setChatInput("") — clears input
       ├─ setIsGenerating(true)
       ├─ setRuntimeError(null)
       ├─ setGenerationStep("Analyzing current project...")
       ├─ setGenerationProgress(20)
       ├─ Adds user message to activeProject.chatHistory
       ├─ Calls generateAppWithGemini({ prompt, existingFiles, projectType, onProgress })
       │    └─ geminiClient.ts:
       │         ├─ onProgress("Understanding your request...", 15)
       │         ├─ Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from env
       │         ├─ onProgress("Planning application architecture...", 40)
       │         ├─ POST to /functions/v1/generate-app
       │         │    └─ Edge function (generate-app/index.ts):
       │         │         ├─ Parses request body (prompt, existingFiles, projectType)
       │         │         ├─ buildPromptText() constructs full prompt
       │         │         ├─ Collects primary keys (env var + app_secrets table)
       │         │         ├─ callGeminiWithRotation():
       │         │         │    ├─ getAvailableKeys() — filters out exhausted keys
       │         │         │    ├─ Loops through available keys starting from rotationIndex
       │         │         │    ├─ callGemini(key, promptText) — POST to Google API
       │         │         │    ├─ On 200: updates rotationIndex, returns response
       │         │         │    ├─ On 429/503: markKeyExhausted, wait 800ms, try next
       │         │         │    ├─ On 403/invalid: markKeyExhausted, try next
       │         │         │    └─ On 5xx: markKeyExhausted, wait 1200ms, try next
       │         │         ├─ Parses Gemini response (candidates[0].content.parts[0].text)
       │         │         ├─ tryParseJson() — parses JSON, salvages truncated responses
       │         │         ├─ Validates files object exists
       │         │         └─ Returns { explanation, changesSummary, files }
       │         ├─ onProgress("Generating code with Gemini...", 70)
       │         ├─ Receives HTTP response
       │         ├─ onProgress("Validating generated application...", 90)
       │         └─ Returns GeminiResponse to App.tsx
       ├─ On success:
       │    ├─ Merges response.files into activeProject.files
       │    ├─ Creates new snapshot with timestamp and label
       │    ├─ Adds assistant message (explanation + changesSummary) to chatHistory
       │    ├─ Updates project updatedAt
       │    ├─ setPreviewKey(k => k + 1) — forces iframe remount
       │    ├─ setLastFailedPrompt(null)
       │    └─ showToast("Application updated successfully!", "success")
       ├─ On error:
       │    ├─ Sets lastFailedPrompt for retry
       │    ├<arg_value> Detects rate limit (429 / "rate limit" / "quota")
       │    ├─ Shows appropriate error toast
       │    └─ Adds error message to chatHistory as assistant message
       └─ finally:
            ├─ setIsGenerating(false)
            ├─ setGenerationStep("")
            └─ setGenerationProgress(0)
```

### 8.4 Preview Rendering Flow

```
activeProject.files changes (or previewKey increments)
  └─ previewHtml useMemo recalculates:
       ├─ Gets index.html from files
       ├─ If styles.css exists: injects <style> tag before </head>
       ├─ Injects window.onerror postMessage listener before </head>
       ├─ If app.js exists: injects <script> with try/catch before </body>
       └─ Returns complete HTML string
  └─ iframe srcDoc={previewHtml} renders the bundled page
       ├─ If runtime error occurs inside iframe:
       │    └─ window.onerror fires → postMessage to parent
       │         └─ Parent window "message" listener (useEffect, line 59):
       │              └─ setRuntimeError(error.message)
       │                   └─ Runtime banner renders with "Fix automatically" button
       └─ Sandbox attributes: allow-scripts, allow-modals, allow-forms, allow-same-origin
```

### 8.5 Code Editing Flow

```
User clicks a file in the file sidebar
  └─ setActiveFile(filename)
  └─ setWorkspaceTab("code")
       └─ useEffect (line 57) fires:
            └─ setEditedCode(activeProject.files[activeFile])
                 └─ Code editor textarea renders with file content
                      ├─ User edits code → setEditedCode(value)
                      └─ User clicks "Save file":
                           ├─ Updates activeProject.files[activeFile] = editedCode
                           ├─ Updates project updatedAt
                           ├─ setPreviewKey(k => k + 1) — refreshes preview
                           ├─ showToast("Saved changes to {filename}")
                           └─ Preview iframe remounts with updated content
```

### 8.6 Snapshot/Version History Flow

```
User clicks "Versions" in workspace topbar
  └─ setHistoryModalOpen(true)
       └─ HistoryModal renders:
            └─ Maps project.snapshots to rows:
                 ├─ Shows snapshot label + timestamp
                 └─ "Restore" button:
                      ├─ Replaces activeProject.files with snapshot.files
                      ├─ Updates project updatedAt
                      ├─ Closes modal
                      ├─ Increments previewKey (refreshes iframe)
                      └─ showToast("Snapshot restored successfully!")
```

### 8.7 API Key Save Flow

```
User opens Settings modal
  └─ Types API key into password input
  └─ Clicks "Save key"
       ├─ Validates key length >= 10
       ├─ setApiKeySaving(true)
       ├─ POST to /functions/v1/save-api-key:
       │    └─ Edge function:
       │         ├─ Validates key
       │         ├─ Creates Supabase client with service role
       │         ├─ Upserts { key: "gemini_api_key", value: apiKey } into app_secrets
       │         └─ Returns { success: true }
       ├─ On success:
       │    ├─ setApiKeySaved(true)
       │    ├─ setApiKeyInput("") — clears input
       │    └─ showToast("API key saved securely", "success")
       ├─ On error:
       │    └─ showToast(error message, "error")
       └─ finally:
            └─ setApiKeySaving(false)
```

### 8.8 API Key Rotation Flow (Server-Side, Transparent to User)

```
generate-app edge function receives request
  └─ Collects primary keys:
       ├─ Deno.env.get("GEMINI_API_KEY") (if set)
       └─ app_secrets table value (if saved)
  └─ Calls callGeminiWithRotation(primaryKeys, promptText)
       ├─ getAvailableKeys():
       │    ├─ Checks if cooldown (60s) has passed → clears exhaustedKeys if so
       │    ├─ Combines primaryKeys + FALLBACK_KEYS (7 keys)
       │    ├─ Filters out exhausted keys
       │    └─ Returns available pool (or all keys if pool empty)
       ├─ Iterates through pool starting from rotationIndex:
       │    ├─ Attempt 1: callGemini(key1, prompt)
       │    │    ├─ 200 OK → return response (rotationIndex advances)
       │    │    ├─ 429/503 → markKeyExhausted(key1), wait 800ms, continue
       │    │    ├─ 403 → markKeyExhausted(key1), continue
       │    │    └─ 5xx → markKeyExhausted(key1), wait 1200ms, continue
       │    ├─ Attempt 2: callGemini(key2, prompt) → ...
       │    ├─ ... continues through all available keys ...
       │    └─ If all exhausted: return { ok: false, error: "..." }
       └─ User never sees which key was used or that rotation occurred
```

---

## 9. Configuration Files

### 9.1 `vite.config.ts`

```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  optimizeDeps: { exclude: ['lucide-react'] },
});
```

| Setting | Value | Purpose |
|---------|-------|---------|
| `plugins` | `[react()]` | Enables JSX/TSX compilation |
| `resolve.alias['@']` | `./src` | Allows `@/components/Foo` imports instead of relative paths |
| `optimizeDeps.exclude` | `['lucide-react']` | Prevents Vite from pre-bundling lucide-react |

### 9.2 `tsconfig.app.json`

| Setting | Value | Purpose |
|---------|-------|---------|
| `target` | `ES2020` | JavaScript output target |
| `lib` | `["ES2020", "DOM", "DOM.Iterable"]` | Available type definitions |
| `moduleResolution` | `bundler` | Vite-compatible module resolution |
| `jsx` | `react-jsx` | JSX transform mode |
| `strict` | `true` | Full strict type checking |
| `paths['@/*']` | `["src/*"]` | Path alias for `@/` imports |
| `include` | `["src"]` | Only type-check `src/` directory |

### 9.3 `tailwind.config.js`

| Setting | Value |
|---------|-------|
| `content` | `['./index.html', './src/**/*.{js,ts,jsx,tsx}']` |
| `theme.extend` | `{}` (no extensions) |
| `plugins` | `[]` |

### 9.4 `postcss.config.js`

| Plugin | Purpose |
|--------|---------|
| `tailwindcss` | Processes Tailwind directives |
| `autoprefixer` | Adds vendor prefixes |

### 9.5 `supabase/config.toml`

```toml
[functions.generate-app]
verify_jwt = false

[functions.save-api-key]
verify_jwt = false
```

Both edge functions have JWT verification disabled, allowing the frontend to call them with just the anon key.

### 9.6 `eslint.config.js`

| Plugin | Purpose |
|--------|---------|
| `@eslint/js` | Recommended JS rules |
| `typescript-eslint` | TypeScript-specific rules |
| `eslint-plugin-react-hooks` | React hooks rules (exhaustive deps, etc.) |
| `eslint-plugin-react-refresh` | Warns on non-component exports |

### 9.7 Environment Variables

| Variable | Used In | Purpose |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | `src/geminiClient.ts:22`, `src/App.tsx:187` (Settings) | Supabase project URL for edge function calls |
| `VITE_SUPABASE_ANON_KEY` | `src/geminiClient.ts:23`, `src/App.tsx:187` (Settings) | Anon key for Authorization header |
| `SUPABASE_URL` | Edge functions (Deno.env) | Server-side Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge functions (Deno.env) | Service role key for privileged DB access |
| `GEMINI_API_KEY` | `generate-app/index.ts:259` (Deno.env) | Optional primary Gemini API key |

---

*This document is a read-only architectural reference. No application code, styles, or HTML were modified in its creation.*
