export function getShikiTheme(vscodeTheme: string): string {
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

  return themeName.includes("dark") ? "dark-plus" : "light-plus";
}
