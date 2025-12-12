import esbuild from "esbuild";
import path from "path";

async function run() {
  await esbuild.build({
    entryPoints: [path.resolve("scripts/shiki-entry.mjs")],
    outfile: "ui/dist/shiki/shiki-bundle.js",
    bundle: true,
    format: "esm",
    platform: "browser",
    external: [],
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(0);
});
