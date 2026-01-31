import * as vscode from "vscode";
import { FuzzyProviderType, PreviewRendererType } from "../../../shared/adapters-namespace";
import { HarpoonFinderData } from "../../../shared/exchange/harpoon";
import { HighlightedCodePreviewData } from "../../../shared/extension-webview-protocol";
import { HarpoonOrchestrator } from "../../harpoon/orchestrator";
import { getLanguageIdForFile, getSvgIconUrl } from "../../utils/files";
import { IFuzzyFinderProvider } from "../abstractions/fuzzy-finder.provider";
import { FileReader } from "../common/cache/file-reader";
import { FuzzyFinderAdapter } from "../decorators/fuzzy-finder-provider.decorator";

/**
 * Fuzzy provider for Harpoon marked files
 *
 * Displays all marked files with their indices for quick navigation
 */
@FuzzyFinderAdapter({
  fuzzy: "harpoon.marks",
  previewRenderer: "preview.codeHighlighted",
})
export class HarpoonProvider implements IFuzzyFinderProvider {
  fuzzyAdapterType!: FuzzyProviderType;
  previewAdapterType!: PreviewRendererType;

  private static context: vscode.ExtensionContext;

  public static initialize(context: vscode.ExtensionContext): void {
    HarpoonProvider.context = context;
  }

  private getManager(): HarpoonOrchestrator {
    if (!HarpoonProvider.context) {
      throw new Error("HarpoonProvider not initialized. Call HarpoonProvider.initialize(context) first.");
    }
    return HarpoonOrchestrator.getInstance(HarpoonProvider.context);
  }

  async querySelectableOptions(): Promise<HarpoonFinderData> {
    const marks = this.getManager().getMarks();

    const { displayTexts, svgIconUrls } = marks.reduce<{ displayTexts: string[]; svgIconUrls: string[] }>(
      (result, mark, idx) => {
        result.displayTexts;
        const relativePath = vscode.workspace.asRelativePath(mark.uri);
        const indexDisplay = `[${idx + 1}]`.padEnd(5);
        const label = mark.label ? ` (${mark.label})` : "";
        const position = mark.position ? ` :${mark.position.line + 1}:${mark.position.character + 1}` : "";
        const text = `${indexDisplay} ${relativePath}${position}${label}`;

        result.displayTexts.push(text);
        result.svgIconUrls.push(getSvgIconUrl(mark.uri.fsPath));
        return result;
      },
      { displayTexts: [], svgIconUrls: [] },
    );

    return {
      marks: [...marks],
      displayTexts,
      svgIconUrls,
    };
  }

  async onSelect(selectedIndex: string) {
    const index = parseInt(selectedIndex, 10);
    await this.getManager().navigateTo(index);
  }

  async getPreviewData(identifier: string): Promise<HighlightedCodePreviewData> {
    const index = parseInt(identifier, 10);
    const marks = this.getManager().getMarks();
    const selected = marks[index];

    if (!selected) {
      return {
        content: { path: "", text: "No mark selected", kind: "text" },
        language: "plaintext",
      };
    }

    const filePath = selected.uri.fsPath;
    const highlightLine = selected.position?.line;

    try {
      const content = await FileReader.read(filePath);

      return {
        content: {
          kind: "text",
          path: filePath,
          text: content as string,
        },
        language: await getLanguageIdForFile(filePath),
        metadata: highlightLine !== undefined ? { highlightLine } : undefined,
      };
    } catch (error) {
      return {
        content: {
          kind: "text",
          path: filePath,
          text: `Error loading file: ${error}`,
        },
        language: "plaintext",
      };
    }
  }
}
