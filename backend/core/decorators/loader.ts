import { pathToFileURL } from "node:url";
import { glob } from "glob";
import { stringifyError } from "../../utils/commands";
import { Logger } from "../log";

export async function loadDecorators(pattern: string, cwd: string) {
  const files = await glob(pattern, {
    cwd,
    absolute: true,
  });

  for (const file of files) {
    try {
      await import(pathToFileURL(file).href);
    } catch (err) {
      Logger.error(`Failed to load decoratror at ${pattern}: ${stringifyError(err)}`);
    }
  }

  Logger.info(`[Decorator Loader] ${files.length} providers loaded.`);
}
