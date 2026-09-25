import { DoomFinderData, DoomPreviewContent } from "../../../shared/exchange/doom";
import { PreviewData } from "../../../shared/extension-webview-protocol";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../decorators/fuzzy-finder-provider.decorator";

@FuzzyFinderAdapter({
  fuzzy: "fun.doom",
  previewRenderer: "preview.doom",
  dataAdapter: "doomAdapter",
  name: "DOOM",
  description: "Run the original DOOM shareware episode inside Code Telescope",
})
export class DoomFinder implements FuzzyFinderProvider {
  async querySelectableOptions(): Promise<DoomFinderData> {
    return {
      items: [
        {
          id: "doom-shareware",
          name: "DOOM Shareware",
          description: "Knee-Deep in the Dead — running locally in WebAssembly",
        },
      ],
    };
  }

  async onSelect(): Promise<void> {
    // The game is hosted by the preview renderer. Enter intentionally keeps
    // the panel open so keyboard input can be handed to DOOM.
  }

  async getPreviewData(): Promise<PreviewData<DoomPreviewContent>> {
    return {
      content: {
        enginePath: "vendor/doom/wasmdoom.wasm",
        musicEnginePath: "vendor/doom/wasmdoom.music.wasm",
        wadPath: "vendor/doom/doom1.wad",
      },
      metadata: {
        edition: "DOOM Shareware 1.9",
      },
    };
  }
}
