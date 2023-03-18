import { AmplifyTransformer } from './transformer';
import { ConstructMap } from '../manifest/ir-definition';
import execa from 'execa';
import path from 'path';
import { getConstructAdaptorFactory } from './adaptor-factory';
/**
 * This should be a first class entry point into Amplify for customers who want to integrate an Amplify manifest into an existing CDK application
 *
 * It performs all the steps necessary to resolve / fetch values referenced in the manifest file and initializes the AmplifyTransform base CDK construct
 * AmplifyTransform.transform() can then be used to initiate orchestration of Amplify generated resources
 * @param construct The CDK construct that the AmplifyTransform will exist in
 * @param tokenizedManifest The raw manifest object that should be transformed
 * @returns Initialized AmplifyTransform instance
 */
export const createTransformer = async (envName: string, constructMap: ConstructMap): Promise<AmplifyTransformer> => {
  await executeBuildCommands(constructMap);
  return new AmplifyTransformer(envName, constructMap, await getConstructAdaptorFactory(constructMap));
};

const executeBuildCommands = async (componentMap: ConstructMap) => {
  const buildPromises = Object.values(componentMap)
    .filter((componentConfig) => componentConfig.build)
    .map((componentConfig) => componentConfig.build)
    .map((buildConfig) => {
      const workingDir = buildConfig!.relativeWorkingDir ? path.resolve(process.cwd(), buildConfig!.relativeWorkingDir) : process.cwd();
      return execa.command(buildConfig!.command, { cwd: workingDir, stdio: 'inherit', shell: 'bash' });
    });
  try {
    await Promise.all(buildPromises);
  } catch (err) {
    throw new Error('Executing build commands failed. See logs above for details.');
  }
};
