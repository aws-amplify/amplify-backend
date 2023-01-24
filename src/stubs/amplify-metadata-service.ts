export class AmplifyMetadataService {
  private readonly serviceData: Record<string, EnvironmentMetadata> = {
    dev: {
      parameters: {
        functionRuntime: 'nodejs14.x',
        serverTimeout: '200',
        databasePassword: '/path/to/ssm/param',
      },
    },
  };
  async getParams(env: string): Promise<Parameters> {
    return this.serviceData[env].parameters;
  }
}

type EnvironmentMetadata = {
  parameters: Parameters;
  stackNames?: StackNames;
};

type StackNames = string[];
type Parameters = Record<string, string>;
