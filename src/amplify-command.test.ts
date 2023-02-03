import { createCommand } from 'commander';
import { z } from 'zod';
import { AmplifyCommand } from './amplify-command';

it('test typed commands', async () => {
  const positionalSchema = z.tuple([z.string(), z.string().optional()]);

  const optionsSchema = z.object({
    whiz: z.string().optional(),
    bang: z.string(),
    optBool: z.boolean().default(false),
  });

  // test handler
  // the first (and only for now) arg must be all of the positional arguments
  const testHandler = async (positionals: z.infer<typeof positionalSchema>, options: z.infer<typeof optionsSchema>): Promise<void> => {
    console.log(`got positionals ${JSON.stringify(positionals)}`);
    console.log(`got options ${JSON.stringify(options)}`);
  };

  // pass the schema in as the first arg to the constructor
  // TS will start yelling at you to properly fill out additional info for the args in the second parameter
  const amplifyCommand = new AmplifyCommand(
    positionalSchema,
    [
      { name: 'env', description: 'the environment name' },
      { name: 'profile', description: 'the profile to use' },
    ],
    optionsSchema,
    {
      whiz: { description: 'puts the whiz in whiz bang' },
      bang: { description: 'puts in the bang' },
      optBool: { description: 'test optional boolean' },
    }
  );

  // the passed handler must be a function with the correct input shape
  amplifyCommand.setHandler(testHandler);

  const commandBase = createCommand('next');

  const command = amplifyCommand.toCommand('testing');

  commandBase.addCommand(command);

  await commandBase.parseAsync(['executable/path', 'next', 'testing', 'types', 'are-awesome', '--bang', 'BOOM!', '--optBool', 'extraArg']);
});
