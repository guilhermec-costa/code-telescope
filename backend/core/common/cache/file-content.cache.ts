import * as fs from "fs/promises";
import { resolvePathExt } from "../../../utils/files";

export class FileContentCache {
  private static _instance: FileContentCache | undefined;

  private cache = new Map<string, string | Uint8Array>();
  private maxEntries = 50;

  private constructor() {}

  static get instance() {
    if (!this._instance) {
      this._instance = new FileContentCache();
    }
    return this._instance;
  }

  invalidate(absPath: string): void {
    this.cache.delete(absPath);
  }

  async get(absPath: string): Promise<string | Uint8Array> {
    if (this.cache.has(absPath)) {
      return this.cache.get(absPath)!;
    }

    const ext = resolvePathExt(absPath);
    const isImg = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

    const content = isImg
      ? new Uint8Array(await fs.readFile(absPath)) // binário
      : await fs.readFile(absPath, "utf-8"); // texto

    this.cache.set(absPath, content);
    this.evictIfNeeded();

    return content;
  }

  private evictIfNeeded() {
    if (this.cache.size <= this.maxEntries) return;

    const firstKey = this.cache.keys().next().value;
    if (firstKey) this.cache.delete(firstKey);
  }
}
