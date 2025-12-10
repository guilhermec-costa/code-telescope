const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

const args = process.argv.slice(2);
const envArg = args.find((a) => a.startsWith("--env="))?.split("=")[1] || args[0];
const ENV = envArg === "prod" || envArg === "production" ? "prod" : "dev";

const isProd = ENV === "prod";
console.log(`⚙️ Running build in ${isProd ? "PRODUCTION" : "DEV"} mode`);

function findEntryPoints() {
  const root = "ui";
  const result = [];

  function walk(dir) {
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

async function run() {
  const entryPoints = findEntryPoints();
  console.log("Entrypoints:", entryPoints);

  await Promise.all(
    entryPoints.map(async (entry) => {
      const relDir = path.dirname(path.relative("ui", entry));
      const outdir = path.join("./ui/dist", relDir);

      const opts = {
        entryPoints: [entry],
        outfile: path.join(outdir, "index.js"),
        bundle: true,
        format: "iife",
        target: ["chrome110"],
        loader: { ".css": "css", ".ts": "ts" },
        minify: isProd,
        sourcemap: !isProd,
      };

      if (isProd) {
        await esbuild.build(opts);
        console.log(`Built: ${entry}`);
      } else {
        const ctx = await esbuild.context(opts);
        await ctx.watch();
        console.log(`Watching ${entry}`);
      }
    }),
  );

  console.log(isProd ? "Production build completed" : "Dev watch started");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
