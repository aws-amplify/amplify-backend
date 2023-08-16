export type PackageManagerController = {
  installDevDependencies: (packageNames: string[]) => Promise<void>;
};
