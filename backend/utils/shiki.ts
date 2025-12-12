export function getShikiTheme(vscodeTheme: string) {
  const themeName = vscodeTheme.toLowerCase();

  if (themeName.includes("dark+") || themeName.includes("dark plus")) {
    return "dark-plus";
  }
  if (themeName.includes("light+") || themeName.includes("light plus")) {
    return "light-plus";
  }
  if (themeName.includes("monokai")) {
    return "monokai";
  }
  if (themeName.includes("solarized") && themeName.includes("dark")) {
    return "solarized-dark";
  }
  if (themeName.includes("solarized") && themeName.includes("light")) {
    return "solarized-light";
  }
  if (themeName.includes("dracula")) {
    return "dracula";
  }
  if (themeName.includes("github") && themeName.includes("dark")) {
    return "github-dark";
  }
  if (themeName.includes("github") && themeName.includes("light")) {
    return "github-light";
  }
  if (themeName.includes("nord")) {
    return "nord";
  }
  if (themeName.includes("one dark")) {
    return "one-dark-pro";
  }
  if (themeName.includes("night owl")) {
    return "night-owl";
  }
  if (themeName.includes("tokyo night")) {
    return "tokyo-night";
  }
  if (themeName.includes("kanagawa wave")) {
    return "kanagawa-wave";
  }

  return themeName.includes("dark") ? "dark-plus" : "light-plus";
}

export function getShikiLanguage(vscodeLanguage: string) {
  const lang = vscodeLanguage.toLowerCase();

  if (lang.includes("typescript") || lang === "ts") {
    return "ts";
  }
  if (lang.includes("javascript") || lang === "js") {
    return "js";
  }
  if (lang.includes("json")) {
    return "json";
  }
  if (lang.includes("html")) {
    return "html";
  }
  if (lang.includes("css")) {
    return "css";
  }
  if (lang.includes("python") || lang === "py") {
    return "python";
  }
  if (lang.includes("java")) {
    return "java";
  }
  if (lang.includes("c#") || lang.includes("csharp")) {
    return "csharp";
  }
  if (lang.includes("c++") || lang.includes("cpp")) {
    return "cpp";
  }
  if (lang.includes("rust")) {
    return "rust";
  }
  if (lang.includes("go") || lang.includes("golang")) {
    return "go";
  }
  if (lang.includes("ruby")) {
    return "ruby";
  }
  if (lang.includes("php")) {
    return "php";
  }
  if (lang.includes("swift")) {
    return "swift";
  }
  if (lang.includes("kotlin")) {
    return "kotlin";
  }

  return lang;
}
