# Dev Container

When running Code Telescope inside a Dev Container, there are known limitations around syntax highlighting.

## Limitations

**Theme:** The active VS Code theme (e.g. Night Owl, Tokyo Night) is installed on the host client and is not accessible from inside the container. As a result, the theme will fall back to `none` — meaning no syntax color tokens are applied. Background and foreground colors are still inherited from the VS Code webview CSS variables, so the editor appearance remains consistent with the active theme.

**Language grammar:** Built-in language grammars (e.g. TypeScript, Python, C) are part of the VS Code client and are not shipped to the container server. Only grammars from extensions explicitly installed inside the container are available. If no grammar is found for the current file, the language falls back to `plaintext` with no syntax tokenization.