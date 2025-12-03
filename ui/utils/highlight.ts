import { escapeHtml } from "./html";

export function highlightMatch(text: string, query: string) {
  if (!query) return escapeHtml(text);

  const i = text.toLowerCase().indexOf(query);
  if (i === -1) return escapeHtml(text);

  const before = escapeHtml(text.slice(0, i));
  const match = escapeHtml(text.slice(i, i + query.length));
  const after = escapeHtml(text.slice(i + query.length));

  return `${before}<span class="highlight">${match}</span>${after}`;
}
