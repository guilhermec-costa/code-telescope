import themeMap from "../config/highlight-themes.json";

export function getShikiTheme(vscodeTheme: string) {
  const themeName = vscodeTheme.toLowerCase();

  for (const rule of themeMap.rules) {
    if (rule.match.every((m) => themeName.includes(m))) {
      return rule.theme;
    }
  }

  return themeName.includes("dark") ? themeMap.fallback.dark : themeMap.fallback.light;
}
