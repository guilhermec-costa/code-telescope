/**
 * Default ripgrep flags applied to all searches.
 * Must contain only flags and their values (no positional arguments).
 */
const RIPGREP_BASE_FLAGS = [
  "--json",
  "--line-number",
  "--column",
  "--no-heading",
  "--text",
  "--hidden",
  "--color",
  "never",
  "--ignore-case",
] as const;

/**
 * Builds a valid ripgrep argument list.
 *
 * Rules:
 * - Exactly one query is required
 * - Query is always the first positional argument
 * - Only flags follow the query
 */
export class RipgrepArgsBuilder {
  /** Ripgrep flags and values (no positional args). */
  private args: string[] = [...RIPGREP_BASE_FLAGS];
  private paths: string[] = [];

  /** Search pattern (required). */
  private _query?: string;

  /** Defines the search query (pattern). */
  query(q: string) {
    if (this._query) {
      throw new Error("RipgrepArgsBuilder: query already defined");
    }
    this._query = q;
    return this;
  }

  /** Sets the maximum number of columns per line. */
  maxColumns(v: number) {
    this.args.push("--max-columns", String(v));
    return this;
  }

  /** Sets the maximum file size to search. */
  maxFileSize(v: string) {
    this.args.push("--max-filesize", v);
    return this;
  }

  /** Adds glob exclusion patterns. */
  exclude(patterns: string[]) {
    patterns.forEach((p) => this.args.push("--glob", p.startsWith("!") ? p : `!${p}`));
    return this;
  }

  withPaths(paths: string[]) {
    this.paths = paths;
    return this;
  }

  withFixedStrings() {
    this.args.push("--fixed-strings");
    return this;
  }

  /** Builds the final argument list. */
  build() {
    if (!this._query) {
      throw new Error("RipgrepArgsBuilder: query is required");
    }
    return [this._query, ...this.args, ...this.paths];
  }
}
