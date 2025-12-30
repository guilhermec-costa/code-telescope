import { pathToFileURL } from "node:url";
import { glob } from "glob";

export async function loadFuzzyProviders() {
  const files = await glob("**/*.finder.js", {
    cwd: __dirname,
    absolute: true,
  });

  for (const file of files) {
    await import(pathToFileURL(file).href);
  }

  console.log(`[Fuzzy] ${files.length} providers loaded.`);
}
