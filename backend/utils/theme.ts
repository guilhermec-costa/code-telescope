import { ThemeLoader } from "../core/theme-loader";

export async function getCurThemeMetadata() {
  const themeData = await ThemeLoader.getCurrentThemeData();
  return {
    themeType: themeData.type,
    themeJson: themeData.jsonData,
  };
}
