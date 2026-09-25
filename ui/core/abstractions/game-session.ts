export interface GameSession {
  capturePointer(): Promise<void>;
  stop(): void;
}
