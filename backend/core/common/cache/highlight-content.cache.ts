export class HighlightContentCache {
  private static _instance: HighlightContentCache | undefined;

  private cache = new Map<string, string>();
  private maxEntries = 50;

  private constructor() {}

  static get instance(): HighlightContentCache {
    if (!this._instance) {
      this._instance = new HighlightContentCache();
    }
    return this._instance;
  }

  get(absPath: string): string | undefined {
    return this.cache.get(absPath);
  }

  has(absPath: string): boolean {
    return this.cache.has(absPath);
  }

  invalidate(absPath: string): void {
    this.cache.delete(absPath);
  }

  invalidateByFilePrefix(filePath: string): void {
    for (const key of this.cache.keys()) {
      if (key === filePath || key.startsWith(`${filePath}:`)) {
        this.cache.delete(key);
      }
    }
  }

  set(absPath: string, content: string): void {
    this.cache.set(absPath, content);
    this.evictIfNeeded();
  }

  clear() {
    this.cache.clear();
  }

  private evictIfNeeded() {
    if (this.cache.size <= this.maxEntries) return;

    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
    }
  }
}
