import { FuzzyProviderType } from "../../../shared/adapters-namespace";

export type FinderResumeSnapshot = {
  providerType: FuzzyProviderType;
  query: string;
  selectedValue: any | null;
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

  update(snapshot: FinderResumeSnapshot): void {
    this.snapshot = snapshot;
  }

  getSnapshot(): FinderResumeSnapshot | null {
    return this.snapshot ? { ...this.snapshot } : null;
  }
}
