import * as fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { PreviewData } from "../../../../shared/extension-webview-protocol";
import { IFuzzyFinderProvider } from "../../abstractions/fuzzy-finder.provider";
import { FuzzyFinderAdapter } from "../../decorators/fuzzy-finder-provider.decorator";
import { RegexFinder } from "./regex-finder";
import { RipgrepFinder } from "./ripgrep-finder";

@FuzzyFinderAdapter({
  fuzzy: "workspace.text",
  previewRenderer: "preview.codeHighlighted",
})
export class WorkspaceTextSearchProvider implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  public readonly supportsDynamicSearch = true;
  private readonly regexFinder: RegexFinder;
  private readonly ripgrepFinder: RipgrepFinder;

  constructor() {
    this.regexFinder = new RegexFinder();
    this.ripgrepFinder = new RipgrepFinder();
  }

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
    if (!query || query.trim().length < 2) {
      return { results: [], query };
    }

    if (this.ripgrepFinder.ripgrepAvailable) {
      try {
        return await this.ripgrepFinder.search(query);
      } catch (error) {
        console.error("ripgrep search failed, falling back:", error);
        return await this.regexFinder.search(query);
      }
    } else {
      return await this.regexFinder.search(query);
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
        metadata: {
          filePath,
          highlightLine: parseInt(line) - 1,
          totalLines: lines.length,
        },
      };
    } catch (_e) {
      return { content: "Error loading file", language: "text" };
    }
  }

  async onSelect(identifier: string) {
    const parts = identifier.split(":");
    const uri = vscode.Uri.file(parts[0]);
    const pos = new vscode.Position(parseInt(parts[1]) - 1, parseInt(parts[2] || "1") - 1);

    const editor = await vscode.window.showTextDocument(uri, {
      selection: new vscode.Range(pos, pos),
    });

    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
  }
}
