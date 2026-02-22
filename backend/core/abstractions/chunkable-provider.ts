export interface ChunkableProvider<TChunk = unknown> {
  readonly chunkSize: number;
  mapChunk(items: any): TChunk;
  concurrency?: number;
}

export function isChunkableProvider(provider: unknown): provider is ChunkableProvider<any> {
  return (
    typeof provider === "object" &&
    provider !== null &&
    "chunkSize" in provider &&
    "mapChunk" in provider &&
    typeof (provider as any).mapChunk === "function"
  );
}
