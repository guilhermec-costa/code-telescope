import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const envArg = args.find((a) => a.startsWith("--env="))?.split("=")[1] || args[0];
const watchArg = args.find((a) => a.startsWith("--watch="))?.split("=")[1] || args[0];

const ENV = envArg === "prod" || envArg === "production" ? "prod" : "dev";
const WATCH = watchArg === "true";

const isProd = ENV === "prod";

console.log(`Backend build in ${isProd ? "PRODUCTION" : "DEV"} mode`);
console.log(`Watch: ${WATCH}`);

const ROOT = path.resolve(process.cwd(), "backend");
const OUT_DIR = path.resolve(process.cwd(), "backend", "dist");

function findEntryPoint() {
  const entry = path.join(ROOT, "extension.ts");

  if (!fs.existsSync(entry)) {
    throw new Error(`Backend entry not found: ${entry}`);
  }

  return entry;
}

async function run() {
  const entryPoint = findEntryPoint();
  console.log("Entrypoint:", entryPoint);

  const opts: esbuild.BuildOptions = {
    entryPoints: [entryPoint],
    outfile: path.join(OUT_DIR, "extension.js"),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: ["node18"],
    sourcemap: !isProd,
    minify: isProd,
    external: ["vscode"],
    logLevel: "info",
  };

  if (!WATCH) {
    await esbuild.build(opts);
    console.log("Backend build finished");
  } else {
    const ctx = await esbuild.context(opts);
    await ctx.watch();
    console.log("Watching backend...");
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
