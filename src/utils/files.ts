export function isHiddenFile(filePath: string): boolean {
  const pathParts: string[] = filePath.split("/");
  const lastPathPart = pathParts[pathParts.length - 1];
  if (lastPathPart.startsWith(".")) return true;
  return false;
}
