export async function loadDecorators() {
  await import("virtual:data-adapters" as any);
  await import("virtual:preview-renderers" as any);
  console.log("[Fuzzy] decorators loaded");
}
