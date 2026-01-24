import * as fs from "fs/promises";
import { resolvePathExt } from "../../../utils/files";

export class FileContentCache {
  private static _instance: FileContentCache | undefined;

  private cache = new Map<string, string | Uint8Array>();

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
    const ext = resolvePathExt(absPath);
    const isImg = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

    const content = isImg
      ? new Uint8Array(await fs.readFile(absPath)) // binary
      : await fs.readFile(absPath, "utf-8"); // text

    return content;
  }
}
