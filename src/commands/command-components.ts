import { createArgument, createCommand, createOption } from '@commander-js/extra-typings';

export const strictCommand = (name: string) => createCommand(name).allowExcessArguments(false).allowUnknownOption(false);

export const envNamePositional = createArgument('<envName>', 'The environment on which to perform the operation');

export const profileNameOption = createOption('-p, --profile <profile>', 'The AWs profile to use for credentials');
