import { FuzzyProviderType, PreviewRendererType } from "../../../../shared/adapters-namespace";
import { FileFinderData } from "../../../../shared/exchange/file-search";
import { IFuzzyFinderDataAdapter } from "../../abstractions/fuzzy-finder-data-adapter";
import { FuzzyFinderDataAdapter } from "../../decorators/fuzzy-data-adapter.decorator";

export interface FileOption {
  absolute: string;
  relative: string;
}

@FuzzyFinderDataAdapter({
  fuzzy: "workspace.files",
  preview: "preview.codeHighlighted",
})
export class WorkspaceFilesFinderDataAdapter implements IFuzzyFinderDataAdapter<FileFinderData, FileOption> {
  previewAdapterType: PreviewRendererType;
  fuzzyAdapterType: FuzzyProviderType;

  parseOptions(data: FileFinderData): FileOption[] {
    const options: FileOption[] = [];

    for (let i = 0; i < data.relative.length; i++) {
      options.push({
        absolute: data.abs[i],
        relative: data.relative[i],
      });
    }

    return options;
  }

  getDisplayText(option: FileOption): string {
    const icon = this.getIconForFile(option.absolute);

    let displayPath: string;
    switch (__FILE_PATH_DISPLAY__) {
      case "relative":
        displayPath = option.relative;
        break;
      case "absolute":
        displayPath = option.absolute;
        break;
      case "filename-only":
        displayPath = option.absolute.split(/[\\/]/).pop() || option.absolute;
        break;
      default:
        displayPath = option.relative;
    }

    return `${icon} ${displayPath}`;
  }

  private getIconForFile(filepath: string): string {
    const filename = filepath.split(/[\\/]/).pop() || "";

    // Casos especiais por nome completo
    const specialFiles: Record<string, string> = {
      "package.json": "",
      "tsconfig.json": "󰛦",
      ".gitignore": "",
      dockerfile: "",
      "docker-compose.yml": "",
      ".env": "",
      "readme.md": "",
      license: "",
    };

    const lowerFilename = filename.toLowerCase();
    if (specialFiles[lowerFilename]) {
      return specialFiles[lowerFilename];
    }

    // Por extensão
    const extension = this.getFileExtension(filename);
    return this.getIconForExtension(extension);
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot === -1) return "";
    return filename.slice(lastDot + 1).toLowerCase();
  }

  private getIconForExtension(extension: string): string {
    const iconMap: Record<string, string> = {
      ts: "nf-dev-typescript",
      tsx: "",
      js: "󰌞",
      jsx: "",
      py: "󰌠",
      java: "",
      cpp: "",
      c: "",
      cs: "󰌛",
      go: "󰟓",
      rs: "",
      php: "󰌟",
      rb: "",
      swift: "",
      kt: "󱈙",

      // Web
      html: "",
      css: "",
      scss: "",
      sass: "",
      less: "",
      vue: "󰡄",
      svelte: "",

      // Dados e config
      json: "",
      yaml: "",
      yml: "",
      toml: "",
      xml: "󰗀",
      md: "",
      txt: "󰈙",

      // Outros
      sql: "",
      sh: "",
      bash: "",
      env: "",
      lock: "",
      pdf: "",
      zip: "",
      tar: "",
      gz: "",
      png: "",
      jpg: "",
      jpeg: "",
      gif: "",
      svg: "󰜡",
    };

    return iconMap[extension] || "󰈔"; // ícone padrão
  }

  getSelectionValue(option: FileOption): string {
    return option.absolute;
  }

  filterOption(option: FileOption, query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return option.relative.toLowerCase().includes(lowerQuery);
  }
}
