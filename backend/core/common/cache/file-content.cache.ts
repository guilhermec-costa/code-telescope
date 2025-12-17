import * as fs from "fs/promises";

export class FileContentCache {
  private static _instance: FileContentCache | undefined;

  private cache = new Map<string, string>();
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

  async get(absPath: string): Promise<string> {
    if (this.cache.has(absPath)) {
      return this.cache.get(absPath)!;
    }

    const content = await fs.readFile(absPath, "utf-8");

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
