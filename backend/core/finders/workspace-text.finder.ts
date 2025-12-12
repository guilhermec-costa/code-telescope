import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { TextSearchMatch } from "../../../shared/exchange/workspace-text-search";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { findWorkspaceFiles } from "../../utils/files";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";
import { IFuzzyFinderProvider } from "./fuzzy-finder.provider";

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

@FuzzyFinderAdapter({
  fuzzy: "workspace.text",
  previewRenderer: "preview.codeHighlighted",
})
export class WorkspaceTextSearchProvider implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  public readonly supportsDynamicSearch = true;

  getHtmlLoadConfig() {
    return {
      fileName: "file-fuzzy.view.html",
      placeholders: {
        "{{style}}": "ui/style/style.css",
        "{{script}}": "ui/dist/index.js",
      },
    };
  }

  async querySelectableOptions() {
    return { results: [], query: "", message: "Type to search..." };
  }

  async searchOptions(query: string): Promise<any> {
    if (!query || query.trim().length < 2) return { results: [], query };

    const matches: TextSearchMatch[] = [];
    const MAX_RESULTS = 200;
    const BATCH_SIZE = 50;

    const queryRegex = new RegExp(escapeRegExp(query), "gi");

    try {
      const uris = await findWorkspaceFiles(
        "**/*",
        "**/{node_modules,.git,dist,out,build,coverage,*.min.js,*.map}/**",
        3000,
      );

      for (let i = 0; i < uris.length; i += BATCH_SIZE) {
        if (matches.length >= MAX_RESULTS) break;

        const batch = uris.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map(async (uri) => {
            if (matches.length >= MAX_RESULTS) return;

            try {
              const stat = await fs.stat(uri.fsPath);
              // files > 300kb
              if (stat.size > 300 * 1024) return;

              const content = await fs.readFile(uri.fsPath, "utf-8");
              queryRegex.lastIndex = 0;

              const match = queryRegex.exec(content);

              if (match) {
                const matchIndex = match.index;
                const lineStart = content.lastIndexOf("\n", matchIndex) + 1;

                let lineEnd = content.indexOf("\n", matchIndex);
                if (lineEnd === -1) lineEnd = content.length;

                const lineContent = content.substring(lineStart, lineEnd);

                if (lineContent.length > 500) return;

                let lineNumber = 1;
                for (let k = 0; k < lineStart; k++) {
                  if (content[k] === "\n") lineNumber++;
                }

                matches.push({
                  file: uri.fsPath,
                  line: lineNumber,
                  column: matchIndex - lineStart + 1,
                  text: lineContent.trim(),
                  preview: lineContent.trim(),
                });
              }
            } catch (_e) {}
          }),
        );
      }

      return {
        results: matches,
        query: query,
        message: matches.length === 0 ? `No results found` : undefined,
      };
    } catch (error) {
      console.error(error);
      return { results: [], query, message: "Error" };
    }
  }

  async getPreviewData(identifier: string): Promise<PreviewData> {
    const parts = identifier.split(":");
    const filePath = parts[0];
    const line = parts[1];
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n");
      return {
        content,
        language: path.extname(filePath).slice(1) || "text",
        metadata: { filePath, highlightLine: parseInt(line) - 1, totalLines: lines.length },
      };
    } catch (_e) {
      return { content: "Error", language: "text" };
    }
  }

  async onSelect(identifier: string) {
    const parts = identifier.split(":");
    const uri = vscode.Uri.file(parts[0]);
    const pos = new vscode.Position(parseInt(parts[1]) - 1, parseInt(parts[2] || "1") - 1);
    const editor = await vscode.window.showTextDocument(uri, { selection: new vscode.Range(pos, pos) });
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
  }
}
