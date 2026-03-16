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

type State = { score: number; lastIdx: number; indices: number[] };

function computeBestMatch(lowerQuery: string, text: string): { score: number; indices: number[] } {
  const queryLen = lowerQuery.length;
  const textLen = text.length;

  if (queryLen > textLen || queryLen === 0) return { score: -Infinity, indices: [] };

  const lowerText = text.toLowerCase();
  const filenameStart = text.lastIndexOf("/") + 1;

  // initialize the beam search with an empty starting state
  let globalStateHistory: State[] = [{ score: 0, lastIdx: -1, indices: [] }];

  // for each query char, the number of previous states increment.
  // So when it goes to the next char, it checks from every previous state
  for (let qi = 0; qi < queryLen; qi++) {
    const char = lowerQuery[qi];
    const localStateHistory: State[] = [];

    // evaluate all currently tracked paths (beam search) for the current char
    for (const state of globalStateHistory) {
      let searchFrom = state.lastIdx + 1;

      // find all occurrences of the current query character in the remaining text
      while (searchFrom < textLen) {
        const foundIdx = lowerText.indexOf(char, searchFrom);
        if (foundIdx === -1) break; // no more occurrences found

        const distance = foundIdx - state.lastIdx;
        let localScore = 0;

        // apply distance scoring ONLY after the first character match
        if (qi > 0) {
          if (distance === 1) {
            localScore += 15; // high bonus for consecutive characters
          } else {
            // cap the penalty so skipping a long token doesn't destroy the score
            localScore -= Math.min(distance, 15);
          }
        }

        // Positional bonuses
        if (foundIdx === 0) localScore += 20; // start of string
        if (foundIdx === filenameStart) localScore += 50; // start of filename — strong anchor so filename matches beat scattered dir matches
        if (isWordBoundary(text, foundIdx)) localScore += 15; // start of word (snake_case, kebab-case, prose)
        if (isUpperCase(text, foundIdx)) localScore += 5; // CamelCase initials

        localStateHistory.push({
          score: state.score + localScore,
          lastIdx: foundIdx,
          indices: [...state.indices, foundIdx],
        });

        searchFrom = foundIdx + 1;
      }
    }

    // if no paths were able to match the current character, the whole match fails
    if (localStateHistory.length === 0) return { score: -Infinity, indices: [] };

    // prevent exponential growth by merging paths that end at the same index,
    // keeping only the one with the highest score.
    const uniqueStates = new Map<number, State>();
    for (const state of localStateHistory) {
      const existing = uniqueStates.get(state.lastIdx);
      if (!existing || state.score > existing.score) {
        uniqueStates.set(state.lastIdx, state);
      }
    }

    const filteredNextStates = Array.from(uniqueStates.values());
    filteredNextStates.sort((a, b) => b.score - a.score);

    // keep a wider beam so delayed but better paths aren't discarded too early
    globalStateHistory = filteredNextStates.slice(0, 30);
  }

  // the first state is guaranteed to be the highest scoring full match
  const best = globalStateHistory[0];
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
  return algorithm === "subsequence" ? computeBestMatch(lowerQuery, text) : computeSubstringMatch(lowerQuery, text);
}

export function scoreMatch(lowerQuery: string, text: string): number {
  if (!lowerQuery) return 0;
  if (!text) return -Infinity;
  return computeMatch(lowerQuery, text).score;
}
