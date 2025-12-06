export interface TextSearchData {
  results: TextSearchMatch[];
  query: string;
}

export interface TextSearchMatch {
  file: string;
  line: number;
  column: number;
  text: string;
  preview: string;
}
