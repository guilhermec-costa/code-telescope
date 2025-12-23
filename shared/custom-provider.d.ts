export interface CustomFinderDefinition {
  fuzzyAdapterType: string;
  previewAdapterType: string;

  backend: {
    querySelectableOptions: () => Promise<any>;
    onSelect: (item: any) => Promise<{
      data: any;
      action: string;
    }>;
    getPreviewData: (identifier: any) => Promise<Record<string, any>>;
  };

  ui: {
    dataAdapter: {
      parseOptions: (data: any) => any[];
      getDisplayText: (option: any) => string;
      getSelectionValue: (option: any) => string;
      filterOption?: (option: any, query: string) => boolean;
    };
    renderAdapter?: {};
  };
}
