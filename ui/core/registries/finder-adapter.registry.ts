import { FuzzyProviderType } from "../../../shared/adapters-namespace";
import { IFuzzyFinderDataAdapter } from "../abstractions/fuzzy-finder-data-adapter";
import { BranchFinderDataAdapter } from "../finder-data-adapters/branch-finder.data-adapter";
import { WorkspaceFilesFinderDataAdapter } from "../finder-data-adapters/workspace-files-finder.data-adapter";
import { WorkspaceTextFinderDataAdapter } from "../finder-data-adapters/workspace-text-finder.data-adapter";

/**
 * Registry/Factory to manager fuzzy finders apdaters
 */
export class FuzzyFinderAdapterRegistry {
  private adapters = new Map<string, IFuzzyFinderDataAdapter>();

  constructor() {
    this.register(new WorkspaceFilesFinderDataAdapter());
    this.register(new BranchFinderDataAdapter());
    this.register(new WorkspaceTextFinderDataAdapter());
  }

  /**
   * Register a new adapter
   */
  register(adapter: IFuzzyFinderDataAdapter<any, any>) {
    this.adapters.set(adapter.fuzzyAdapterType, adapter);
  }

  /**
   * Gets adapter by its type
   */
  getAdapter(finderType: FuzzyProviderType): IFuzzyFinderDataAdapter | undefined {
    return this.adapters.get(finderType);
  }

  hasAdapter(finderType: string): boolean {
    return this.adapters.has(finderType);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }
}
