import { FuzzyProviderType } from "../../../shared/adapters-namespace";
import { BuiltinFinderData, BuiltinFinderItem } from "../../../shared/exchange/builtin";
import { TextPreviewData } from "../../../shared/extension-webview-protocol";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../decorators/fuzzy-finder-provider.decorator";
import { FuzzyFinderPanelController } from "../presentation/fuzzy-panel.controller";
import { FuzzyFinderAdapterRegistry } from "../registry/fuzzy-provider.registry";

@FuzzyFinderAdapter({
  fuzzy: "builtin.finders",
  previewRenderer: "preview.buffer",
  dataAdapter: "builtinFindersAdapter",
  name: "Builtin Finders",
  description: "List all available builtin finders",
})
export class BuiltinFinder implements FuzzyFinderProvider {
  async querySelectableOptions(): Promise<BuiltinFinderData> {
    const registeredTypes = FuzzyFinderAdapterRegistry.instance.getRegisteredTypes();
    const builtinTypes = registeredTypes.filter((type) => !type.startsWith("custom.") && type !== "builtin.finders");

    const items: BuiltinFinderItem[] = builtinTypes.map((type) => {
      const adapter = FuzzyFinderAdapterRegistry.instance.getAdapter(type as FuzzyProviderType);
      return {
        type: type as FuzzyProviderType,
        name: adapter?.finderName || this.formatFinderName(type),
        description: adapter?.finderDescription || "",
      };
    });

    return { items };
  }

  async onSelect(index: string): Promise<void> {
    const data = await this.querySelectableOptions();
    const idx = parseInt(index, 10);
    const selected = data.items[idx];
    if (selected) {
      await FuzzyFinderPanelController.setupProvider(selected.type as FuzzyProviderType);
    }
  }

  async getPreviewData(identifier: string): Promise<TextPreviewData> {
    const data = await this.querySelectableOptions();
    const idx = parseInt(identifier, 10);
    const selected = data.items[idx];

    if (!selected) {
      return {
        content: "No finder selected",
        kind: "text",
        language: "plaintext",
      };
    }

    const content = `/**
 * Finder: ${selected.name}
 * Type: ${selected.type}
 * Description: ${selected.description || "N/A"}
 */

Select this finder to open it directly.`;

    return {
      content,
      kind: "text",
      language: "typescript",
    };
  }

  private formatFinderName(type: string): string {
    return type
      .split(".")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
}
