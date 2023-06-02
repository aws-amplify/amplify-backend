/**
 * Type for an object that maintains data that will be used for frontend client config
 */
export type FrontendConfigRegistry = {
  registerFrontendConfigData(
    /**
     * The package that is intended to read this data after a deployment
     */
    frontendConfigPlugin: string,
    /**
     * A semver range for frontendConfigPlugin of compatible versions for reading this data
     */
    expectedSemver: string,
    /**
     * The data needed to configure a client to connect to the resources in the stack
     */
    data: Record<string, string>
  ): void;
};
