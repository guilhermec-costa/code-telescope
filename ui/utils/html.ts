export function escapeHtml(str: string) {
  return str.replace(
    /[&<>"']/g,
    (c) =>
      (
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }) as Record<string, string>
      )[c],
  );
}

export function toInnerHTML(text: string): string {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

export function formatFileOptionHtml(svgIconUrl: string, text: string): string {
  return `
<i class="file-icon">
  <img 
    src="${svgIconUrl}" 
    alt="" 
    loading="eager" 
    decoding="async"
    width="16"
    height="16"
  />
</i>
<span class="file-path">${toInnerHTML(text)}</span>
`.trim();
}
