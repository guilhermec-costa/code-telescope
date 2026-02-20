export class JsoncParser {
  static parse(text: string): any {
    let cleaned = text.replace(/\/\/.*$/gm, "");
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");
    cleaned = cleaned.replace(/,(\s*[}\]])/g, "$1");

    try {
      return JSON.parse(cleaned);
    } catch {
      return this.parseAggressive(text);
    }
  }

  private static parseAggressive(text: string): any {
    let inString = false;
    let inSingleLineComment = false;
    let inMultiLineComment = false;
    let output = "";
    let escapeNext = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (escapeNext) {
        if (inString) output += char;
        escapeNext = false;
        continue;
      }

      if (char === "\\" && inString) {
        escapeNext = true;
        output += char;
        continue;
      }

      if (char === '"' && !inSingleLineComment && !inMultiLineComment) {
        inString = !inString;
        output += char;
        continue;
      }

      if (inString) {
        output += char;
        continue;
      }

      if (!inSingleLineComment && !inMultiLineComment) {
        if (char === "/" && nextChar === "/") {
          inSingleLineComment = true;
          i++;
          continue;
        }
        if (char === "/" && nextChar === "*") {
          inMultiLineComment = true;
          i++;
          continue;
        }
      }

      if (inSingleLineComment && (char === "\n" || char === "\r")) {
        inSingleLineComment = false;
        output += char;
        continue;
      }

      if (inMultiLineComment && char === "*" && nextChar === "/") {
        inMultiLineComment = false;
        i++;
        continue;
      }

      if (!inSingleLineComment && !inMultiLineComment) {
        output += char;
      }
    }

    output = output.replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(output);
  }
}
