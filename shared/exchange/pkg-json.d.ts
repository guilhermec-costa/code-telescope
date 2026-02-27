export interface PackageData {
  name: string;
  version: string;
  sourceFile: string;
  isDev: boolean;
}

export interface PackageDocFinderData {
  packages: PackageData[];
  displayTexts: string[];
}

export interface NpmPackageInfo {
  name: string;
  version: string;
  description?: string;
  homepage?: string;
  license?: string;
  keywords?: string[];
  repository?: {
    type: string;
    url: string;
  };
  bugs?: {
    url: string;
  };
  dist?: {
    tarball: string;
    shasum?: string;
    integrity?: string;
    fileCount?: number;
    unpackedSize?: number; // tamanho em bytes
  };
  author?: string | { name: string; email?: string; url?: string };
  maintainers?: Array<{ name: string; email?: string }>;
}
