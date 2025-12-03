import { FuzzyAdapter } from "../../../shared/adapters-namespace";
import { BranchPreviewAdapter } from "./branch-preview.adapter";
import { FilePreviewAdapter } from "./file-preview.adapter";
import { IPreviewAdapter } from "./preview-adapter";

export class PreviewAdapterRegistry {
  private adapters = new Map<string, IPreviewAdapter>();

  constructor() {
    this.register(new FilePreviewAdapter());
    this.register(new BranchPreviewAdapter());
  }

  register(adapter: IPreviewAdapter): void {
    this.adapters.set(adapter.type, adapter);
  }

  getAdapter(finderType: FuzzyAdapter): IPreviewAdapter | undefined {
    return this.adapters.get(finderType);
  }

  hasAdapter(finderType: string): boolean {
    return this.adapters.has(finderType);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.adapters.keys());
  }
}
