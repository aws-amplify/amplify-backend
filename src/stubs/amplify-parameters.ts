import { SSM } from 'aws-sdk';

export class AmplifyParameters {
  constructor(private readonly ssmClient: SSM, private readonly envName: string) {}

  async putParameter(name: string, value: string, isSecret: boolean) {
    await this.ssmClient
      .putParameter({
        Name: paramName(this.envName, name),
        Value: value,
        Type: isSecret ? 'SecureString' : 'String',
      })
      .promise();
  }

  async removeParameter(name: string) {
    await this.ssmClient
      .deleteParameter({
        Name: paramName(this.envName, name),
      })
      .promise();
  }

  async listParameters(): Promise<Parameter[]> {
    // TODO would need to paginate here
    const params = await this.ssmClient
      .getParametersByPath({
        Path: envPath(this.envName),
        WithDecryption: false,
        MaxResults: 10,
      })
      .promise();
    if (!params.Parameters) {
      return [];
    }
    return params.Parameters.map((param) => {
      const baseName = param.Name!.slice(param.Name!.lastIndexOf('/') + 1);
      if (param.Type === 'SecureString') {
        return {
          name: baseName,
          isSecret: true,
          ref: param.Name!,
        };
      } else {
        return {
          name: baseName,
          isSecret: false,
          value: param.Value!,
        };
      }
    });
  }
}

type Parameter = { name: string } & (
  | {
      isSecret: true;
      ref: string;
    }
  | {
      isSecret: false;
      value: string;
    }
);

const paramName = (envName: string, paramName: string) => `${envPath(envName)}/${paramName}`;
const envPath = (envName: string) => `/amp/${envName}`;
