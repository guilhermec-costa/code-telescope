# Code Telescope

A Telescope-inspired fuzzy finder for VS Code, bringing the power and flexibility of Neovim's Telescope to Visual Studio Code.

![VS Code Marketplace installs](https://img.shields.io/visual-studio-marketplace/i/guichina.code-telescope?label=marketplace)
![Open VSX downloads](https://img.shields.io/open-vsx/dt/guichina/code-telescope?label=openvsx)
![VS Code Marketplace rating](https://img.shields.io/visual-studio-marketplace/r/guichina.code-telescope?label=rating)
![License](https://img.shields.io/github/license/guilhermec-costa/code-telescope)

## Motivation

Telescope.nvim transformed navigation in Neovim with its extensible, keyboard-first fuzzy finder architecture.
Code Telescope brings that same philosophy to VS Code — a single, powerful interface for navigating your entire project.

Find files instantly, search across your workspace, explore symbols, browse git branches and commits — all from one unified, consistent experience.

![Code Telescope demo](images/code-telescope.gif)

## Architecture Overview

The architecture is built on three core principles:

1. **Annotation-based adapters** for extensibility
2. **Clear separation** between backend (extension) and UI (webview)
3. **Type-safe communication** through shared interfaces

```
+---------------------------------------------------------------------------+
|                         Extension Host (Backend)                          |
|                                                                           |
|                        +-------------------------+                        |
|                        |     Finder Providers    |                        |
|                        |      @FuzzyFinder()     |                        |
|                        +------------+------------+                        |
|                                     |                                     |
|            +------------------------+-------------------------+           |
|            |                        |                         |           |
|            |              +---------+---------+               |           |
|            |              |   Presentation    |               |           |
|            |              |       Layer       |               |           |
|            |              |  +-------------+  |   - WebviewController     |
|            |              |  |   Message   |  |   - Registry dispatch     |
|            |              |  |   Handlers  |  |   - HTML resolution       |
|            |              |  |   Registry  |  |                           |
|            |              |  +-------------+  |                           |
|            |              +---------+---------+                           |
|            |                        |                         |           |
+------------+------------------------+-------------------------+-----------+
                                      |
                               Message Protocol
                            (Type-safe interface)
                                      |
+-------------------------------------+-------------------------------------+
|                                     |                                     |
|                           +---------+---------+      Webview (UI)         |
|                           |   Presentation    |                           |
|                           |       Layer       |                           |
|                           |  +-------------+  |                           |
|                           |  |   Webview   |  |   - WebviewController     |
|                           |  |  Controller |  |   - Message routing       |
|                           |  |   Keyboard  |  |   - Event handling        |
|                           |  |   Handlers  |  |   - State management      |
|                           |  +-------------+  |                           |
|                           +---------+---------+                           |
|                                     |                                     |
|                               +-----v-----+                               |
|                               |  Shared   |                               |
|                               |   Types   |                               |
|                               +-----+-----+                               |
|                                     |                                     |
|             +-----------------------+-----------------------+             |
|             |                                               |             |
|     +-------v-----------+                       +-----------v---------+   |
|     |   Data Adapters   |                       |  Renderer Adapters  |   |
|     |  (parse & filter) |                       |  (display previews) |   |
|     +-------------------+                       +---------------------+   |
|                                                                           |
+---------------------------------------------------------------------------+
```

## Core Concepts

### Finders (Backend)

Finders are data providers that supply items to the fuzzy finder. Each finder is registered via the `@FuzzyFinderAdapter` decorator.

```typescript
@FuzzyFinderAdapter({
  fuzzy: "workspace.files",
  previewRenderer: "preview.codeHighlighted",
})
export class WorkspaceFileProvider implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  async querySelectableOptions(): Promise<any> {
    // Return list of files
  }

  async getPreviewData(identifier: string): Promise<PreviewData> {
    // Return file content for preview
  }

  async onSelect(identifier: string): Promise<void> {
    // Open selected file
  }
}
```

**Key responsibilities:**
- Query and return selectable items
- Provide preview data for selected items
- Execute action on item selection
- Support dynamic search (optional)

### Previewers (Backend)

Preview renderers transform raw data into visual representations. Registered via `@PreviewRendererAdapter`.

```typescript
@PreviewRendererAdapter({
  adapter: "preview.codeHighlighted",
})
export class CodeHighlightedPreviewRenderer implements IPreviewRendererAdapter {
  async render(previewElement: HTMLElement, data: PreviewData, theme: string): Promise<void> {
    // Render syntax-highlighted code
  }
}
```

### Data Adapters (UI)

UI-side adapters handle data transformation and filtering for specific finder types.

```typescript
export class FileDataAdapter implements IFuzzyFinderDataAdapter {
  parseOptions(data: any): FileOption[] {
    // Convert backend data to UI options
  }

  getDisplayText(option: FileOption): string {
    // Format option for display
  }

  filterOption(option: FileOption, query: string): boolean {
    // Custom filtering logic
  }
}
```

### Message Protocol

Type-safe communication between extension and webview through shared interfaces:

```typescript
// Backend → Webview
interface ToWebviewKindMessage {
  type: "options" | "preview" | "theme" | ...;
  payload: any;
}

// Webview → Backend
interface FromWebviewKindMessage {
  type: "requestOptions" | "requestPreview" | "select" | ...;
  payload: any;
}
```

## Features

### Keyboard Navigation

- `↑/↓` or `Ctrl+K/J`: Navigate between items
- `Ctrl+U/D`: Navigate preview up/down
- `Enter`: Select item
- `Esc`: Close finder
- Type to filter results in real-time

### Vim Motion

The input panel supports Vim-style navigation:

- `Ctrl+[` / `Esc`: Enter Normal mode
- `i` / `a` / `A`: Enter Insert mode (insert/append/append at end)

**Motions:**
- `h/j/k/l`: Left/down/up/right
- `w/b/e`: Word forward/backward/end
- `W/B/E`: WORD forward/backward/end
- `0/$/^`: Line start/end/first non-blank
- `f/F/t/T`: Find char forward/backward/till
- `;` / `,`: Repeat last find
- `gg/G`: File start/end

**Operators:**
- `d/c/y`: Delete/change/yank (combine with motions: `dw`, `dd`, `yy`, etc.)
- `x`: Delete char
- `p/P`: Paste after/before
- `u`: Undo
- `Ctrl+r`: Redo

### Dynamic Search

Finders can opt into dynamic search mode, where queries are sent to the backend for server-side filtering (useful for large datasets like workspace text search).

```typescript
export class WorkspaceTextSearchProvider implements IFuzzyFinderProvider {
  supportsDynamicSearch = true;

  async searchOnDynamicMode(query: string): Promise<any> {
    // Execute search and return results
  }
}
```

### Search Algorithms

Code Telescope supports different matching algorithms that can be configured via the `codeTelescope.matching.algorithm` setting:

| Algorithm | Description |
|-----------|-------------|
| `subsequence` (default) | Character-by-character matching like fzf. Matches characters in order even with gaps between them. |
| `substring` | Exact substring matching. Searches for the exact text sequence within results. |

**Example:** Searching for "fuz" would match:
- `fuzzy` ✅ (subsequence: f→u→z)
- `fuzzy` ✅ (substring: "fuz" inside "fuzzy")

### Text Search Implementation

The workspace text search feature uses a smart fallback mechanism:

1. **Ripgrep (Primary)** - When ripgrep is available (bundled with VS Code or in system PATH), it provides fast, indexed search with JSON output
2. **Regex Fallback** - If ripgrep is unavailable, it falls back to JavaScript regex-based search across all workspace files

The system automatically detects ripgrep availability and selects the appropriate backend. You can configure:
- `codeTelescope.wsTextFinder.excludePatterns` - Files to exclude
- `codeTelescope.wsTextFinder.maxFileSize` - Maximum file size to search
- `codeTelescope.wsTextFinder.maxResults` - Maximum results to return
- `codeTelescope.wsTextFinder.maxColumns` - Maximum columns per line

### Performance Debugging (Development Mode)

When running Code Telescope in development mode (`ExtensionMode.Development`), a performance debugging module is automatically enabled. Access it via the Command Palette:

- **Show Performance Summary** - View overall performance metrics
- **Show Slowest Operations** - See the slowest executed operations
- **Show Highest Memory** - View operations with highest memory usage
- **Clear Metrics** - Reset all performance metrics
- **Toggle Logging** - Enable/disable detailed logging

This feature is useful for debugging and optimizing custom finders.

### Extensibility

Adding a new finder requires:

1. **Backend**: Create a provider implementing `IFuzzyFinderProvider`
2. **UI**: Create a data adapter implementing `IFuzzyFinderDataAdapter`
3. **Annotations**: Decorate with `@FuzzyFinderAdapter` and register types

The system automatically wires everything together through the type system.

---

## Configuration

Code Telescope offers extensive configuration options accessible via VS Code settings (`Ctrl+,` and search for "Code Telescope").

### Window Behavior

| Setting | Default | Description |
|---------|---------|-------------|
| `codeTelescope.window.closeBehaviorOnSelection` | `dispose` | Behavior when selecting an item (`minimize` or `dispose`) |
| `codeTelescope.window.closeBehaviorOnClose` | `dispose` | Behavior when closing the panel |

### Layout

| Setting | Default | Description |
|---------|---------|-------------|
| `codeTelescope.layout.mode` | `classic` | Layout mode (`classic` or `ivy`) |
| `codeTelescope.layout.ivyHeightPct` | `75` | Height percentage for ivy layout |
| `codeTelescope.layout.leftSideWidthPct` | `50` | Left panel width percentage |
| `codeTelescope.layout.rightSideWidthPct` | `50` | Right panel width percentage |
| `codeTelescope.layout.panelContainerPct` | `90` | Container width percentage |
| `codeTelescope.layout.promptFontSize` | `16` | Input prompt font size (px) |
| `codeTelescope.layout.resultsFontSize` | `16` | Results list font size (px) |
| `codeTelescope.layout.previewFontSize` | `18` | Preview panel font size (px) |
| `codeTelescope.layout.borderSizeInPx` | `1` | Border size (px) |
| `codeTelescope.layout.borderRadiusInPx` | `5` | Border radius (px) |

### Preview Panel

| Setting | Default | Description |
|---------|---------|-------------|
| `codeTelescope.preview.scrollBehavior` | `instant` | Scroll behavior (`auto`, `instant`, or `smooth`) |
| `codeTelescope.preview.verticalScrollFraction` | `1/2` | Vertical scroll position (`1/2`, `1/3`, `1/4`) |
| `codeTelescope.preview.horizontalScrollFraction` | `1/2` | Horizontal scroll position |
| `codeTelescope.preview.showLineNumbers` | `false` | Show line numbers in preview |

### Workspace File Finder

| Setting | Default | Description |
|---------|---------|-------------|
| `codeTelescope.wsFileFinder.excludeHidden` | `true` | Exclude hidden files (dotfiles) |
| `codeTelescope.wsFileFinder.includePatterns` | `["**/*"]` | Glob patterns to include |
| `codeTelescope.wsFileFinder.excludePatterns` | `["**/node_modules/**", ...]` | Glob patterns to exclude |
| `codeTelescope.wsFileFinder.maxFileSize` | `150` | Maximum file size in KB |
| `codeTelescope.wsFileFinder.maxResults` | `2000` | Maximum number of results |
| `codeTelescope.wsFileFinder.textDisplay` | `relative` | How to display file paths (`relative`, `absolute`, `filename-only`) |

### Workspace Text Search

| Setting | Default | Description |
|---------|---------|-------------|
| `codeTelescope.wsTextFinder.excludePatterns` | `["**/node_modules/**", ...]` | Glob patterns to exclude |
| `codeTelescope.wsTextFinder.maxColumns` | `500` | Maximum columns per line |
| `codeTelescope.wsTextFinder.maxFileSize` | `200K` | Maximum file size (e.g., `200k`, `1M`) |
| `codeTelescope.wsTextFinder.maxResults` | `10000` | Maximum search results |

### Keyboard Shortcuts (Panel)

| Setting | Default | Description |
|---------|---------|-------------|
| `codeTelescope.keybindings.moveDown` | `ctrl+j` | Navigate down |
| `codeTelescope.keybindings.moveUp` | `ctrl+k` | Navigate up |
| `codeTelescope.keybindings.confirm` | `enter` | Select item |
| `codeTelescope.keybindings.close` | `escape` | Close panel |
| `codeTelescope.keybindings.scrollUp` | `ctrl+u` | Scroll preview up |
| `codeTelescope.keybindings.scrollDown` | `ctrl+d` | Scroll preview down |
| `codeTelescope.keybindings.scrollLeft` | `ctrl+h` | Scroll preview left |
| `codeTelescope.keybindings.scrollRight` | `ctrl+l` | Scroll preview right |
| `codeTelescope.keybindings.promptDelete` | `backspace` | Delete character in prompt |

---

# Built-in Finders

Code Telescope provides a comprehensive set of built-in finders to navigate and explore your workspace efficiently.

## Available Finders

### 📄 Workspace Files
**Command:** `code-telescope.fuzzy.file`

Find and open files in your workspace with fuzzy matching.

**Usage:**
```
Ctrl+Alt+F
```

---

### 🔍 Workspace Text Search
**Command:** `code-telescope.fuzzy.wsText`

Search for text across all files in your workspace using ripgrep.

**Usage:**
```
Ctrl+Alt+G
```

---

### 🔑 Keybindings
**Command:** `code-telescope.fuzzy.keybindings`

Browse and navigate through your VS Code keybindings.

**Usage:**
```
Ctrl+Alt+K
```

---

### 🌿 Git Branches
**Command:** `code-telescope.fuzzy.branch`

Quick branch switching and management.

**Usage:**
```
Ctrl+Alt+B
```

---

### 📜 Git Commits
**Command:** `code-telescope.fuzzy.commit`

Browse and navigate through git commit history.

**Usage:**
```
Ctrl+Alt+C
```

---

### 🔤 Workspace Symbols
**Command:** `code-telescope.fuzzy.wsSymbols`

Find symbols (functions, classes, variables) across your entire workspace.

**Usage:**
```
Ctrl+Alt+S
```

---

### 🕒 Recent Files
**Command:** `code-telescope.fuzzy.recentFiles`

Quick access to recently opened files.

**Usage:**
```
Ctrl+Alt+R
```

---

### 🎨 Color Schemes
**Command:** `code-telescope.fuzzy.colorschemes`

Browse and switch between installed color themes.

**Usage:**
```
Ctrl+Alt+C
```

---

### ⚠️ Diagnostics
**Command:** `code-telescope.fuzzy.diagnostics`

Navigate through all workspace problems (errors, warnings, hints).

**Usage:**
```
Ctrl+Alt+D
```

---

### ⚙️ Tasks
**Command:** `code-telescope.fuzzy.tasks`

Execute workspace tasks from all providers (npm, gulp, tasks.json, etc.).

**Usage:**
```
Ctrl+Alt+T
```

---

### 📞 Call Hierarchy
**Command:** `code-telescope.fuzzy.callHierarchy`

Explore function call relationships (incoming and outgoing calls).

**Usage:**
```
Ctrl+Alt+Y
```

### 🔧 Code Telescope Custom Finders
**Command:** `code-telescope.fuzzy.custom`

Quick picker to select and execute custom user-defined finders.

**Usage:**
```
Ctrl+Alt+X
```

---

### 📝 Current File Text Search
**Command:** `code-telescope.fuzzy.fileText`

Search for text within the currently open file using ripgrep with dynamic search.

**Usage:**
```
Ctrl+Alt+L
```

---

### 📋 Document Symbols
**Command:** `code-telescope.fuzzy.documentSymbols`

Find symbols (functions, classes, variables, etc.) in the current document.

**Usage:**
```
Ctrl+Alt+U (when editor is focused)
```

---

### 🔴 Workspace Breakpoints
**Command:** `code-telescope.fuzzy.breakpoints`

Browse and navigate through all breakpoints in your workspace, including conditions, hit conditions, and log messages.

**Usage:**
```
Ctrl+Alt+P
```

---

### 📦 Workspace Extensions
**Command:** `code-telescope.fuzzy.extensions`

Browse and manage installed VS Code extensions in your workspace.

**Usage:**
```
Ctrl+Alt+E
```

---

### 🔤 Font Family
**Command:** `code-telescope.fuzzy.fonts`

Browse and switch between installed system fonts for your editor.

**Usage:**
```
Ctrl+Alt+F (when editor is focused)
```

---

### 📚 Workspace Package Docs
**Command:** `code-telescope.fuzzy.pkgDocs`

Browse documentation from installed npm packages in your workspace (reads README, CHANGELOG, etc. from node_modules).

**Usage:**
```
Ctrl+Alt+V
```

---

# Harpoon Plugin

Quick file bookmarking and navigation system inspired by ThePrimeagen's Harpoon for Neovim.

## Overview

Harpoon allows you to mark important files in a specific order and navigate between them instantly using keyboard shortcuts. Perfect for keeping your most-used files at your fingertips during development.

## Features

- **Quick File Marking** - Bookmark files in order with a single command
- **Index-based Navigation** - Jump to any marked file using `Ctrl+1` through `Ctrl+9`
- **Persistent Marks** - Your bookmarks are saved per workspace and persist across sessions
- **Position Memory** - Harpoon remembers your cursor position in each file
- **Visual Finder** - Browse and manage all marks in a fuzzy finder interface
- **Mark Management** - Reorder, rename, and remove marks with ease

## Quick Start

### Marking Files

1. Open a file you want to bookmark
2. Press `Ctrl+Alt+M` (or run `Code Telescope: Harpoon - Add File`)
3. The file is now marked and appears in your Harpoon list

### Navigating Marks

- `Ctrl+1` - Jump to first marked file
- `Ctrl+2` - Jump to second marked file
- `Ctrl+3` through `Ctrl+9` - Jump to respective marked files

### Viewing All Marks

Press `Ctrl+Alt+H` (or run `Code Telescope: Harpoon Marks`) to open the Harpoon finder:

```
[1] src/app.ts :42
[2] src/components/Header.tsx :15
[3] tests/app.test.ts :89
```

The finder shows:
- Mark index `[1]`, `[2]`, etc.
- Relative file path
- Saved cursor position (line:column)

## Commands

| Command | Default Shortcut | Description |
|---------|-----------------|-------------|
| `Harpoon - Add File` | `Ctrl+Alt+M` | Mark current file |
| `Harpoon Marks` | `Ctrl+Alt+H` | Open Harpoon finder |
| `Harpoon - Go to File 1` | `Ctrl+1` | Navigate to first mark |
| `Harpoon - Go to File 2` | `Ctrl+2` | Navigate to second mark |
| `Harpoon - Go to File 3` | `Ctrl+3` | Navigate to third mark |
| `Harpoon - Go to File 4` | `Ctrl+4` | Navigate to fourth mark |
| `Harpoon - Go to File 5` | `Ctrl+5` | Navigate to fifth mark |
| `Harpoon - Go to File 6` | `Ctrl+6` | Navigate to sixth mark |
| `Harpoon - Go to File 7` | `Ctrl+7` | Navigate to seventh mark |
| `Harpoon - Go to File 8` | `Ctrl+8` | Navigate to eighth mark |
| `Harpoon - Go to File 9` | `Ctrl+9` | Navigate to ninth mark |
| `Harpoon - Remove Current File` | `Ctrl+Alt+Backspace` | Remove current file from marks |
| `Harpoon - Edit Marks` | - | Edit/remove/reorder marks |
| `Harpoon - Reorder Marks` | - | Move marks to specific positions |
| `Harpoon - Clear All Marks` | - | Remove all marks (with confirmation) |

## Managing Marks

### Edit Mark Menu

Run `Code Telescope: Harpoon - Edit Marks` to:

1. **Remove** - Delete the mark
2. **Move Up** - Shift mark earlier in the list
3. **Move Down** - Shift mark later in the list
4. **Rename** - Add/change a custom label

### Reorder Marks

Use `Code Telescope: Harpoon - Reorder Marks` for precise positioning:

1. Select the mark you want to move
2. Choose the target position
3. The mark is instantly repositioned

### Custom Labels

Add descriptive labels to your marks:

```
[1] auth.ts          (Login Flow)
[2] middleware.ts    (Auth Middleware)
[3] auth.test.ts     (Integration Tests)
```

Labels appear in the finder and help identify files at a glance.

---

### Default Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Smart File Search | `Ctrl+Alt+F` | `Cmd+Alt+F` |
| Workspace Text Search | `Ctrl+Alt+G` | `Cmd+Alt+G` |
| Workspace Symbols | `Ctrl+Alt+S` | `Cmd+Alt+S` |
| Document Symbols | `Ctrl+Alt+U` | `Cmd+Alt+U` |
| Recent Files | `Ctrl+Alt+R` | `Cmd+Alt+R` |
| Git Branches | `Ctrl+Alt+B` | `Cmd+Alt+B` |
| Git Commits | `Ctrl+Alt+C` | `Cmd+Alt+C` |
| Diagnostics | `Ctrl+Alt+D` | `Cmd+Alt+D` |
| Color Themes | `Ctrl+Alt+C` | `Cmd+Alt+C` |
| Tasks | `Ctrl+Alt+T` | `Cmd+Alt+T` |
| Keybindings | `Ctrl+Alt+K` | `Cmd+Alt+K` |
| Workspace Extensions | `Ctrl+Alt+E` | `Cmd+Alt+E` |
| Package Docs | `Ctrl+Alt+V` | `Cmd+Alt+V` |
| Harpoon Marks | `Ctrl+Alt+H` | `Cmd+Alt+H` |
| Custom Finders | `Ctrl+Alt+X` | `Cmd+Alt+X` |
| Call Hierarchy | `Ctrl+Alt+Y` | `Cmd+Alt+Y` |
| Current File Text Search | `Ctrl+Alt+L` | `Cmd+Alt+L` |
| Workspace Breakpoints | `Ctrl+Alt+P` | `Cmd+Alt+P` |
| Font Family | `Ctrl+Alt+,` | `Cmd+Alt+,` |

#### Harpoon Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Add File | `Ctrl+Alt+M` | `Cmd+Alt+M` |
| Remove Current File | `Ctrl+Alt+Backspace` | `Cmd+Alt+Backspace` |
| Go to File 1 | `Ctrl+1` | `Cmd+1` |
| Go to File 2 | `Ctrl+2` | `Cmd+2` |
| Go to File 3 | `Ctrl+3` | `Cmd+3` |
| Go to File 4 | `Ctrl+4` | `Cmd+4` |
| Go to File 5 | `Ctrl+5` | `Cmd+5` |
| Go to File 6 | `Ctrl+6` | `Cmd+6` |
| Go to File 7 | `Ctrl+7` | `Cmd+7` |
| Go to File 8 | `Ctrl+8` | `Cmd+8` |
| Go to File 9 | `Ctrl+9` | `Cmd+9` |

#### Custom Keybindings

```json
[
  {
    "key": "{custom-keybinding}",
    "command": "code-telescope.fuzzy.file",
    "when": "editorTextFocus"
  },
  {
    "key": "{custom-keybinding}",
    "command": "code-telescope.fuzzy.wsText"
  },
  {
    "key": "{custom-keybinding}",
    "command": "code-telescope.fuzzy.wsSymbols"
  },
  {
    "key":  "{custom-keybinding}",
    "command": "code-telescope.fuzzy.recentFiles"
  },
  {
    "key":  "{custom-keybinding}",
    "command": "code-telescope.fuzzy.diagnostics"
  },
  {
    "key":  "{custom-keybinding}",
    "command": "code-telescope.fuzzy.tasks"
  },
  {
    "key":  "{custom-keybinding}",
    "command": "code-telescope.fuzzy.branch"
  },
  {
    "key":  "{custom-keybinding}",
    "command": "code-telescope.fuzzy.callHierarchy",
    "when": "editorTextFocus"
  },
  {
    "key":  "{custom-keybinding}",
    "command": "code-telescope.fuzzy.breakpoints"
  },
  {
    "key":  "{custom-keybinding}",
    "command": "code-telescope.fuzzy.documentSymbols",
    "when": "editorTextFocus"
  },
  {
    "key":  "{custom-keybinding}",
    "command": "code-telescope.fuzzy.fileText",
    "when": "editorTextFocus"
  },
  {
    "key":  "{custom-keybinding}",
    "command": "code-telescope.fuzzy.commit"
  },
  {
    "key":  "{custom-keybinding}",
    "command": "code-telescope.fuzzy.extensions"
  },
  {
    "key":  "{custom-keybinding}",
    "command": "code-telescope.fuzzy.pkgDocs"
  },
  {
    "key":  "{custom-keybinding}",
    "command": "code-telescope.fuzzy.fonts",
    "when": "editorTextFocus"
  }
]
```

---

# Extending Code Telescope

Code Telescope is designed to be extensible. You can create your own custom finders without modifying the extension code.

## Creating Custom Finders

Custom finders are defined as CommonJS modules (`.cjs` files) placed in the `.vscode/code-telescope/` directory of your workspace.

### File Location

Create your custom finder in:
```
.vscode/code-telescope/my-custom.finder.cjs
```

**Naming convention:**
- Must end with `.finder.cjs` or `.provider.cjs`
- Use descriptive names (e.g., `github-issues.finder.cjs`, `database-tables.finder.cjs`)

### Basic Structure

A custom finder must export a `CustomFinderDefinition` object that defines both backend logic and UI adapters:

```javascript
// .vscode/code-telescope/custom-json.finder.cjs
const fs = require('fs');
const path = require('path');

/**
 * @type {import('../shared/custom-provider').CustomFinderDefinition}
 */
module.exports = {
  // Unique identifier (must start with "custom.")
  fuzzyAdapterType: "custom.ts.files",

  // Backend logic (runs in extension host)
  backend: {
    async querySelectableOptions() {
      return [
        {
          id: "/project/src/index.ts",
          path: "/project/src/index.ts",
          name: "index.ts"
        },
        {
          id: "/project/src/app.ts",
          path: "/project/src/app.ts",
          name: "app.ts"
        },
        {
          id: "/project/src/services/user.service.ts",
          path: "/project/src/services/user.service.ts",
          name: "user.service.ts"
        },
      ];
    }

    async onSelect(item) {
      // item is the value from getSelectionValue
      return {
        path: item,
        action: "openFile"
      };
    },

    async getPreviewData(item) {
      const content = fs.readFileSync(item, 'utf-8');
      const ext = path.extname(item).slice(1);

      return {
        content: content,
        language: ext || "text"
      };
    }
  },

  // UI adapters (runs in webview)
  ui: {
    dataAdapter: {
      parseOptions(data) {
        return data;
      },

      getDisplayText(option) {
        return option.name;
      },

      getSelectionValue(option) {
        return option.path;
      },

      filterOption(option, query) {
        return option.name.toLowerCase().includes(query.toLowerCase());
      }
    }
  }
};
```

## API Reference

### Backend Methods

#### `querySelectableOptions()`
Called when the finder is opened. Should return data that will be transformed by the UI adapter.

**Signature:**
```typescript
async querySelectableOptions(): Promise<any>
```

**Returns:** Any data structure that your UI adapter's `parseOptions` can handle.

**Example:**
```javascript
async querySelectableOptions() {
  return {
    items: [
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" }
    ]
  };
}
```

---

#### `onSelect(item)`
Called when user selects an item. Should return action data.

**Signature:**
```typescript
async onSelect(item: any): Promise<{
  data: any;
  action: string;
}>
```

**Parameters:**
- `item` - The selected item (as returned by UI adapter's `getSelectionValue`)

**Returns:** An object with:
- `path` — File path to be handled
- `action` — Action identifier

Or `void`, if the selection is handled internally by your own callback.

**Built-in actions:**
- `"openFile"` - Opens file at `data` (must be a file path)
- `"none"` - No automatic action (you handled it manually in `onSelect`)

**Example:**
```javascript
async onSelect(itemId) {
  const item = await fetchItemDetails(itemId);
  
  return {
    path: item,
    action: "openFile"
  };
}
```

---

#### `getPreviewData(identifier)`
Returns data for the preview panel. This data is rendered as syntax-highlighted code.

**Signature:**
```typescript
async getPreviewData(identifier: any): Promise<{
  content: string;
  language: string;
}>
```

**Parameters:**
- `identifier` - The value returned by UI adapter's `getSelectionValue`

**Returns:** Object with:
- `content` - Text to be syntax-highlighted
- `language` - Language identifier for syntax highlighting (e.g., "javascript", "python", "json")

**Example:**
```javascript
async getPreviewData(fileId) {
  const file = await fetchFile(fileId);
  const extension = path.extname(file.name).slice(1);
  
  return {
    content: file.content,
    language: extension || "text"
  };
}
```

**Supported languages:** All languages supported by VS Code's syntax highlighting (javascript, typescript, python, java, json, markdown, etc.)

---

### UI Data Adapter Methods

#### `parseOptions(data)`
Transforms backend data into an array of options.

**Signature:**
```typescript
parseOptions(data: any): any[]
```

**Parameters:**
- `data` - Data returned by backend's `querySelectableOptions`

**Returns:** Array of options to be displayed in the list.

**Example:**
```javascript
parseOptions(data) {
  return data.items.map(item => ({
    id: item.id,
    name: item.name,
    description: item.description
  }));
}
```

---

#### `getDisplayText(option)`
Returns the text displayed in the list for an option.

**Signature:**
```typescript
getDisplayText(option: any): string
```

**Parameters:**
- `option` - One option from the array returned by `parseOptions`

**Returns:** String to be displayed in the finder list.

**Example:**
```javascript
getDisplayText(option) {
  // Format with padding for alignment
  return `${option.name.padEnd(30)} ${option.description}`;
}
```

---

#### `getSelectionValue(option)`
Returns identifier used for selection and preview.

**Signature:**
```typescript
getSelectionValue(option: any): string
```

**Parameters:**
- `option` - One option from the array returned by `parseOptions`

**Returns:** String identifier passed to `onSelect` and `getPreviewData`.

**Example:**
```javascript
getSelectionValue(option) {
  // Return a unique identifier
  return option.id.toString();
}
```

---

#### `filterOption(option, query)` *(optional)*
Custom filtering logic. If not provided, uses default fuzzy matching on `getDisplayText` result.

**Signature:**
```typescript
filterOption(option: any, query: string): boolean
```

**Parameters:**
- `option` - One option from the array returned by `parseOptions`
- `query` - Current search query (lowercase)

**Returns:** `true` if option matches the query, `false` otherwise.

**Example:**
```javascript
filterOption(option, query) {
  const lowerQuery = query.toLowerCase();
  return (
    option.name.toLowerCase().includes(lowerQuery) ||
    option.description.toLowerCase().includes(lowerQuery)
  );
}
```

**Flow:**
1. User opens custom finder
2. Backend's `querySelectableOptions()` is called
3. UI's `parseOptions()` transforms the data
4. User types → UI's `filterOption()` filters results
5. User navigates → Backend's `getPreviewData()` shows preview
6. User selects → Backend's `onSelect()` executes action

---

## Examples

Complete working examples are available in the `examples/` directory:

- **`custom-json.finder.cjs`** - Find TypeScript files in workspace

---

## Debugging Custom Finders

1. **Check the Developer Console**  
   Open with `Help > Toggle Developer Tools` in VS Code

2. **Add logging in your finder**:
   ```javascript
   async querySelectableOptions() {
     console.log("[Custom Finder] Querying options...");
     const result = await fetchData();
     console.log("[Custom Finder] Found:", result.length, "items");
     return result;
   }
   ```

3. **Validate data structure**  
   Ensure your backend returns what your UI adapter expects

---

## Limitations

- Custom finders run in the extension host (Node.js environment)
- Cannot use browser-only APIs
- Must use CommonJS module format (`.cjs`)
- Preview is always rendered as syntax-highlighted code
- No access to extension's internal state

---

## Environment Support

| Environment | Theme | Syntax Highlighting |
|---|---|---|
| Linux / Windows (local) | ✅ Full support | ✅ Full support |
| WSL | ✅ Resolved from Windows host (`/mnt/c`) | ✅ Resolved from Windows host |
| Dev Container | ⚠️ Falls back to VS Code CSS variables | ⚠️ Falls back to `plaintext` |

WSL support works by reading extensions directly from the Windows host filesystem, including both user-installed extensions and VS Code built-in grammars. See [`.devcontainer/README.md`](.devcontainer/README.md) for details on Dev Container limitations.

---

## Why This Architecture?

1. **Loose coupling**: Finders don't know about UI, UI doesn't know about implementation details
2. **Easy testing**: Each component can be tested independently
3. **Type safety**: Compile-time guarantees prevent integration bugs
4. **Extensibility**: Add new finders without touching existing code
5. **Consistency**: Single UX pattern for all finder types

---

Inspired by [telescope.nvim](https://github.com/nvim-telescope/telescope.nvim) 🔭

## Contributing

Found a bug or have a feature request? Please open an issue.
