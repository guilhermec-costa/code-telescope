import { describe, expect, it } from "vitest";
import { DoomFinder } from "../../core/finders/doom.finder";

describe("DoomFinder", () => {
  it("exposes the shareware session", async () => {
    const finder = new DoomFinder();
    const data = await finder.querySelectableOptions();

    expect(data.items).toEqual([
      expect.objectContaining({
        id: "doom-shareware",
        name: "DOOM Shareware",
      }),
    ]);
  });

  it("points the preview at packaged local assets", async () => {
    const finder = new DoomFinder();
    const preview = await finder.getPreviewData();

    expect(preview.content).toEqual({
      enginePath: "vendor/doom/wasmdoom.wasm",
      musicEnginePath: "vendor/doom/wasmdoom.music.wasm",
      wadPath: "vendor/doom/doom1.wad",
      titleImagePath: "vendor/doom/titlepic.png",
    });
  });
});
