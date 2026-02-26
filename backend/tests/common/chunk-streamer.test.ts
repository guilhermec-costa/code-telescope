import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChunkStreamer } from "../../core/chunk-streamer";
import { FuzzyFinderPanelController } from "../../core/presentation/fuzzy-panel.controller";

const { mockSendMessage } = vi.hoisted(() => ({
  mockSendMessage: vi.fn(),
}));

vi.mock("@backend/core/presentation/fuzzy-panel.controller", () => ({
  FuzzyFinderPanelController: {
    instance: {
      webview: {
        postMessage: vi.fn(),
      },
    },
  },
}));

vi.mock("@backend/core/presentation/webview.controller", () => ({
  WebviewController: {
    sendMessage: mockSendMessage,
  },
}));

describe("ChunkStreamer", () => {
  let mockWebview: any;
  let mockItems: string[];

  beforeEach(() => {
    mockWebview = { postMessage: vi.fn() };
    mockItems = Array.from({ length: 10 }, (_, i) => `item-${i}`);
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should use default chunkSize of 2000 when not provided", () => {
      const streamer = new ChunkStreamer(mockItems, {
        messageType: "optionList",
        fuzzyProviderType: "workspace.files",
        dataAdapterType: "workspaceFilesAdapter",
        totalLimit: 10,
      });

      expect(streamer["chunkSize"]).toBe(2000);
    });

    it("should use custom chunkSize when provided", () => {
      const size = 100;
      const streamer = new ChunkStreamer(mockItems, {
        messageType: "optionList",
        fuzzyProviderType: "workspace.files",
        dataAdapterType: "workspaceFilesAdapter",
        chunkSize: size,
        totalLimit: 10,
      });

      expect(streamer["chunkSize"]).toBe(size);
    });
  });

  describe("streamAsync", () => {
    it("should send chunks of items with configured chunkSize", async () => {
      const smallItems = ["a", "b", "c", "d", "e"];
      const streamer = new ChunkStreamer(smallItems, {
        messageType: "optionList",
        fuzzyProviderType: "workspace.files",
        dataAdapterType: "workspaceFilesAdapter",
        chunkSize: 2,
        totalLimit: 5,
        query: "test",
      });

      await streamer.streamAsync();

      expect(mockSendMessage).toHaveBeenCalledTimes(3);
    });

    it("should apply mapChunk function to each chunk", async () => {
      const smallItems = ["a", "b", "c"];
      const mapFn = vi.fn((items: string[]) => items.map((i) => ({ label: i })));

      const streamer = new ChunkStreamer(smallItems, {
        messageType: "optionList",
        fuzzyProviderType: "workspace.files",
        dataAdapterType: "workspaceFilesAdapter",
        chunkSize: 2,
        totalLimit: 3,
        mapChunk: mapFn,
      });

      await streamer.streamAsync();

      expect(mapFn).toHaveBeenCalled();
    });

    it("should return early if no webview available", async () => {
      (FuzzyFinderPanelController["instance"] as unknown) = undefined;

      const streamer = new ChunkStreamer(mockItems, {
        messageType: "optionList",
        fuzzyProviderType: "workspace.files",
        dataAdapterType: "workspaceFilesAdapter",
        totalLimit: 10,
      });

      await streamer.streamAsync();

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });

  describe("streamConcurrently", () => {
    it("should return early if no webview available", async () => {
      (FuzzyFinderPanelController["instance"] as unknown) = undefined;

      const streamer = new ChunkStreamer(mockItems, {
        messageType: "optionList",
        fuzzyProviderType: "workspace.files",
        dataAdapterType: "workspaceFilesAdapter",
        totalLimit: 10,
      });

      await streamer.streamConcurrently();

      expect(mockSendMessage).not.toHaveBeenCalled();
    });
  });
});
