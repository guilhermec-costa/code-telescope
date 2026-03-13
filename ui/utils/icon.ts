import extToIcon from "../config/ext-to-icon-name.json";
import extToLangId from "../config/ext-to-langid.json";

function extname(filePath: string): string {
  const lastDot = filePath.lastIndexOf(".");
  const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));

  if (lastDot === -1 || lastDot < lastSlash) return "";
  return filePath.slice(lastDot);
}

function basename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? "";
}

/**
 * Resolve file extension considering special filenames
 */
export function resolveIconKey(filePath: string): string {
  const ext = extname(filePath).slice(1).toLowerCase();
  const base = basename(filePath).toLowerCase();

  if (base === "readme" || base === "readme.md") return "readme";
  if (base === "dockerfile" || base.startsWith("dockerfile.")) return "docker";
  if (base === "makefile" || base.startsWith("makefile.")) return "makefile";
  if (base === ".gitignore") return "gitignore";
  if (base === ".gitattributes") return "gitattributes";
  if (base === ".gitmodules") return "gitmodules";
  if (base === ".env" || base.startsWith(".env.")) return "env";
  if (base === ".editorconfig") return "editorconfig";
  if (base === ".prettierrc" || base === "prettier.config.js") return "prettierrc";
  if (base === ".eslintrc" || base.startsWith(".eslintrc.")) return "eslintrc";

  return ext !== "" ? ext : "txt";
}

/**
 * Resolve icon name from extension mapping
 */
export function getIconNameFromPath(filePath: string): string {
  const ext = resolveIconKey(filePath).toLowerCase();
  return (extToIcon as Record<string, string>)[ext] ?? "file";
}

const svgIconUrlCache = new Map<string, string>();

export function getSvgIconUrl(filePath: string): string {
  const language = getIconNameFromPath(filePath);
  const cached = svgIconUrlCache.get(language);
  if (cached) return cached;

  const url = `./vendor/material-icons/${language}.svg`;
  svgIconUrlCache.set(language, url);
  return url;
}

export function getLanguageIdForFile(filePath: string): string {
  const ext = extname(filePath).slice(1).toLowerCase();
  const base = basename(filePath).toLowerCase();

  if (base === "makefile" || base.startsWith("makefile.")) return "makefile";
  if (base === "dockerfile" || base.startsWith("dockerfile.")) return "dockerfile";
  if (base === ".gitignore" || base === ".dockerignore" || base === ".prettierignore") return "ignore";
  if (base === ".gitattributes") return "ignore";
  if (base === ".env" || base.startsWith(".env.")) return "dotenv";
  if (base === ".editorconfig") return "ini";
  if (base === ".prettierrc") return "json";
  if (base === ".eslintrc") return "json";
  if (base === ".babelrc") return "json";
  if (base === ".npmrc" || base === ".yarnrc") return "ini";
  if (base === ".bashrc" || base === ".bash_profile" || base === ".zshrc" || base === ".profile") return "shellscript";
  if (base === "gemfile" || base === "rakefile" || base === "podfile" || base === "vagrantfile") return "ruby";
  if (base === "cmakelists.txt") return "cmake";
  if (base === "gradlew") return "shellscript";

  const key = ext ? `.${ext}` : "";
  return (extToLangId as Record<string, string>)[key] || "plaintext";
}
