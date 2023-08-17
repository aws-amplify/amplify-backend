export type DependencyType = 'dev' | 'prod';

export type PackageManagerController = {
  installDependencies: (
    packageNames: string[],
    type: DependencyType
  ) => Promise<void>;
};
