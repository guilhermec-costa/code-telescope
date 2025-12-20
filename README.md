# Code Telescope

A Telescope-inspired fuzzy finder for VS Code, bringing the power and flexibility of Neovim's Telescope to Visual Studio Code.

## Motivation

Telescope.nvim revolutionized navigation in Neovim with its extensible fuzzy finder architecture. This project brings that same philosophy to VS Code: a single, powerful interface for finding files, searching text, browsing git commits, and more—all through a consistent, keyboard-driven experience.

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

## Built-in Finders

- **Workspace Files**: Find files in workspace
- **Workspace Text Search**: Search text across files (with ripgrep)
- **Git Commits**: Browse git history with diff previews
- **Git Branchs**: Quick access git branches 
- (More coming soon...)

## Type Safety

All communication is strongly typed through shared interfaces. The `shared/` module ensures both backend and UI speak the same language, preventing runtime errors and improving developer experience.

```typescript
// shared/extension-webview-protocol.ts
export interface PreviewData {
  content: string;
  language?: string;
  metadata?: Record<string, any>;
}
```

## Why This Architecture?

1. **Loose coupling**: Finders don't know about UI, UI doesn't know about implementation details
2. **Easy testing**: Each component can be tested independently
3. **Type safety**: Compile-time guarantees prevent integration bugs
4. **Extensibility**: Add new finders without touching existing code
5. **Consistency**: Single UX pattern for all finder types

---

Inspired by [telescope.nvim](https://github.com/nvim-telescope/telescope.nvim) 🔭