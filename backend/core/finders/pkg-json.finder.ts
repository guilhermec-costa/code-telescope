import * as vscode from "vscode";
import { NpmPackageInfo, PackageData, PackageDocFinderData } from "../../../shared/exchange/pkg-json";
import { TextPreviewData } from "../../../shared/extension-webview-protocol";
import { formatBytes } from "../../utils/files";
import { FuzzyFinderAdapter, FuzzyFinderProvider } from "../decorators/fuzzy-finder-provider.decorator";

/**
 * Fuzzy provider that searches package.json files in the workspace
 * and fetches npm registry documentation for each dependency.
 */
@FuzzyFinderAdapter({
  fuzzy: "workspace.packageDocs",
  previewRenderer: "preview.buffer",
  dataAdapter: "packageDocsAdapter",
  name: "Package Docs",
  description: "Search package.json dependencies and view npm documentation",
})
export class PackageDocsFinder implements FuzzyFinderProvider {
  private cachedPackages: PackageData[] | null = null;

  async querySelectableOptions(): Promise<PackageDocFinderData> {
    const packages = await this.getPackages();
    const displayTexts = packages.map((pkg) => {
      const name = pkg.name.padEnd(40);
      const tag = pkg.isDev ? "[dev]" : "     ";
      return `${name} ${tag}  ${pkg.version}`;
    });
    return {
      packages,
      displayTexts,
    };
  }

  async onSelect(selectedIndex: string) {
    const index = parseInt(selectedIndex, 10);
    const packages = await this.getPackages();
    const selected = packages[index];
    if (!selected) return;

    try {
      const res = await fetch(`https://registry.npmjs.org/${selected.name}/latest`);
      const data: NpmPackageInfo = (await res.json()) as unknown as NpmPackageInfo;
      const url = data.homepage ?? `https://www.npmjs.com/package/${selected.name}`;
      await vscode.env.openExternal(vscode.Uri.parse(url));
    } catch {
      await vscode.env.openExternal(vscode.Uri.parse(`https://www.npmjs.com/package/${selected.name}`));
    }
  }

  async getPreviewData(identifier: string): Promise<TextPreviewData> {
    const index = parseInt(identifier, 10);
    const packages = await this.getPackages();
    const selected = packages[index];

    if (!selected) {
      return {
        content: "No package selected",
        language: "plaintext",
        kind: "text",
      };
    }

    try {
      const res = await fetch(`https://registry.npmjs.org/${selected.name}/latest`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: NpmPackageInfo = (await res.json()) as unknown as NpmPackageInfo;
      const content = this.buildMarkdown(data, selected);

      return {
        content,
        kind: "text",
        language: "markdown",
      };
    } catch (error) {
      return {
        content: this.buildErrorMarkdown(selected, String(error)),
        kind: "text",
        language: "markdown",
      };
    }
  }

  private async getPackages(): Promise<PackageData[]> {
    if (this.cachedPackages) {
      return this.cachedPackages;
    }

    try {
      const packageJsonFiles = await vscode.workspace.findFiles("**/package.json", "**/node_modules/**");

      const packages: PackageData[] = [];
      const seen = new Set<string>();

      for (const file of packageJsonFiles) {
        const document = await vscode.workspace.fs.readFile(file);
        const json = JSON.parse(document.toString());

        const deps: Record<string, string> = json.dependencies ?? {};
        const devDeps: Record<string, string> = json.devDependencies ?? {};

        for (const [name, version] of Object.entries(deps)) {
          if (!seen.has(name)) {
            seen.add(name);
            packages.push({ name, version, sourceFile: file.fsPath, isDev: false });
          }
        }

        for (const [name, version] of Object.entries(devDeps)) {
          if (!seen.has(name)) {
            seen.add(name);
            packages.push({ name, version, sourceFile: file.fsPath, isDev: true });
          }
        }
      }

      packages.sort((a, b) => {
        if (a.isDev !== b.isDev) return a.isDev ? 1 : -1;
        return a.name.localeCompare(b.name);
      });

      this.cachedPackages = packages;
      return packages;
    } catch (error) {
      vscode.window.showErrorMessage(`Error fetching packages: ${error}`);
      return [];
    }
  }

  private buildMarkdown(data: NpmPackageInfo, pkg: PackageData): string {
    const authorName = typeof data.author === "string" ? data.author : (data.author?.name ?? null);

    const repoUrl = data.repository?.url?.replace(/^git\+/, "")?.replace(/\.git$/, "");
    const size = typeof data.dist?.unpackedSize === "number" ? formatBytes(data.dist.unpackedSize) : null;

    const lines: (string | null)[] = [
      `# ${data.name} \`${data.version}\``,
      ``,
      `> Installed as: \`${pkg.version}\` ${pkg.isDev ? "_(devDependency)_" : "_(dependency)_"}`,
      ``,
      data.description ?? "_No description available._",
      ``,
      `## Links`,
      data.homepage ? `- [Homepage](${data.homepage})` : null,
      repoUrl ? `- [Repository](${repoUrl})` : null,
      data.bugs?.url ? `- [Issues](${data.bugs.url})` : null,
      `- [npm](https://www.npmjs.com/package/${data.name})`,
      ``,
      `## Details`,
      `- **License:** ${data.license ?? "_unknown_"}`,
      size ? `- **Size:** ${size}` : null,
      authorName ? `- **Author:** ${authorName}` : null,
      data.maintainers?.length ? `- **Maintainers:** ${data.maintainers.map((m) => m.name).join(", ")}` : null,
      ``,
      data.keywords?.length ? [`## Keywords`, ``, data.keywords.map((k) => `\`${k}\``).join("  ")].join("\n") : null,
    ];

    return lines.filter((line) => line !== null).join("\n");
  }

  private buildErrorMarkdown(pkg: PackageData, error: string): string {
    return [
      `# ${pkg.name}`,
      ``,
      `> Could not fetch data from npm registry.`,
      ``,
      `\`\`\``,
      error,
      `\`\`\``,
      ``,
      `- [View on npm](https://www.npmjs.com/package/${pkg.name})`,
    ].join("\n");
  }
}
