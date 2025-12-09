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
