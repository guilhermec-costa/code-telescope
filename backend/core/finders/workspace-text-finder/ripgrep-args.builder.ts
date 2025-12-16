const RIPGREP_BASE_FLAGS = [
  "--json",
  "--max-count",
  "1",
  "--line-number",
  "--column",
  "--no-heading",
  "--color",
  "never",
  "--ignore-case",
] as const;

export class RipgrepArgsBuilder {
  private args: string[] = [...RIPGREP_BASE_FLAGS];
  private _query?: string;

  query(q: string) {
    if (this._query) {
      throw new Error("RipgrepArgsBuilder: query already defined");
    }

    this._query = q;
    return this;
  }

  maxColumns(v: number) {
    this.args.push("--max-columns", String(v));
    return this;
  }

  maxFileSize(v: string) {
    this.args.push("--max-filesize", v);
    return this;
  }

  exclude(patterns: string[]) {
    patterns.forEach((p) => this.args.push("--glob", p.startsWith("!") ? p : `!${p}`));
    return this;
  }

  build() {
    if (!this._query) {
      throw new Error("RipgrepArgsBuilder: query is required");
    }

    return [this._query, ...this.args];
  }
}
