import { FuzzyProviderType } from "../../../shared/adapters-namespace";
import { IFinderAdapter } from "../abstractions/finder-adapter";
import { BranchFinderAdapter } from "../finder-adapters/branch-finder.adapter";
import { FileFinderAdapter } from "../finder-adapters/workspace-file.adapter";
import { WorkspaceTextSearchAdapter } from "../finder-adapters/workspace-text-search.adapter";

/**
 * Registry/Factory to manager fuzzy finders apdaters
 */
export class FinderAdapterRegistry {
  private adapters = new Map<string, IFinderAdapter>();

  constructor() {
    this.register(new FileFinderAdapter());
    this.register(new BranchFinderAdapter());
    this.register(new WorkspaceTextSearchAdapter());
  }

  /**
   * Register a new adapter
   */
  register(adapter: IFinderAdapter<any, any>) {
    this.adapters.set(adapter.fuzzyAdapterType, adapter);
  }

  /**
   * Gets adapter by its type
   */
  getAdapter(finderType: FuzzyProviderType): IFinderAdapter | undefined {
    return this.adapters.get(finderType);
  }

  hasAdapter(finderType: string): boolean {
    return this.adapters.has(finderType);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }
}
