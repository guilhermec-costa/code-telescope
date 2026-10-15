export type PreviewScrollBehavior = ScrollBehavior | "instant";

/** Centers an element vertically without allowing horizontal or ancestor scrolling. */
export function centerElementVertically(
  container: HTMLElement,
  element: Element,
  behavior: PreviewScrollBehavior = "auto",
): void {
  const containerRect = container.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const top = Math.max(
    0,
    container.scrollTop + elementRect.top - containerRect.top - (container.clientHeight - elementRect.height) / 2,
  );
  const left = container.scrollLeft;

  if (behavior === "smooth") {
    container.scrollTo({ top, left, behavior });
    return;
  }

  container.scrollTop = top;
  container.scrollLeft = left;
}
