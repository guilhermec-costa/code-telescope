import themeMap from "../config/highlight-themes.json";
import { ThemeLoader } from "../core/theme-loader";

export function getShikiTheme(vscodeTheme: string) {
  const themeName = vscodeTheme.toLowerCase();

  for (const rule of themeMap.rules) {
    if (rule.match.every((m) => themeName.includes(m.toLowerCase()))) {
      return rule.theme;
    }
  }

  return themeName.includes("dark") ? themeMap.fallback.dark : themeMap.fallback.light;
}

export async function getCurThemeMetadata() {
  const themeData = await ThemeLoader.getThemeData();
  return {
    themeType: themeData.type,
    themeJson: themeData.jsonData,
  };
}
