import * as vscode from "vscode";
import { FontData, FontFinderData } from "../../../shared/exchange/font-family";
import { TextPreviewData } from "../../../shared/extension-webview-protocol";
import { execAsync } from "../../utils/commands";
import { PreContextManager } from "../common/pre-context";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../decorators/fuzzy-finder-provider.decorator";

const FALLBACK_FONTS: string[] = [
  "Cascadia Code",
  "Cascadia Mono",
  "Fira Code",
  "Fira Mono",
  "JetBrains Mono",
  "Hack",
  "Inconsolata",
  "Source Code Pro",
  "IBM Plex Mono",
  "Iosevka",
  "Iosevka Term",
  "Victor Mono",
  "Monaspace Neon",
  "Monaspace Argon",
  "Monaspace Xenon",
  "Monaspace Radon",
  "Monaspace Krypton",
  "Geist Mono",
  "Maple Mono",
  "Comic Shanns Mono",
  "Courier New",
  "Consolas",
  "Lucida Console",
  "Monaco",
  "Menlo",
  "DejaVu Sans Mono",
  "Liberation Mono",
];

const platforms = ["linux", "darwin", "win32"] as const;
type Platform = (typeof platforms)[number];

@FuzzyFinderAdapter({
  fuzzy: "workspace.fonts",
  previewRenderer: "preview.font",
  dataAdapter: "fontsAdapter",
  name: "Font Picker",
  description: "Preview and switch editor font family",
})
export class FontsFinder implements FuzzyFinderProvider {
  private fontGetter: Record<Platform, () => Promise<string[]>> = {
    linux: this.getLinuxFonts,
    darwin: this.getMacFonts,
    win32: this.getWindowsFonts,
  };

  private cachedFonts: FontData[] | null = null;

  async querySelectableOptions(): Promise<FontFinderData> {
    const fonts = await this.getFonts();
    const currentFont = vscode.workspace.getConfiguration().get<string>("editor.fontFamily") ?? "";
    const displayTexts = fonts.map((f) => {
      const isCurrent = currentFont.includes(f.name);
      return `${isCurrent ? "● " : "  "}${f.name}`;
    });
    return { fonts, displayTexts };
  }

  async onSelect(selectedIndex: string): Promise<void> {
    const index = parseInt(selectedIndex, 10);
    const fonts = await this.getFonts();
    const selected = fonts[index];
    if (!selected) return;

    const config = vscode.workspace.getConfiguration();
    const current = config.get<string>("editor.fontFamily") ?? "";

    const parts = current
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
    const fallbacks = parts.slice(1);

    const newValue = fallbacks.length > 0 ? `${selected.name}, ${fallbacks.join(", ")}` : selected.name;

    await config.update("editor.fontFamily", newValue, vscode.ConfigurationTarget.Global);
    await PreContextManager.instance.focusOnCapture();
  }

  async getPreviewData(identifier: string): Promise<TextPreviewData> {
    const index = parseInt(identifier, 10);
    const fonts = await this.getFonts();
    const selected = fonts[index];

    if (!selected) {
      return { kind: "text", content: "No font selected", language: "plaintext" };
    }

    return {
      kind: "text",
      content: selected.name,
      language: "plaintext",
      metadata: {
        fontFamily: selected.name,
      },
    };
  }

  private async getFonts(): Promise<FontData[]> {
    if (this.cachedFonts) return this.cachedFonts;

    const systemFonts = await this.getSystemFonts();
    const fonts: FontData[] =
      systemFonts.length > 0
        ? systemFonts.map((name) => ({ name, source: "system" as const }))
        : FALLBACK_FONTS.map((name) => ({ name, source: "fallback" as const }));

    fonts.sort((a, b) => a.name.localeCompare(b.name));

    this.cachedFonts = fonts;
    return fonts;
  }

  private async getSystemFonts(): Promise<string[]> {
    try {
      const fn = this.fontGetter[process.platform as Platform];
      if (!fn) return [];
      return await fn.call(this);
    } catch (e) {
      console.error("Error fetching system fonts:", e);
    }

    return [];
  }

  private async getLinuxFonts(): Promise<string[]> {
    const { stdout } = await execAsync("fc-list : family --format='%{family}\n'");
    return this.deduplicateFonts(
      stdout
        .split("\n")
        .flatMap((line) => line.split(","))
        .map((f) => f.trim())
        .filter(Boolean),
    );
  }

  private async getMacFonts(): Promise<string[]> {
    try {
      const { stdout } = await execAsync("fc-list : family --format='%{family}\n'");
      const fonts = stdout
        .split("\n")
        .flatMap((line) => line.split(","))
        .map((f) => f.trim())
        .filter(Boolean);

      if (fonts.length > 0) return this.deduplicateFonts(fonts);
    } catch {}

    // fallback
    const { stdout } = await execAsync(`system_profiler SPFontsDataType | grep "Full Name:" | sed 's/.*Full Name: //'`);
    return this.deduplicateFonts(
      stdout
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
    );
  }

  private async getWindowsFonts(): Promise<string[]> {
    const { stdout } = await execAsync(
      `reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts" /v "*"`,
    );
    return this.deduplicateFonts(
      stdout
        .split("\n")
        .filter((line) => line.includes("REG_SZ"))
        .map((line) =>
          line
            .split("    ")[1]
            ?.replace(/\s*(Bold|Italic|Regular|Light|Medium|Semibold|Black).*$/i, "")
            .trim(),
        )
        .filter(Boolean),
    );
  }

  private deduplicateFonts(fonts: string[]): string[] {
    return [...new Set(fonts)].sort((a, b) => a.localeCompare(b));
  }
}
