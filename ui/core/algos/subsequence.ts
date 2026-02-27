import { StateManager } from "../common/code/state-manager";

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

function computeSubsequenceScore(query: string, text: string): number {
  let score = 0;
  const textLen = text.length;
  const queryLen = query.length; // query already in lowercase

  if (queryLen > textLen) return -Infinity;

  const lowerText = text.toLowerCase();
  const filenameStart = text.lastIndexOf("/") + 1;

  let lastIdx = -1;

  for (let i = 0; i < queryLen; i++) {
    const char = query[i];
    const foundIdx = lowerText.indexOf(char, lastIdx + 1);

    if (foundIdx === -1) return -Infinity;

    // relative distance to the start of the text
    const distance = foundIdx - lastIdx;
    if (distance === 1) score += 15;
    else score -= distance;

    if (foundIdx === 0) score += 20;
    if (foundIdx === filenameStart) score += 25;

    // word boundary using charCode
    if (foundIdx > 0) {
      const prevCode = text.charCodeAt(foundIdx - 1);

      if (
        prevCode === 47 || // / (slash)
        prevCode === 92 || // \ (backslash)
        prevCode === 95 || // _ (underscore)
        prevCode === 45 || // - (hyphen)
        prevCode === 46 || // . (dot)
        prevCode === 32 //   (space)
      ) {
        score += 12;
      }
    } else {
      score += 12; // beginning of string counts as boundary
    }

    // camelCase using charCode (A-Z : 65-90)
    const code = text.charCodeAt(foundIdx);
    if (code >= 65 && code <= 90) score += 5;

    lastIdx = foundIdx;
  }
  return score;
}

function computeSubsequenceMatchIndices(lowerQuery: string, text: string): number[] {
  if (lowerQuery.length > text.length) return [];

  const lowerText = text.toLowerCase();
  const indices: number[] = [];

  let queryIdx = 0;

  for (let i = 0; i < lowerText.length && queryIdx < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIdx]) {
      indices.push(i);
      queryIdx++;
    }
  }

  return queryIdx === lowerQuery.length ? indices : [];
}

export function isSubstring(query: string, text: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

export function getSubstringMatchIndex(query: string, text: string): number {
  return text.toLowerCase().indexOf(query.toLowerCase());
}

export function matches(query: string, text: string): boolean {
  const algorithm = StateManager.matchingAlgorithm;
  if (!query) return true;
  if (!text) return false;

  if (algorithm === "subsequence") {
    return isSubsequence(query, text);
  }
  return isSubstring(query, text);
}

export function scoreMatch(query: string, text: string): number {
  const algorithm = StateManager.matchingAlgorithm;
  if (!text || query.length > text.length) return -Infinity;

  if (algorithm === "subsequence") {
    return computeSubsequenceScore(query, text);
  }
  const idx = getSubstringMatchIndex(query, text);
  return idx === -1 ? -Infinity : idx;
}

export function getMatchIndices(lowerQuery: string, text: string): number[] {
  const algorithm = StateManager.matchingAlgorithm;
  if (!lowerQuery || !text) return [];

  if (algorithm === "subsequence") {
    return computeSubsequenceMatchIndices(lowerQuery, text);
  }
  const idx = getSubstringMatchIndex(lowerQuery, text);
  if (idx === -1) return [];
  return Array.from({ length: lowerQuery.length }, (_, i) => idx + i);
}
