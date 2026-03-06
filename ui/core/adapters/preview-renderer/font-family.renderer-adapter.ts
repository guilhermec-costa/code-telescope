import { ThemedToken } from "shiki";
import { PreviewRendererType } from "../../../../shared/adapters-namespace";
import { TextPreviewData } from "../../../../shared/extension-webview-protocol";
import { IPreviewRendererAdapter } from "../../abstractions/preview-renderer-adapter";
import { PreviewRendererAdapter } from "../../decorators/preview-renderer-adapter.decorator";
import { SyntaxHighlighter } from "../../registry/preview-adapter.registry";
import { HighlighterManager } from "../../render/highlighter-manager";

@PreviewRendererAdapter({
  adapter: "preview.font",
})
export class FontPreviewRendererAdapter implements IPreviewRendererAdapter {
  type: PreviewRendererType;
  private currentPreviewElement?: HTMLElement;

  constructor(private highlighter: SyntaxHighlighter) {}

  async render(previewElement: HTMLElement, data: TextPreviewData): Promise<void> {
    this.cleanup();

    const fontFamily = data.metadata?.fontFamily as string | undefined;

    previewElement.innerHTML = "";
    this.currentPreviewElement = previewElement;

    if (!fontFamily) {
      previewElement.textContent = "No font selected";
      return;
    }

    previewElement.classList.add("preview-font");
    previewElement.style.setProperty("--preview-font-override", `'${fontFamily}'`);

    const container = document.createElement("div");
    container.className = "fp-container";

    const header = document.createElement("div");
    header.className = "fp-header";

    const fontName = document.createElement("span");
    fontName.className = "fp-font-name";
    fontName.textContent = fontFamily;

    const fontTag = document.createElement("span");
    fontTag.className = "fp-font-tag";
    fontTag.textContent = "editor.fontFamily";

    header.appendChild(fontName);
    header.appendChild(fontTag);
    container.appendChild(header);

    // Sizes
    const sizesSection = document.createElement("div");
    sizesSection.className = "fp-section fp-section--sizes";
    sizesSection.appendChild(this.makeLabel("Sizes"));

    for (const size of FONT_SIZES) {
      const row = document.createElement("div");
      row.className = "fp-size-row";

      const sizeTag = document.createElement("span");
      sizeTag.className = "fp-size-tag";
      sizeTag.textContent = `${size}px`;

      const sample = document.createElement("span");
      sample.className = "fp-size-sample";
      sample.style.fontSize = `${size}px`;
      sample.textContent = "the quick brown fox jumps over the lazy dog";

      row.appendChild(sizeTag);
      row.appendChild(sample);
      sizesSection.appendChild(row);
    }

    container.appendChild(sizesSection);

    const ambigSection = document.createElement("div");
    ambigSection.className = "fp-section";
    ambigSection.appendChild(this.makeLabel("Ambiguous characters & ligatures"));

    const ambigSample = document.createElement("div");
    ambigSample.className = "fp-ambig-sample";
    ambigSample.textContent = "0Oo iIl1 <>{}[]() != !== === => -> -- ++ ** // /* */";
    ambigSection.appendChild(ambigSample);
    container.appendChild(ambigSection);

    const codeSection = document.createElement("div");
    codeSection.className = "fp-section";
    codeSection.appendChild(this.makeLabel("Code sample"));

    const codeEl = await this.renderHighlightedCode(data);
    codeSection.appendChild(codeEl);
    container.appendChild(codeSection);

    previewElement.appendChild(container);
  }

  private async renderHighlightedCode(data: TextPreviewData): Promise<HTMLElement> {
    const pre = document.createElement("pre");
    pre.className = "fp-code";

    if (!this.highlighter) {
      pre.textContent = PREVIEW_CODE;
      return pre;
    }

    try {
      let finalLanguageId = "typescript";
      const langResult = await HighlighterManager.loadLanguageIfNeeded("typescript");
      if (langResult.ok) finalLanguageId = langResult.value.grammar.name;

      let finalThemeName = data.theme;
      if (data.theme) {
        const themeResult = await HighlighterManager.loadThemeIfNeeded(data.theme);
        if (themeResult.ok) {
          finalThemeName = themeResult.value.jsonData?.name || themeResult.value.name;
        } else {
          finalThemeName = "none";
        }
      }

      let themeFg = "var(--fg)";
      try {
        const resolvedTheme = this.highlighter.getTheme(finalThemeName);
        if (resolvedTheme?.fg) themeFg = resolvedTheme.fg;
      } catch {}

      const result = this.highlighter.codeToTokens(PREVIEW_CODE, {
        lang: finalLanguageId,
        theme: finalThemeName,
      });

      const code = document.createElement("code");
      code.style.color = themeFg;

      for (const lineTokens of result.tokens as ThemedToken[][]) {
        const lineEl = document.createElement("span");
        lineEl.className = "line";

        for (const token of lineTokens) {
          const span = document.createElement("span");
          span.textContent = token.content;

          let style = "";
          if (token.color) style += `color:${token.color};`;
          if (token.bgColor) style += `background-color:${token.bgColor};`;
          if (token.fontStyle) {
            if (token.fontStyle & 1) style += "font-style:italic;";
            if (token.fontStyle & 2) style += "font-weight:bold;";
            if (token.fontStyle & 4) style += "text-decoration:underline;";
          }
          if (style) span.style.cssText = style;

          lineEl.appendChild(span);
        }

        code.appendChild(lineEl);
        code.appendChild(document.createTextNode("\n"));
      }

      pre.appendChild(code);
    } catch {
      pre.textContent = PREVIEW_CODE;
    }

    return pre;
  }

  private makeLabel(text: string): HTMLElement {
    const label = document.createElement("span");
    label.className = "fp-label";
    label.textContent = text;
    return label;
  }

  setHighlighter(highlighter: SyntaxHighlighter): void {
    this.highlighter = highlighter;
  }

  cleanup(): void {
    if (this.currentPreviewElement) {
      this.currentPreviewElement.classList.remove("preview-font");
      this.currentPreviewElement.style.removeProperty("--preview-font-override");
      this.currentPreviewElement = undefined;
    }
  }
}

const PREVIEW_CODE = `// the quick brown fox jumps over the lazy dog
// THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG
// 0 1 2 3 4 5 6 7 8 9  |  0Oo iIl1 <>{}[]()

async function fetchUser(id: number): Promise<User> {
  const url = \`https://api.example.com/users/\${id}\`;
  const response = await fetch(url, {
    method: "GET",
    headers: { "Authorization": \`Bearer \${token}\` },
  });

  if (!response.ok) {
    throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
  }

  return response.json() as Promise<User>;
}

interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  roles: ("admin" | "editor" | "viewer")[];
}

const SIZES = [8, 13, 21, 34, 55]; // fibonacci
const greet = (name: string) => \`Hello, \${name}!\`;
`;

const FONT_SIZES = [10, 12, 13, 14, 16, 18, 24];
