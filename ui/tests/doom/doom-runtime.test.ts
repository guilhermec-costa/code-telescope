import { describe, expect, it } from "vitest";
import { indexedFrameToRgba, stageDoomArguments } from "../../core/doom/doom-runtime";

describe("DOOM runtime helpers", () => {
  it("stages null-separated engine arguments", () => {
    const memory = new WebAssembly.Memory({ initial: 1 });

    stageDoomArguments(memory, 0, ["-mode", "shareware"]);

    expect(Array.from(new Uint8Array(memory.buffer, 0, 17))).toEqual([
      45, 109, 111, 100, 101, 0, 115, 104, 97, 114, 101, 119, 97, 114, 101, 0, 0,
    ]);
  });

  it("expands indexed pixels through the DOOM palette", () => {
    const output = new Uint8ClampedArray(8);
    const palette = new Uint8Array(256 * 3);
    palette.set([10, 20, 30], 3);

    indexedFrameToRgba(new Uint8Array([1, 0]), palette, output);

    expect(Array.from(output)).toEqual([10, 20, 30, 255, 0, 0, 0, 255]);
  });
});
