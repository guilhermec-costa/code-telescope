import { pathToFileURL } from "node:url";
import { glob } from "glob";

export async function loadDecorators(pattern: string, cwd: string) {
  const files = await glob(pattern, {
    cwd,
    absolute: true,
  });

  for (const file of files) {
    try {
      await import(pathToFileURL(file).href);
    } catch {}
  }

  console.log(`[Fuzzy] ${files.length} providers loaded.`);
}
