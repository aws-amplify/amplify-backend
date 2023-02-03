import { Command, createCommand, Argument, Option } from 'commander';
import { z } from 'zod';

// possibly look to use https://www.npmjs.com/package/@commander-js/extra-typings
// but if we can figure out variadic args and get optional/defaults working correctly and consistently
// then zod gives us much greater validaton abilities

type ArgConfig = {
  name: string;
  description: string;
};

type OptionConfig = {
  shortName?: string;
  description: string;
};

type TupleSameLen<T extends any[], V> = { [I in keyof T]: V };

type RecordSameKeys<T extends Record<string, any>, V> = { [K in keyof T]: V };

// For some reason the type inference gets mess up without this intermediate type
type TupleToType<T extends z.AnyZodTuple> = z.infer<T>;

type HandlerFunction<Args, Options> = (args: Args, options: Options) => Promise<void>;

/**
 * Wrapper over commander Command object that ensures strong typing and validation of inputs and handler functions
 */
export class AmplifyCommand<ArgSchema extends z.AnyZodTuple, OptionSchema extends z.SomeZodObject> {
  private handler: HandlerFunction<TupleToType<ArgSchema>, OptionSchema>;
  constructor(
    private readonly argSchema: ArgSchema,
    private readonly argConfig: TupleSameLen<TupleToType<ArgSchema>, ArgConfig>,
    private readonly optionSchema: OptionSchema,
    private readonly optionConfig: Required<RecordSameKeys<z.infer<OptionSchema>, OptionConfig>>
  ) {}

  setHandler(handler: HandlerFunction<TupleToType<ArgSchema>, z.infer<OptionSchema>>): AmplifyCommand<ArgSchema, OptionSchema> {
    this.handler = handler;
    return this;
  }

  toCommand(name: string): Command {
    const command = createCommand(name);
    this.argSchema.items.forEach((item, idx) => {
      const argConfig = this.argConfig[idx];
      const arg = new Argument(argConfig.name, argConfig.description);

      if (item.isOptional()) {
        arg.argOptional();
      }
      command.addArgument(arg);
    });

    Object.entries(this.optionSchema.shape).forEach(([key, value]) => {
      const { shortName, description } = this.optionConfig[key];

      // determine if value is optional
      const isOpt = value.isOptional();

      // determine if value is a boolean option
      const isFlag = value.safeParse(true).success;

      // TODO need to identify variadic options and configure properly
      // probably just add to OptionConfig becuase it would be very difficult (maybe impossible) to infer here

      const option = new Option(toOptionString(key, isFlag, isOpt, shortName), description);
      if (!isOpt && !isFlag) {
        option.makeOptionMandatory();
      }
      command.addOption(option);
    });

    command.action(this.getSafeHandler());
    command.allowExcessArguments(false).allowUnknownOption(false);
    command.exitOverride();
    return command;
  }

  private getSafeHandler(): (...args: any[]) => Promise<void> {
    return async (...args: any[]): Promise<void> => {
      const positionals = args.slice(0, args.length - 2);
      const options = args[args.length - 2];
      const validatedPositionals = this.argSchema.parse(positionals);
      const validatedOptions = this.optionSchema.parse(options);
      return this.handler(validatedPositionals, validatedOptions);
    };
  }
}

const toOptionString = (name: string, isFlag: boolean, isOptional: boolean, shortName?: string) => {
  const suffix = isFlag ? '' : isOptional ? ` [${name}]` : ` <${name}>`;
  if (shortName) {
    return `-${shortName}, --${name}${suffix}`;
  }
  return `--${name}${suffix}`;
};
