import { SessionStateManager } from "../common/code/state-manager";

export function isSubsequence(query: string, text: string): boolean {
  if (query.length > text.length) return false;

  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === lowerQuery.length;
}

export function isSubstring(query: string, text: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

export function getSubstringMatchIndex(query: string, text: string): number {
  return text.toLowerCase().indexOf(query.toLowerCase());
}

export function matches(query: string, text: string): boolean {
  const algorithm = SessionStateManager.matchingAlgorithm;
  if (!query) return true;
  if (!text) return false;

  if (algorithm === "subsequence") {
    return isSubsequence(query, text);
  }
  return isSubstring(query, text);
}
