import esbuild from "esbuild";
import fs from "fs";
import path from "path";
import extToLang from "../backend/config/ext-to-langs.json";
import { decoratorsPlugin } from "./decorators-plugin";

const args = process.argv.slice(2);
const envArg = args.find((a) => a.startsWith("--env="))?.split("=")[1] || args[0];
const watchArg = args.find((a) => a.startsWith("--watch="))?.split("=")[1] || args[0];
const ENV = envArg === "prod" || envArg === "production" ? "prod" : "dev";
const WATCH = watchArg === "true" ? true : false;

const isProd = ENV === "prod";
console.log(`⚙️ Running build in ${isProd ? "PRODUCTION" : "DEV"} mode`);

function findEntryPoints() {
  const root = "ui";
  const result: string[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name === "index.ts") result.push(full);
    }
  }

  walk(root);
  return result;
}

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) return;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyMaterialIcons() {
  const src = path.resolve("node_modules/material-icon-theme/icons");
  const dest = path.resolve("ui/dist/vendor/material-icons");

  fs.mkdirSync(dest, { recursive: true });

  const languages = new Set<string>(["file"]);
  Object.values(extToLang).forEach((lang) => languages.add(lang));

  const wanted = Array.from(languages).sort().slice(0, 200);

  for (const file of fs.readdirSync(dest)) {
    const full = path.join(dest, file);
    try {
      if (fs.statSync(full).isFile()) fs.unlinkSync(full);
    } catch {}
  }

  let copied = 0;
  for (const iconName of wanted) {
    const file = `${iconName}.svg`;
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    if (!fs.existsSync(srcFile)) continue;
    fs.copyFileSync(srcFile, destFile);
    copied++;
  }

  console.log(`[Build] Copied ${copied}/${wanted.length} material icons to dist/vendor/material-icons`);
}

async function run() {
  const entryPoints = findEntryPoints();
  console.log("Entrypoints:", entryPoints);

  await Promise.all(
    entryPoints.map(async (entry) => {
      const relDir = path.dirname(path.relative("ui", entry));
      const outdir = path.join("./ui/dist", relDir);

      const uiDirPath = path.resolve(process.cwd(), "ui");
      const opts: esbuild.BuildOptions = {
        entryPoints: [entry],
        outfile: path.join(outdir, "index.js"),
        bundle: true,
        format: "esm",
        target: ["chrome110"],
        loader: { ".css": "css", ".ts": "ts" },
        plugins: [
          decoratorsPlugin(
            "core/adapters/preview-renderer/*.renderer-adapter.ts",
            uiDirPath,
            "virtual:preview-renderers",
          ),
          decoratorsPlugin("core/adapters/data/*.data-adapter.ts", uiDirPath, "virtual:data-adapters"),
        ],
        minify: isProd,
        sourcemap: !isProd,
      };

      if (!WATCH) {
        await esbuild.build(opts);
        console.log(`Built: ${entry}`);
      } else {
        const ctx = await esbuild.context(opts);
        await ctx.watch();
        console.log(`Watching ${entry}`);
      }

      const assets = ["views", "style", "vendor"];
      const uiRoot = path.resolve(process.cwd(), "ui");
      const distRoot = path.resolve(process.cwd(), "ui/dist");

      for (const dir of assets) {
        const src = path.join(uiRoot, dir);
        const dest = path.join(distRoot, dir);
        copyDir(src, dest);
        console.log(`Copied ${dir} to dist`);
      }
    }),
  );

  copyMaterialIcons();
  console.log(isProd ? `Production bundle done. Watching: ${WATCH}` : `Dev bundle done. Watching: ${WATCH}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
