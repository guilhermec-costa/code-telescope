import { type FuzzyProviderType } from "../adapters-namespace";

export interface BuiltinFinderItem {
  type: FuzzyProviderType;
  name: string;
  description: string;
}

export interface BuiltinFinderData {
  items: BuiltinFinderItem[];
}
