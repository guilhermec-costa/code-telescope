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

function computeBestMatch(lowerQuery: string, text: string): { score: number; indices: number[] } {
  const queryLen = lowerQuery.length;
  const textLen = text.length;

  if (queryLen > textLen) return { score: -Infinity, indices: [] };

  const lowerText = text.toLowerCase();
  const filenameStart = text.lastIndexOf("/") + 1;

  type State = { score: number; lastIdx: number; indices: number[] };

  let states: State[] = [{ score: 0, lastIdx: -1, indices: [] }];

  for (let qi = 0; qi < queryLen; qi++) {
    const char = lowerQuery[qi];
    const nextStates: State[] = [];

    for (const state of states) {
      let searchFrom = state.lastIdx + 1;

      while (searchFrom < textLen) {
        const foundIdx = lowerText.indexOf(char, searchFrom);
        if (foundIdx === -1) break;

        const distance = foundIdx - state.lastIdx;
        let localScore = 0;

        if (distance === 1) localScore += 15;
        else localScore -= distance;

        if (foundIdx === 0) localScore += 20;
        if (foundIdx === filenameStart) localScore += 25;
        if (isWordBoundary(text, foundIdx)) localScore += 12;
        if (isUpperCase(text, foundIdx)) localScore += 5;

        nextStates.push({
          score: state.score + localScore,
          lastIdx: foundIdx,
          indices: [...state.indices, foundIdx],
        });

        searchFrom = foundIdx + 1;
      }
    }

    if (nextStates.length === 0) return { score: -Infinity, indices: [] };

    // Beam search: mantém os 4 melhores estados
    nextStates.sort((a, b) => b.score - a.score);
    states = nextStates.slice(0, 4);
  }

  const best = states[0];
  return { score: best.score, indices: best.indices };
}

function computeSubstringMatch(lowerQuery: string, text: string): { score: number; indices: number[] } {
  const idx = text.toLowerCase().indexOf(lowerQuery);
  if (idx === -1) return { score: -Infinity, indices: [] };
  const indices = Array.from({ length: lowerQuery.length }, (_, i) => idx + i);
  return { score: idx, indices };
}

export function computeMatch(lowerQuery: string, text: string): { score: number; indices: number[] } {
  const algorithm = StateManager.matchingAlgorithm;
  const result =
    algorithm === "subsequence" ? computeBestMatch(lowerQuery, text) : computeSubstringMatch(lowerQuery, text);

  return result;
}

export function scoreMatch(lowerQuery: string, text: string): number {
  if (!lowerQuery) return 0;
  if (!text) return -Infinity;
  return computeMatch(lowerQuery, text).score;
}
