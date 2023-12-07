import {
  BackendIdSandboxResolver,
  Sandbox,
  SandboxDeleteOptions,
  SandboxEvents,
  SandboxOptions,
} from './sandbox.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { ClientConfigFormat } from '@aws-amplify/client-config';
import { SandboxSingletonFactory } from './sandbox_singleton_factory.js';

const minApiUsage = async (backendIdentifier: BackendIdentifier) => {
  // TODO attempt to use sandboxName here
  const backendIdResolver: BackendIdSandboxResolver = () => {
    return Promise.resolve(backendIdentifier);
  };

  const sandboxSingletonFactory: SandboxSingletonFactory =
    new SandboxSingletonFactory(backendIdResolver);
  const sandbox: Sandbox = await sandboxSingletonFactory.getInstance();
  const options: SandboxOptions = {};
  await sandbox.start(options);
  await sandbox.stop();
  const sandboxDeleteOptions: SandboxDeleteOptions = {};
  await sandbox.delete(sandboxDeleteOptions);
  const sandboxEvent: SandboxEvents = 'successfulDeployment';
};

const maxApiUsage = async (backendIdentifier: BackendIdentifier) => {
  const backendIdResolver: BackendIdSandboxResolver = (sandboxName) => {
    return Promise.resolve(backendIdentifier);
  };

  const sandboxDeleteOptions: SandboxDeleteOptions = { name: '' };

  const options: SandboxOptions = {
    dir: '',
    name: '',
    exclude: [''],
    format: ClientConfigFormat.JSON,
    profile: '',
  };
};
