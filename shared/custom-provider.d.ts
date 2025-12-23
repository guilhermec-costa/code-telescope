export interface CustomFinderDefinition {
  fuzzy: string;
  previewRenderer: string;

  backend: {
    querySelectableOptions: () => Promise<any>;
    onSelect: (item: any) => Promise<void>;
    getPreviewData: (identifier: any) => Promise<Record<string, any>>;
    getHtmlLoadConfig: () => {
      fileName: string;
      placeholders: Record<string, string>;
    };
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
