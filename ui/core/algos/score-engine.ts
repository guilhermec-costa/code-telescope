import { StateManager } from "../common/code/state-manager";

function isWordBoundary(text: string, idx: number): boolean {
  if (idx === 0) return true;
  const prev = text.charCodeAt(idx - 1);
  return (
    prev === 47 || // /
    prev === 92 || // \
    prev === 95 || // _
    prev === 45 || // -
    prev === 46 || // .
    prev === 32 // space
  );
}

function isUpperCase(text: string, idx: number): boolean {
  const code = text.charCodeAt(idx);
  return code >= 65 && code <= 90;
}

function isLowerCase(text: string, idx: number): boolean {
  const code = text.charCodeAt(idx);
  return code >= 97 && code <= 122;
}

function isCamelCaseStart(text: string, idx: number): boolean {
  if (idx <= 0 || !isUpperCase(text, idx)) return false;
  return isLowerCase(text, idx - 1);
}

function getFilenameStart(text: string): number {
  const slash = text.lastIndexOf("/");
  const backslash = text.lastIndexOf("\\");
  return Math.max(slash, backslash) + 1;
}

function getBeamWidth(queryLen: number, textLen: number): number {
  if (queryLen <= 3) return Math.min(120, Math.max(40, textLen));
  if (queryLen <= 6) return 80;
  return 48;
}

function buildStrPositionIndex(text: string): Map<string, number[]> {
  const positions = new Map<string, number[]>();

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const bucket = positions.get(char);

    if (bucket) {
      bucket.push(i);
    } else {
      positions.set(char, [i]);
    }
  }

  return positions;
}

function lowerBound(values: number[], target: number): number {
  let left = 0;
  let right = values.length;

  while (left < right) {
    const mid = (left + right) >> 1;
    if (values[mid] < target) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  return left;
}

type State = { score: number; lastIdx: number; prev: State | null };

export type MatchResult = { score: number; indices: number[] };

function buildIndices(state: State | null): number[] {
  const indices: number[] = [];
  let cursor = state;

  while (cursor && cursor.lastIdx >= 0) {
    indices.push(cursor.lastIdx);
    cursor = cursor.prev;
  }

  indices.reverse();
  return indices;
}

function computeStateScore(
  lowerQuery: string,
  text: string,
  state: State,
  foundIdx: number,
  qi: number,
  filenameStart: number,
  exactSubstringIdx: number,
): number {
  const distance = foundIdx - state.lastIdx;
  let localScore = 0;

  if (qi > 0) {
    if (distance === 1) {
      localScore += 18;
    } else if (distance === 2) {
      localScore += 8;
    } else {
      localScore -= Math.min(distance - 1, 12);
    }
  } else {
    localScore -= Math.min(foundIdx, 18);
  }

  if (foundIdx === 0) localScore += 22;
  if (foundIdx === filenameStart) localScore += 60;
  if (isWordBoundary(text, foundIdx)) localScore += 18;
  if (isCamelCaseStart(text, foundIdx)) localScore += 10;

  if (exactSubstringIdx !== -1) {
    if (foundIdx === exactSubstringIdx && qi === 0) {
      localScore += 28;
    }

    const exactEnd = exactSubstringIdx + lowerQuery.length;
    if (foundIdx >= exactSubstringIdx && foundIdx < exactEnd) {
      localScore += 6;
    }
  }

  return state.score + localScore;
}

function computeBestMatch(lowerQuery: string, text: string): MatchResult {
  const queryLen = lowerQuery.length;
  const textLen = text.length;

  if (queryLen > textLen || queryLen === 0) return { score: -Infinity, indices: [] };

  const lowerText = text.toLowerCase();
  const filenameStart = getFilenameStart(text);
  const exactSubstringIdx = lowerText.indexOf(lowerQuery);
  const beamWidth = getBeamWidth(queryLen, textLen);
  const positionIndex = buildStrPositionIndex(lowerText);

  let globalStateHistory: State[] = [{ score: 0, lastIdx: -1, prev: null }];

  for (let qi = 0; qi < queryLen; qi++) {
    const char = lowerQuery[qi];
    const charPositions = positionIndex.get(char);
    if (!charPositions) return { score: -Infinity, indices: [] };

    const localStateHistory: State[] = [];

    for (const state of globalStateHistory) {
      const startAt = lowerBound(charPositions, state.lastIdx + 1);

      for (let i = startAt; i < charPositions.length; i++) {
        const foundIdx = charPositions[i];
        localStateHistory.push({
          score: computeStateScore(lowerQuery, text, state, foundIdx, qi, filenameStart, exactSubstringIdx),
          lastIdx: foundIdx,
          prev: state,
        });
      }
    }

    if (localStateHistory.length === 0) return { score: -Infinity, indices: [] };

    const uniqueStates = new Map<number, State>();
    for (const state of localStateHistory) {
      const existing = uniqueStates.get(state.lastIdx);
      if (!existing || state.score > existing.score) {
        uniqueStates.set(state.lastIdx, state);
      }
    }

    const filteredNextStates = Array.from(uniqueStates.values());
    filteredNextStates.sort((a, b) => b.score - a.score);
    globalStateHistory = filteredNextStates.slice(0, beamWidth);
  }

  const best = globalStateHistory[0];
  return { score: best.score, indices: buildIndices(best) };
}

function computeSubstringMatch(lowerQuery: string, text: string): MatchResult {
  const lowerText = text.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return { score: -Infinity, indices: [] };

  const indices = Array.from({ length: lowerQuery.length }, (_, i) => idx + i);
  const filenameStart = getFilenameStart(text);
  let score = -idx;

  if (idx === 0) score += 15;
  if (idx === filenameStart) score += 40;
  if (isWordBoundary(text, idx)) score += 12;

  return { score, indices };
}

export function computeMatch(lowerQuery: string, text: string): MatchResult {
  const algorithm = StateManager.matchingAlgorithm;
  return algorithm === "subsequence" ? computeBestMatch(lowerQuery, text) : computeSubstringMatch(lowerQuery, text);
}

export function scoreMatch(lowerQuery: string, text: string): number {
  if (!lowerQuery) return 0;
  if (!text) return -Infinity;
  return computeMatch(lowerQuery, text).score;
}
