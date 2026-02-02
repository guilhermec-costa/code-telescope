# Code Telescope

A Telescope-inspired fuzzy finder for VS Code, bringing the power and flexibility of Neovim's Telescope to Visual Studio Code.

![VS Code Marketplace installs](https://img.shields.io/visual-studio-marketplace/i/guichina.code-telescope?label=marketplace)
![Open VSX downloads](https://img.shields.io/open-vsx/dt/guichina/code-telescope?label=openvsx)j
![VS Code Marketplace rating](https://img.shields.io/visual-studio-marketplace/r/guichina.code-telescope?label=rating)
![License](https://img.shields.io/github/license/guilhermec-costa/code-telescope)

## Motivation

Telescope.nvim revolutionized navigation in Neovim with its extensible fuzzy finder architecture. This project brings that same philosophy to VS Code: a single, powerful interface for finding files, searching text, browsing git commits...;

![Code Telescope demo](images/code-telescope.gif)

## Architecture Overview

The architecture is built on three core principles:

1. **Annotation-based adapters** for extensibility
2. **Clear separation** between backend (extension) and UI (webview)
3. **Type-safe communication** through shared interfaces

```
+-------------------------------------------------------------------+
|                    Extension Host (Backend)                       |
|                                                                   |
|  +--------------------+          +---------------------+          |
|  |  Finder Providers  |          |  Preview Renderers  |          |
|  |  @FuzzyFinder()    |          |  @PreviewRenderer() |          |
|  +---------+----------+          +----------+----------+          |
|            |                                |                     |
|            +-------------+------------------+                     |
|                          |                                        |
|                  +-------v-------+                                |
|                  | Presentation  |                                |
|                  |     Layer     |                                |
|                  | +------------+|                                |
|                  | |  Message   ||  - WebviewController           |
|                  | |  Handlers  ||  - Registry dispatching        |
|                  | |  Registry  ||  - HTML resolution             |
|                  | +------------+|                                |
|                  +-------+-------+                                |
|                          |                                        |
+--------------------------+----------------------------------------+
                           |
                    Message Protocol
                  (Type-safe interface)
                           |
+--------------------------+----------------------------------------+
|                          |                                        |
|                  +-------v-------+           Webview (UI)         |
|                  | Presentation  |                                |
|                  |     Layer     |                                |
|                  | +------------+|                                |
|                  | |  Webview   ||  - WebviewController           |
|                  | | Controller ||  - Message routing             |
|                  | |  Keyboard  ||  - Event handling              |
|                  | |  Handlers  ||  - State management            |
|                  | +------------+|                                |
|                  +-------+-------+                                |
|                          |                                        |
|                    +-----v----+                                   |
|                    |  Shared  |                                   |
|                    |   Types  |                                   |
|                    +-----+----+                                   |
|                          |                                        |
|       +------------------+-----------------+                      |
|       |                                    |                      |
|  +----v-------------+          +-----------v----------+           |
|  |  Data Adapters    |          |  Renderer Adapters    |         |
|  |  (parse & filter) |          |  (display previews)   |         |
|  +-------------------+          +-----------------------+         |
|                                                                   |
+-------------------------------------------------------------------+

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

### Extensibility

Adding a new finder requires:

1. **Backend**: Create a provider implementing `IFuzzyFinderProvider`
2. **UI**: Create a data adapter implementing `IFuzzyFinderDataAdapter`
3. **Annotations**: Decorate with `@FuzzyFinderAdapter` and register types

The system automatically wires everything together through the type system.

# Built-in Finders

Code Telescope provides a comprehensive set of built-in finders to navigate and explore your workspace efficiently.

## Available Finders

### 📄 Workspace Files
**Command:** `code-telescope.fuzzy.file`

Find and open files in your workspace with fuzzy matching.

**Usage:**
```
Ctrl+Shift+P → "Code Telescope: File Fuzzy Finder"
```

---

### 🔍 Workspace Text Search
**Command:** `code-telescope.fuzzy.wsText`

Search for text across all files in your workspace using ripgrep.

**Usage:**
```
Ctrl+Shift+P → "Code Telescope: Workspace Text Finder"
```

---

### 🔑 Keybindings
**Command:** `code-telescope.fuzzy.keybindings`

Browse and navigate through your VS Code keybindings.

**Usage:**
```
Ctrl+Shift+P → "Code Telescope: Keybindings"
```

---

### 🌿 Git Branches
**Command:** `code-telescope.fuzzy.branch`

Quick branch switching and management.

**Usage:**
```
Ctrl+Shift+P → "Code Telescope: Branch Fuzzy Finder"
```

---

### 🔤 Workspace Symbols
**Command:** `code-telescope.fuzzy.wsSymbols`

Find symbols (functions, classes, variables) across your entire workspace.

**Usage:**
```
Ctrl+Shift+P → "Code Telescope: Workspace Symbols"
```

---

### 🕒 Recent Files
**Command:** `code-telescope.fuzzy.recentFiles`

Quick access to recently opened files.

**Usage:**
```
Ctrl+Shift+P → "Code Telescope: Recent Files"
```

---

### 🎨 Color Schemes
**Command:** `code-telescope.fuzzy.colorschemes`

Browse and switch between installed color themes.

**Usage:**
```
Ctrl+Shift+P → "Code Telescope: Colorschemes"
```

---

### ⚠️ Diagnostics
**Command:** `code-telescope.fuzzy.diagnostics`

Navigate through all workspace problems (errors, warnings, hints).

**Usage:**
```
Ctrl+Shift+P → "Code Telescope: Diagnostics"
```

---

### ⚙️ Tasks
**Command:** `code-telescope.fuzzy.tasks`

Execute workspace tasks from all providers (npm, gulp, tasks.json, etc.).

**Usage:**
```
Ctrl+Shift+P → "Code Telescope: Tasks"
```

---

### 📞 Call Hierarchy
**Command:** `code-telescope.fuzzy.callHierarchy`

Explore function call relationships (incoming and outgoing calls).

**Usage:**
```
1. Place cursor on a function/method
2. Ctrl+Shift+P → "Code Telescope: Call hierarchy"
```

### 🔧 Code Telescope Custom Finders
**Command:** `code-telescope.fuzzy.custom`

Quick picker to select and execute custom user-defined finders.

**Usage:**
```
Ctrl+Shift+P → "Code Telescope: Pick Custom Finder"
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
| `Harpoon - Go to File 1-9` | `Ctrl+1-9` | Navigate to mark by index |
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

### Multiple Workspaces

Marks are workspace-specific. You can have different mark sets for different projects:

```
Project A Workspace:
[1] frontend/app.tsx
[2] backend/server.ts

Project B Workspace:
[1] core/engine.ts
[2] utils/helpers.ts
```

---

---

### Keybindings Guide

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
// .vscode/code-telescope/example.finder.cjs

/** @type {import('code-telescope/shared/custom-provider').CustomFinderDefinition} */
module.exports = {
  // Unique identifier (must start with "custom.")
  fuzzyAdapterType: "custom.example",
  
  // Backend logic (runs in extension host)
  backend: {
    async querySelectableOptions() {
      // Return data to be displayed
      return {
        items: ["Item 1", "Item 2", "Item 3"]
      };
    },
    
    async onSelect(item) {
      // Handle selection
      return {
        data: item,
        action: "showMessage" // Built-in action
      };
    },
    
    async getPreviewData(identifier) {
      // Return preview data for syntax-highlighted code view
      return {
        content: {
          path: "Preview Title",
          content: `Content for: ${identifier}`,
          kind: "text"
        },
        language: "text"
      };
    }
  },
  
  // UI adapters (runs in webview)
  ui: {
    dataAdapter: {
      parseOptions(data) {
        // Transform backend data into options
        return data.items.map((item, index) => ({
          id: index,
          text: item
        }));
      },
      
      getDisplayText(option) {
        // Format option for display
        return option.text;
      },
      
      getSelectionValue(option) {
        // Return identifier for selection
        return option.text;
      },
      
      filterOption(option, query) {
        // Custom filtering logic (optional)
        return option.text.toLowerCase().includes(query.toLowerCase());
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

- **`custom-json.finder.cjs`** - Find json files 

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
