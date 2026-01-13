import path from "path";
import * as vscode from "vscode";
import { FuzzyFinderPanelController } from "../core/presentation/fuzzy-panel.controller";
import { Globals } from "../globals";

export function joinPath(baseUri: vscode.Uri, ...paths: string[]): vscode.Uri {
  return vscode.Uri.joinPath(baseUri, ...paths);
}

export function resolvePathExt(_path: string) {
  let ext = path.extname(_path).slice(1).toLowerCase();

  const basename = path.basename(_path).toLowerCase();

  // Special files
  if (basename === "dockerfile" || basename.startsWith("dockerfile.")) {
    return "docker";
  }
  if (basename === "makefile") {
    return "makefile";
  }
  if (basename === ".gitignore") {
    return "txt";
  }
  if (basename === ".gitattributes") {
    return "gitattributes";
  }
  if (basename === ".gitmodules") {
    return "gitmodules";
  }
  if (basename === ".env" || basename.startsWith(".env.")) {
    return "env";
  }
  if (basename === ".editorconfig") {
    return "editorconfig";
  }
  if (basename === ".prettierrc" || basename === "prettier.config.js") {
    return "prettierrc";
  }
  if (basename === ".eslintrc" || basename.startsWith(".eslintrc.")) {
    return "eslintrc";
  }
  if (basename === "package.json") {
    return "json";
  }
  if (ext === "h") {
    return "c";
  }
  if (ext === "feature" || ext === "example") {
    return "txt";
  }

  return ext !== "" ? ext : "txt";
}

const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript",
  tsx: "react",
  js: "javascript",
  jsx: "react",
  mjs: "javascript",
  cjs: "javascript",

  // Python
  py: "python",
  pyi: "python",
  pyc: "python",

  // Go
  go: "go",

  // Rust
  rs: "rust",

  // Java / JVM
  java: "java",
  class: "java",
  jar: "java",
  kt: "kotlin",
  kts: "kotlin",
  scala: "scala",
  groovy: "groovy",

  // C / C++
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hxx: "cpp",

  // C#
  cs: "csharp",

  // Web
  html: "html",
  htm: "html",
  css: "css",
  scss: "sass",
  sass: "sass",
  less: "less",

  // Markup / Data
  md: "markdown",
  mdx: "markdown",
  json: "json",
  jsonc: "json",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  ini: "settings",
  cfg: "settings",
  conf: "settings",

  // Shell / Scripts
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  fish: "shell",
  ps1: "powershell",
  bat: "bat",
  cmd: "bat",

  // Ruby
  rb: "ruby",
  erb: "ruby",

  // PHP
  php: "php",

  // Databases
  // sql: "sql",
  sqlite: "database",
  db: "database",

  // Docker
  docker: "docker",
  dockerfile: "docker",

  // Git
  gitignore: "git",
  gitattributes: "git",
  gitmodules: "git",

  // Package managers
  lock: "lock",

  // Images
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  svg: "svg",
  ico: "image",
  webp: "image",

  // Fonts
  ttf: "font",
  otf: "font",
  woff: "font",
  woff2: "font",

  // Archives
  zip: "zip",
  tar: "zip",
  gz: "zip",
  rar: "zip",
  "7z": "zip",

  // Documents
  pdf: "pdf",
  doc: "word",
  docx: "word",
  xls: "excel",
  xlsx: "excel",
  ppt: "powerpoint",
  pptx: "powerpoint",

  // Config files
  env: "tune",
  editorconfig: "settings",
  prettierrc: "prettier",
  eslintrc: "eslint",

  // Build tools
  gradle: "gradle",
  maven: "maven",
  cmake: "cmake",
  makefile: "makefile",

  // Text
  txt: "document",
  log: "document",

  // Vue / Svelte / Angular
  vue: "vue",
  svelte: "svelte",

  // Other languages
  swift: "swift",
  dart: "dart",
  lua: "lua",
  r: "r",
  jl: "julia",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  hrl: "erlang",
  clj: "clojure",
  cljs: "clojure",
  hs: "haskell",
  elm: "elm",
  ml: "ocaml",
  fs: "fsharp",
  fsx: "fsharp",
};

export function guessLanguageIdFromPath(path: string): string {
  const ext = resolvePathExt(path);
  return EXT_TO_LANGUAGE[ext] ?? "file";
}

export function getSvgIconUrl(path: string) {
  const language = guessLanguageIdFromPath(path);
  const svgPath = joinPath(Globals.EXTENSION_URI, "node_modules", "material-icon-theme", "icons", `${language}.svg`);
  const wv = FuzzyFinderPanelController.instance?.webview!;
  return wv.asWebviewUri(svgPath).toString();
}
