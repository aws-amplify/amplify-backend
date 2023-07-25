import { Data } from '@aws-amplify/backend-graphql';
import { schema } from './schema';

export const data = new Data({ schema });
