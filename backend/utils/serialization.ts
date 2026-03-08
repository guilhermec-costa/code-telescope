export function serializeFn(fn: Function): string {
  const src = fn.toString();
  if (!src.startsWith("function") && !src.startsWith("(") && !src.startsWith("async")) {
    return "function " + src;
  }
  return src;
}
