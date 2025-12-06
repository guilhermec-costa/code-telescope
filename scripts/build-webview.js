const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

function findEntryPoints() {
  const root = "ui";
  const result = [];

  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else if (e.isFile() && e.name === "index.ts") {
        result.push(full);
      }
    }
  }

  walk(root);
  return result;
}

async function start() {
  const entryPoints = findEntryPoints();
  console.log("Entry points:", entryPoints);

  await Promise.all(
    entryPoints.map(async (entry) => {
      const relDir = path.dirname(path.relative("ui", entry));
      const outdir = path.join("ui-dist", relDir);

      const ctx = await esbuild.context({
        entryPoints: [entry],
        outfile: path.join(outdir, "index.js"),
        bundle: true,
        format: "iife",
        sourcemap: true,
        target: ["chrome110"],
        minify: false,
        loader: { ".css": "css", ".ts": "ts" },
      });

      await ctx.watch();
      console.log(`👀 Watching ${entry}`);
    })
  );

  console.log("✔️ Webview watch started");
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
