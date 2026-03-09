# Code Telescope — Extension API

This directory exposes the public API that other VS Code extensions can use to integrate with Code Telescope.

---

## Getting started

Copy the file `api.d.ts` from this directory into your extension project — for example, into a `types/` folder:

```
your-extension/
  types/
    code-telescope.d.ts   ← copied from backend/integration/api/api.d.ts
```

Then add a `paths` entry in your `tsconfig.json` so TypeScript can resolve the import:

```json
{
  "compilerOptions": {
    "paths": {
      "code-telescope": ["./types/code-telescope.d.ts"]
    }
  }
}
```

Then consume the API in your extension's `activate` function:

```ts
import type { CodeTelescopeAPI } from "code-telescope";

export async function activate(ctx: vscode.ExtensionContext) {
  const ext = vscode.extensions.getExtension<CodeTelescopeAPI>("guichina.code-telescope");
  if (!ext) return;

  const api = await ext.activate();

  const disposable = api.registerFinder({ ... });
  ctx.subscriptions.push(disposable);
}
```

Declare the dependency in your `package.json` so VS Code activates Code Telescope before your extension:

```json
{
  "extensionDependencies": ["guichina.code-telescope"]
}
```

---

## Registering a finder

A finder registration has two parts:

- **`provider`** — runs in the extension host. Queries data, handles selection, provides preview content.
- **`dataAdapter`** — runs in the webview. Transforms raw data into displayable options.

```ts
const disposable = api.registerFinder({
  provider: {
    fuzzyAdapterType: "ext.mycompany.myplugin.issues",
    previewAdapterType: "preview.buffer",
    dataAdapterType: "ext.mycompany.myplugin.issues",

    async querySelectableOptions() {
      return fetchIssues(); // full Node.js access here
    },

    async onSelect(item) {
      await vscode.env.openExternal(vscode.Uri.parse(item.url));
    },

    async getPreviewData(item) {
      return {
        kind: "text",
        content: item.body,
        language: "markdown",
      };
    },
  },

  dataAdapter: {
    typeName: "ext.mycompany.myplugin.issues",

    parseOptions(data) {
      return data;
    },

    getSearchText(option) {
      return option.title;
    },

    getSelectionValue(option) {
      return JSON.stringify(option);
    },

    // HTML wrapper — see options below
    htmlWrapperPreset: "simple",
  },
});

ctx.subscriptions.push(disposable);
```

### Namespace

Your `fuzzyAdapterType` must use the `ext.` namespace to avoid collisions with built-in and workspace finders:

```
ext.{publisher}.{extensionName}.{finderName}

# examples:
ext.mycompany.github-integration.issues
ext.mycompany.docker.containers
```

---

## HTML wrapper options

The `dataAdapter` requires you to specify how each option is rendered in the list. There are three presets and one custom option:

### `"file-icon"` preset

Picks an icon based on the file extension. `getSearchText` must return a file path.

```ts
dataAdapter: {
  // ...
  htmlWrapperPreset: "file-icon",
  getSearchText(option) {
    return option.relativePath; // must be a path
  },
}
```

### `"codicon"` preset

Uses a VS Code [codicon](https://microsoft.github.io/vscode-codicons/dist/codicon.html). Requires `getCodiconName`.

```ts
dataAdapter: {
  // ...
  htmlWrapperPreset: "codicon",
  getCodiconName(option) {
    return option.type === "bug" ? "bug" : "issues";
  },
}
```

### `"simple"` preset

Plain text, no icon.

```ts
dataAdapter: {
  // ...
  htmlWrapperPreset: "simple",
}
```

### Custom `getHtmlWrapper`

Full control over the rendered HTML. Required when no preset is specified.

```ts
dataAdapter: {
  // ...
  getHtmlWrapper(option, highlightedContent) {
    return `<span class="my-label">${highlightedContent}</span>`;
  },
}
```

---

## Preview renderers

Set `previewAdapterType` on the provider to choose how the preview area renders:

| Value | Description |
|---|---|
| `"preview.buffer"` | Plain text or code with syntax highlighting |
| `"preview.image"` | Image preview |
| `"preview.none"` | No preview — hides the preview pane entirely |

---

## Closure limitations

> **Important:** The `dataAdapter` functions are serialized via `.toString()` and reconstructed in the webview via `eval`. This means:
>
> - Closures that reference external variables **will not work**
> - `require`, `import`, and Node.js APIs are **not available** inside these functions
> - All logic must be **self-contained** within each function body
>
> The `provider` runs normally in the extension host with full Node.js and VS Code API access.

---