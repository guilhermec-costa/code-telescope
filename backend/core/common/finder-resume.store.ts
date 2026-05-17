import { FuzzyProviderType } from "../../../shared/adapters-namespace";

export type FinderResumeSnapshot = {
  providerType: FuzzyProviderType;
  query: string;
  selectedIndex: number;
};

export class FinderResumeStore {
  private static _instance: FinderResumeStore | undefined;
  private snapshot: FinderResumeSnapshot | null = null;

  static get instance(): FinderResumeStore {
    if (!this._instance) {
      this._instance = new FinderResumeStore();
    }

    return this._instance;
  }

  update(data: { query: string; selectedIndex: number }): void {
    if (!this.snapshot) return;

    this.snapshot = {
      ...this.snapshot,
      query: data.query,
      selectedIndex: Math.max(0, data.selectedIndex),
    };
  }

  getSnapshot(): FinderResumeSnapshot | null {
    return this.snapshot ? { ...this.snapshot } : null;
  }

  clear(): void {
    this.snapshot = null;
  }
}
