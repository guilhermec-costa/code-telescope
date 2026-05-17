import {
  getProviderListTitle,
  getProviderPreviewTitle,
  getProviderPromptMessage,
  getProviderTabTitle,
} from "@backend/utils/configuration";
import { describe, expect, it } from "vitest";

describe("configuration provider metadata", () => {
  it("returns metadata for the resume finder", () => {
    expect(getProviderTabTitle("builtin.resume")).toBe("Resume");
    expect(getProviderListTitle("builtin.resume")).toBe("Resume");
    expect(getProviderPreviewTitle("builtin.resume")).toBe("Resume Details");
    expect(getProviderPromptMessage("builtin.resume")).toBe("Resume last finder...");
  });

  it("returns metadata for git diff providers", () => {
    expect(getProviderTabTitle("git.diffs")).toBe("Git Diffs");
    expect(getProviderListTitle("git.diffs")).toBe("Changed Files");
    expect(getProviderPreviewTitle("git.diffs")).toBe("Diff Preview");
    expect(getProviderPromptMessage("git.diffs")).toBe("Git diffs...");
  });

  it("formats custom providers with the custom prefix", () => {
    expect(getProviderTabTitle("custom.teamIssues" as any)).toBe("Custom · TeamIssues");
    expect(getProviderListTitle("custom.teamIssues" as any)).toBe("TeamIssues Options");
    expect(getProviderPreviewTitle("custom.teamIssues" as any)).toBe("TeamIssues Preview");
    expect(getProviderPromptMessage("custom.teamIssues" as any)).toBe("TeamIssues...");
  });

  it("formats external providers using the last segment name", () => {
    expect(getProviderTabTitle("ext.githubIssues" as any)).toBe("GithubIssues");
    expect(getProviderListTitle("ext.githubIssues" as any)).toBe("GithubIssues Options");
  });
});
