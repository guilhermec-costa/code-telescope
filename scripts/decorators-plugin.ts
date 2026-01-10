import type { Plugin } from "esbuild";
import { globSync } from "glob";
import path from "path";

export function decoratorsPlugin(pattern: string, cwd: string, moduleName: string): Plugin {
  const namespace = `decorators-ns:${moduleName}`;

  return {
    name: `decorators-loader:${moduleName}`,
    setup(build) {
      build.onResolve({ filter: new RegExp(`^${moduleName}$`) }, () => {
        return {
          path: moduleName,
          namespace,
        };
      });

      build.onLoad({ filter: /.*/, namespace }, () => {
        const files = globSync(pattern, {
          cwd,
          absolute: true,
        });

        console.log(`[${moduleName}] Pattern:`, pattern);
        console.log(`[${moduleName}] Glob cwd:`, cwd);
        console.log(`[${moduleName}] Files on plugin:`, files);

        const contents = files.map((file) => `import "${file.replace(/\\/g, "/")}";`).join("\n");

        return {
          contents,
          loader: "ts",
          resolveDir: path.resolve(cwd),
        };
      });
    },
  };
}
