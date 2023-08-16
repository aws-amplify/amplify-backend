export type PackageManagerController = {
  ensureInitialized: () => Promise<void>;
  installDevDependencies: (packageNames: string[]) => Promise<void>;
};
