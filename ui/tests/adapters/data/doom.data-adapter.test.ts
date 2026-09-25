import { describe, expect, it } from "vitest";
import { DoomFinderData } from "../../../../shared/exchange/doom";
import { DoomDataAdapter } from "../../../core/adapters/data/doom.data-adapter";

describe("DoomDataAdapter", () => {
  const data: DoomFinderData = {
    items: [
      {
        id: "doom-shareware",
        name: "DOOM Shareware",
        description: "Knee-Deep in the Dead",
      },
    ],
  };

  it("maps the game session into a selectable option", () => {
    const adapter = new DoomDataAdapter();
    const [option] = adapter.parseOptions(data);

    expect(adapter.getSelectionValue(option)).toBe("doom-shareware");
    expect(adapter.getSearchText(option)).toContain("Knee-Deep in the Dead");
    expect(adapter.getHtmlWrapper(option, "DOOM")).toContain("codicon-debug-start");
  });
});
