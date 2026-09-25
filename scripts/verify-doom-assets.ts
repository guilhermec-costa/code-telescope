import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type Artifact = {
  bytes: number;
  sha256: string;
  kind: "wasm" | "iwad" | "png";
  expectedImports?: number;
};

type DoomManifest = {
  engine: { release: string; commit: string };
  artifacts: Record<string, Artifact>;
  requiredNotices: string[];
};

const assetDirectory = resolve(process.cwd(), "ui/vendor/doom");
const manifestPath = resolve(assetDirectory, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as DoomManifest;

function fail(message: string): never {
  throw new Error(`[DOOM assets] ${message}`);
}

for (const notice of manifest.requiredNotices) {
  if (!existsSync(resolve(assetDirectory, notice))) fail(`Missing required notice: ${notice}`);
}

for (const [name, expected] of Object.entries(manifest.artifacts)) {
  const filePath = resolve(assetDirectory, name);
  if (!existsSync(filePath)) fail(`Missing artifact: ${name}`);

  const bytes = readFileSync(filePath);
  if (bytes.byteLength !== expected.bytes) {
    fail(`${name} has ${bytes.byteLength} bytes; expected ${expected.bytes}`);
  }

  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (sha256 !== expected.sha256) fail(`${name} SHA-256 mismatch: ${sha256}`);

  if (expected.kind === "wasm") {
    if (!WebAssembly.validate(bytes)) fail(`${name} is not a valid WebAssembly module`);
    const imports = WebAssembly.Module.imports(new WebAssembly.Module(bytes));
    if (imports.length !== expected.expectedImports) {
      fail(`${name} imports ${imports.length} host capabilities; expected ${expected.expectedImports}`);
    }
  } else if (expected.kind === "iwad" && bytes.subarray(0, 4).toString("ascii") !== "IWAD") {
    fail(`${name} does not have an IWAD header`);
  } else if (expected.kind === "png" && bytes.subarray(1, 4).toString("ascii") !== "PNG") {
    fail(`${name} does not have a PNG signature`);
  }
}

console.log(
  `[DOOM assets] Verified ${Object.keys(manifest.artifacts).length} artifacts from ${manifest.engine.release} (${manifest.engine.commit.slice(0, 12)}).`,
);
