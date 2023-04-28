import { App, Stack } from 'aws-cdk-lib';
import {
  AmplifyContext,
  GeneratedConfig,
} from './aws_amplify_backend/base_types.js';

const exampleDriver = async () => {
  // imagine this is the dynamic import of the customer's project config
  const { config, compose, custom } = await import(
    './cx_project_root/backend/index.js'
  );

  const app = new App();
  const stack = new Stack(app, 'default stack');

  const amplifyContext: AmplifyContext = {
    getScope: () => stack,
  };

  // call each generator function to instantiate the constructs
  const constructMap: Partial<GeneratedConfig<typeof config>> = {};
  Object.entries(config).forEach(([name, generatorFn]) => {
    const construct = generatorFn(amplifyContext, name);
    constructMap[name] = construct;
  });

  // the typings here get a little loose.
  // In reality, we wouldn't know the exact type of the config object, so we would just be using generic types at this level

  // call the compose callback to wire resources together
  compose(constructMap as any);

  const resourcesMap = Object.entries(constructMap).reduce(
    (acc, [name, construct]) => {
      return { ...acc, [name]: construct.resources };
    },
    {}
  );

  // call the custom callback
  custom(resourcesMap as any, stack);

  app.synth();
};
