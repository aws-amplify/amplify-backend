import path from 'path';
import { ConstructMap } from '../manifest/ir-definition';
import { ConstructAdaptorFactory } from '../types';

type ConstructAdaptorFactoryMap = Record<string, ConstructAdaptorFactory>;

export const getConstructAdaptorFactory = async (constructMap: ConstructMap): Promise<ConstructAdaptorFactoryMap> => {
  const constructAdaptorFactoryMap: ConstructAdaptorFactoryMap = {};
  const importPromises = Object.values(constructMap).map(async (constructConfig) => {
    const module = await import(getTempPath(constructConfig.adaptor));
    if (typeof module?.init === 'function') {
      const constructAdaptorFactory = module.init() as ConstructAdaptorFactory;
      constructAdaptorFactoryMap[constructConfig.adaptor] = constructAdaptorFactory;
    }
  });
  await Promise.all(importPromises);
  return constructAdaptorFactoryMap;
};

// this won't be necessary in the final implementation but this maps an adaptor name to a local path
// this is necesary now because I haven't set up a monorepo with npm links to other packages
const getTempPath = (name: string): string => {
  const pathMap: Record<string, string> = {
    '@aws-amplify/file-storage-adaptor': path.resolve(__dirname, '../providers/s3-provider/s3-provider.js'),
    '@aws-amplify/function-adaptor': path.resolve(__dirname, '../providers/lambda/lambda-provider.js'),
  };

  return pathMap[name] ?? name;
};
