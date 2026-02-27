import extToIcon from "../config/ext-to-icon-name.json";

/**
 * Browser-safe path utilities
 */
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
export function resolvePathExt(filePath: string): string {
  let ext = extname(filePath).slice(1).toLowerCase();
  const base = basename(filePath).toLowerCase();

  // Special files
  if (base === "dockerfile" || base.startsWith("dockerfile.")) {
    return "docker";
  }

  if (base === "makefile") {
    return "makefile";
  }

  if (base === ".gitignore") {
    return "txt";
  }

  if (base === ".gitattributes") {
    return "gitattributes";
  }

  if (base === ".gitmodules") {
    return "gitmodules";
  }

  if (base === ".env" || base.startsWith(".env.")) {
    return "env";
  }

  if (base === ".editorconfig") {
    return "editorconfig";
  }

  if (base === ".prettierrc" || base === "prettier.config.js") {
    return "prettierrc";
  }

  if (base === ".eslintrc" || base.startsWith(".eslintrc.")) {
    return "eslintrc";
  }

  if (base === "package.json") {
    return "json";
  }

  // C header treated as C
  if (ext === "h") {
    return "c";
  }

  return ext !== "" ? ext : "txt";
}

/**
 * Resolve icon name from extension mapping
 */
export function getIconNameFromPath(filePath: string): string {
  const ext = resolvePathExt(filePath).toLowerCase();
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
