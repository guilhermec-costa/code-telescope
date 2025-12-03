import { FuzzyAdapter } from "../../../shared/adapters-namespace";
import { BranchFinderAdapter } from "./branch-finder.adapter";
import { IFinderAdapter } from "./finder-adapter";
import { FileFinderAdapter } from "./workspace-file.adapter";

/**
 * Registry/Factory to manager fuzzy finders apdaters
 */
export class FinderAdapterRegistry {
  private adapters = new Map<string, IFinderAdapter>();

  constructor() {
    this.register(new FileFinderAdapter());
    this.register(new BranchFinderAdapter());
  }

  /**
   * Register a new adapter
   */
  register(adapter: IFinderAdapter<any, any>) {
    this.adapters.set(adapter.type, adapter);
  }

  /**
   * Gets adapter by its type
   */
  getAdapter(finderType: FuzzyAdapter): IFinderAdapter | undefined {
    return this.adapters.get(finderType);
  }

  hasAdapter(finderType: string): boolean {
    return this.adapters.has(finderType);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }
}
