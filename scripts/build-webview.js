const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

function findEntryPoints() {
  const root = "media-src";
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

const entryPoints = findEntryPoints();
console.log("Entry points:", entryPoints);

Promise.all(
  entryPoints.map((entry) => {
    const relDir = path.dirname(path.relative("media-src", entry));
    const outdir = path.join("media-dist", relDir);

    return esbuild.build({
      entryPoints: [entry],
      outfile: path.join(outdir, "index.js"),
      bundle: true,
      format: "iife",
      sourcemap: true,
      target: ["chrome110"],
      minify: false,
      loader: {
        ".css": "css",
        ".ts": "ts",
      },
    });
  })
)
  .then(() => console.log("Webview build completed"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
