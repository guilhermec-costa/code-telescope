# Code Telescope

A Telescope-inspired fuzzy finder for VS Code, bringing the power and flexibility of Neovim's Telescope to Visual Studio Code.

![VS Code Marketplace installs](https://vsmarketplacebadges.dev/installs/guichina.code-telescope.svg)
![Open VSX downloads](https://img.shields.io/open-vsx/dt/guichina/code-telescope)
![VS Code Marketplace rating](https://vsmarketplacebadges.dev/rating/guichina.code-telescope.svg)
![License](https://img.shields.io/github/license/guilhermec-costa/code-telescope)

## Motivation

Telescope.nvim transformed navigation in Neovim with its extensible, keyboard-first fuzzy finder architecture. Code Telescope brings that same philosophy to VS Code — a single, powerful interface for navigating your entire project.

Find files instantly, search across your workspace, explore symbols, browse git branches, diffs and commits — all from one unified, consistent experience.

![Code Telescope Preview](images/preview.gif)

---

## Architecture Overview

```
+------------------------------------------------------------------+
|                     Extension Host (Backend)                     |
|                                                                  |
|   +---------------------------------------------------------+    |
|   |                    Finder Providers                     |    |
|   |                  @FuzzyFinderAdapter                    |    |
|   +---------------------------+-----------------------------+    |
|                               |                                  |
|   +---------------------------v-----------------------------+    |
|   |                  Presentation Layer                     |    |
|   |        WebviewController · Message Handlers             |    |
|   |              Registry Dispatch · HTML                   |    |
|   +---------------------------+-----------------------------+    |
+-------------------------------|----------------------------------+
                                |
                   +------------v------------+
                   |    Message Protocol     |
                   |   (Type-safe interface) |
                   +------------+------------+
                                |
+-------------------------------|----------------------------------+
|                               |            Webview (UI)          |
|   +---------------------------v-----------------------------+    |
|   |                  Presentation Layer                     |    |
|   |      WebviewController · Keyboard · Event Handling      |    |
|   +--------------+------------------------+-----------------+    |
|                  |                        |                      |
|   +--------------v----------+  +----------v------------------+   |
|   |      Data Adapters      |  |      Renderer Adapters      |   |
|   |      parse · filter     |  |       display previews      |   |
|   +-------------------------+  +-----------------------------+   |
+------------------------------------------------------------------+
```

The architecture is built on three core principles:

1. **Annotation-based adapters** — finders and renderers are registered via decorators, no manual wiring
2. **Clear separation** — backend (extension host) and UI (webview) communicate only through a typed message protocol
3. **Type-safe communication** — shared interfaces prevent integration bugs at compile time

---

## Core Concepts

### Finders (Backend)

Finders are data providers registered via `@FuzzyFinderAdapter`. Each finder queries data, provides previews, and handles selection.

```typescript
@FuzzyFinderAdapter({
  fuzzy: "workspace.files",
  previewRenderer: "preview.buffer",
})
export class WorkspaceFileProvider implements IFuzzyFinderProvider {
  async querySelectableOptions(): Promise<any> { ... }
  async getPreviewData(identifier: string): Promise<PreviewData> { ... }
  async onSelect(identifier: string): Promise<void> { ... }
}
```

### Data Adapters (UI)

UI-side adapters transform backend data into options and control how each item is rendered in the list.

```typescript
export class FileDataAdapter implements IFuzzyFinderDataAdapter {
  parseOptions(data: any): FileOption[] { ... }
  getSearchText(option: FileOption): string { ... }
  getHtmlWrapper(option: FileOption, highlighted: string): string { ... }
  getSelectionValue(option: FileOption): string { ... }
}
```

### Preview Renderers (UI)

Registered via `@PreviewRendererAdapter`, renderers transform raw preview data into visual output inside the preview panel.

| Renderer | Description |
|---|---|
| `preview.buffer` | Syntax-highlighted code with lazy chunk rendering |
| `preview.branch` | Git branch diff preview |
| `preview.image` | Image preview |
| `preview.font` | Font specimen preview |
| `preview.none` | No preview |

---

## Features

### Keyboard Navigation

| Key | Action |
|---|---|
| `↑/↓` or `Ctrl+K/J` | Navigate between items |
| `Ctrl+U/D` | Scroll preview up/down |
| `Ctrl+H/L` | Scroll preview left/right |
| `Enter` | Select item |
| `Esc` | Close finder |

### Vim Motion

The input panel supports Vim-style navigation. Press `Ctrl+[` or `Esc` to enter Normal mode.

| Motion | Description |
|---|---|
| `h/j/k/l` | Left/down/up/right |
| `w/b/e` / `W/B/E` | Word / WORD navigation |
| `0` / `$` / `^` | Line start / end / first non-blank |
| `f/F/t/T` | Find char forward/backward/till |
| `d/c/y` | Delete/change/yank (combine with motions) |
| `p/P` | Paste after/before |
| `u` / `Ctrl+R` | Undo / Redo |

### Dynamic Search

Finders can opt into dynamic search, where queries are sent to the backend for server-side filtering — useful for large datasets like workspace text search.

```typescript
export class WorkspaceTextSearchProvider implements IFuzzyFinderProvider {
  supportsDynamicSearch = true;
  async searchOnDynamicMode(query: string): Promise<any> { ... }
}
```

### Search Algorithms

Configure via `codeTelescope.matching.algorithm`:

| Algorithm | Description |
|---|---|
| `subsequence` (default) | fzf-style: matches characters in order with gaps |
| `substring` | Exact substring matching |

### Text Search

Uses ripgrep when available (bundled with VS Code or in PATH), with automatic fallback to JavaScript regex-based search.

### Syntax Highlighting Note

Preview highlighting is powered by Shiki/TextMate grammars. In some languages/themes, VS Code editor colors may differ slightly because the editor can also apply Semantic Tokens from language servers.

---

## Configuration

### Layout

| Setting | Default | Description |
|---|---|---|
| `codeTelescope.layout.mode` | `classic` | `classic` or `ivy` |
| `codeTelescope.layout.ivyHeightPct` | `75` | Height % for ivy layout |
| `codeTelescope.layout.leftSideWidthPct` | `50` | Left panel width % |
| `codeTelescope.layout.rightSideWidthPct` | `50` | Right panel width % |
| `codeTelescope.layout.panelContainerPct` | `90` | Container width % |
| `codeTelescope.layout.promptFontSize` | `16` | Input font size (px) |
| `codeTelescope.layout.resultsFontSize` | `16` | Results font size (px) |
| `codeTelescope.layout.previewFontSize` | `18` | Preview font size (px) |
| `codeTelescope.layout.borderSizeInPx` | `1` | Border size (px) |
| `codeTelescope.layout.borderRadiusInPx` | `5` | Border radius (px) |

### Preview

| Setting | Default | Description |
|---|---|---|
| `codeTelescope.preview.scrollBehavior` | `instant` | `auto`, `instant`, or `smooth` |
| `codeTelescope.preview.verticalScrollFraction` | `1/2` | Vertical scroll fraction |
| `codeTelescope.preview.horizontalScrollFraction` | `1/2` | Horizontal scroll fraction |
| `codeTelescope.preview.showLineNumbers` | `false` | Show line numbers in preview |

### Workspace File Finder

| Setting | Default | Description |
|---|---|---|
| `codeTelescope.wsFileFinder.excludeHidden` | `true` | Exclude dotfiles |
| `codeTelescope.wsFileFinder.includePatterns` | `["**/*"]` | Glob patterns to include |
| `codeTelescope.wsFileFinder.excludePatterns` | `["**/node_modules/**", ...]` | Glob patterns to exclude |
| `codeTelescope.wsFileFinder.maxFileSize` | `150` | Max file size (KB) |
| `codeTelescope.wsFileFinder.maxResults` | `2000` | Max results |
| `codeTelescope.wsFileFinder.textDisplay` | `relative` | `relative`, `absolute`, or `filename-only` |

### Workspace Text Search

| Setting | Default | Description |
|---|---|---|
| `codeTelescope.wsTextFinder.excludePatterns` | `["**/node_modules/**", ...]` | Glob patterns to exclude |
| `codeTelescope.wsTextFinder.maxColumns` | `500` | Max columns per line |
| `codeTelescope.wsTextFinder.maxFileSize` | `200K` | Max file size |
| `codeTelescope.wsTextFinder.maxResults` | `10000` | Max results |

### Keybindings (Panel)

| Setting | Default | Description |
|---|---|---|
| `codeTelescope.keybindings.moveDown` | `ctrl+j` | Navigate down |
| `codeTelescope.keybindings.moveUp` | `ctrl+k` | Navigate up |
| `codeTelescope.keybindings.confirm` | `enter` | Select item |
| `codeTelescope.keybindings.close` | `escape` | Close panel |
| `codeTelescope.keybindings.scrollUp` | `ctrl+u` | Scroll preview up |
| `codeTelescope.keybindings.scrollDown` | `ctrl+d` | Scroll preview down |
| `codeTelescope.keybindings.scrollLeft` | `ctrl+h` | Scroll preview left |
| `codeTelescope.keybindings.scrollRight` | `ctrl+l` | Scroll preview right |
| `codeTelescope.keybindings.promptDelete` | `backspace` | Delete character |

---

## Built-in Finders

| Finder | Command | Default Shortcut |
|---|---|---|
| 📄 Workspace Files | `code-telescope.fuzzy.file` | `Alt+M F` |
| 🔍 Workspace Text Search | `code-telescope.fuzzy.wsText` | `Alt+M G` |
| 📝 Current File Text | `code-telescope.fuzzy.fileText` | `Alt+M /` |
| 🕒 Recent Files | `code-telescope.fuzzy.recentFiles` | `Alt+M R` |
| 🔤 Workspace Symbols | `code-telescope.fuzzy.wsSymbols` | `Alt+M S` |
| 📋 Document Symbols | `code-telescope.fuzzy.documentSymbols` | `Alt+M .` |
| 🌿 Git Branches | `code-telescope.fuzzy.branch` | `Alt+M B` |
| 𝚫 Git Diffs | `code-telescope.fuzzy.diff` | `Alt+M D` |
| 📜 Git Commits | `code-telescope.fuzzy.commit` | `Alt+M C` |
| ⚠️ Diagnostics | `code-telescope.fuzzy.diagnostics` | `Alt+M Shift+D` |
| 📞 Call Hierarchy | `code-telescope.fuzzy.callHierarchy` | `Alt+M H` |
| 🔗 LSP References | `code-telescope.fuzzy.lspRefs` | `Alt+M N` |
| 🔑 Keybindings | `code-telescope.fuzzy.keybindings` | `Alt+M K` |
| 🎨 Color Schemes | `code-telescope.fuzzy.colorschemes` | `Alt+M T` |
| ⚙️ Tasks | `code-telescope.fuzzy.tasks` | `Alt+M X` |
| 🔴 Breakpoints | `code-telescope.fuzzy.breakpoints` | `Alt+M P` |
| 📦 Extensions | `code-telescope.fuzzy.extensions` | `Alt+M E` |
| 📚 Package Docs | `code-telescope.fuzzy.pkgDocs` | `Alt+M V` |
| 🔤 Font Family | `code-telescope.fuzzy.fontFamily` | `Alt+M ,` |
| 🪝 Harpoon Marks | `code-telescope.fuzzy.harpoon` | `Alt+M M` |
| ↩ Resume Last Session | `code-telescope.fuzzy.resume` | `Alt+M Shift+R` |
| 🛠️ Custom Finders | `code-telescope.fuzzy.custom` | `Alt+M U` |

---

## Harpoon Plugin

Quick file bookmarking and navigation inspired by ThePrimeagen's Harpoon for Neovim.

### Features

- **Index-based navigation** — jump to any marked file with `Ctrl+1` through `Ctrl+9`
- **Persistent storage** — marks are saved to disk per workspace, survive SSH reconnections and reloads
- **Position memory** — remembers cursor position in each marked file
- **Fuzzy finder interface** — browse and manage marks with full search support
- **Vim-style reordering** — cut and paste marks directly inside the finder

### Reordering Marks

Inside the Harpoon finder:

| Key | Action |
|---|---|
| `dd` | Cut current mark |
| `p` | Paste after current position |
| `P` | Paste before current position |

### Commands

| Command | Shortcut | Description |
|---|---|---|
| `Harpoon - Add File` | `Ctrl+Alt+M` | Mark current file |
| `Harpoon Marks` | `Alt+M M` | Open Harpoon finder |
| `Harpoon - Go to File 1–9` | `Ctrl+1`–`Ctrl+9` | Navigate to mark by index |
| `Harpoon - Remove Current File` | `Ctrl+Alt+Backspace` | Remove current file from marks |
| `Harpoon - Clear All Marks` | — | Remove all marks |

---

## Extending Code Telescope

Custom finders are `.cjs` files placed in `.vscode/code-telescope/` and loaded automatically.

```
.vscode/code-telescope/my-finder.finder.cjs
```

Complete working examples are available in the [`examples/`](examples/) directory.

### Backend Methods

| Method | Description |
|---|---|
| `querySelectableOptions()` | Called on open — returns raw data for the UI adapter |
| `onSelect(item)` | Called on selection — return `{ path, action: "openFile" }` or handle manually |
| `getPreviewData(item)` | Returns `{ content, language }` for the preview panel |

### UI Adapter Methods

| Method | Description |
|---|---|
| `parseOptions(data)` | Transforms backend data into an array of options |
| `getSearchText(option)` | Text used for fuzzy matching |
| `getSelectionValue(option)` | Identifier passed to `onSelect` and `getPreviewData` |
| `getHtmlWrapper(option, highlighted)` | HTML rendered for each list item |

### Limitations

- CommonJS format only (`.cjs`)
- Runs in extension host — no browser APIs
- No access to extension internal state

---

### Extension API

Third-party VS Code extensions can register finders programmatically via the Code Telescope API. See [`backend/integration/api/README.md`](backend/integration/api/README.md) for the full API reference, including `registerFinder`, `openFinder`, `hasFinder`, and `unregisterFinder`.

---

## Environment Support

| Environment | Theme | Syntax Highlighting |
|---|---|---|
| Linux / Windows (local) | ✅ Full support | ✅ Full support |
| WSL | ✅ Resolved from Windows host | ✅ Resolved from Windows host |
| Dev Container | ⚠️ Falls back to VS Code CSS variables | ⚠️ Falls back to `plaintext` |

---

Inspired by [telescope.nvim](https://github.com/nvim-telescope/telescope.nvim) 🔭

Found a bug or have a feature request? Please open an issue.
