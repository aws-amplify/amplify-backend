import { describe, mock, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import yargs, { CommandModule } from 'yargs';
import { CreateCommand } from './create_command.js';
import {
  BackendProjectCreator,
  BackendTemplateGallery,
} from '@aws-amplify/backend-templates';
import * as process from 'process';

const runCommand = async (
  command: CommandModule,
  args: string | Array<string>
): Promise<string> => {
  const parser = yargs().command(command).help();
  return await new Promise((resolve, reject) => {
    // both parser.parse and parser.parseAsync require callback to prevent process from exiting on error.
    // yargs.exitProcess(false) is not recommended if asynchronous handlers are used in commands.
    parser.parse(args, {}, (err, argv, output) => {
      if (err) {
        reject(err);
      } else {
        resolve(output);
      }
    });
  });
};

describe('create command', () => {
  const templateGallery: BackendTemplateGallery = {
    listBackendTemplates: async () => {
      return [
        {
          name: 'template1',
        },
        {
          name: 'template2',
        },
        {
          name: 'template3',
        },
      ];
    },
  };

  const createFromTemplateMock =
    mock.fn<
      (templateName: string, destinationDirectory: string) => Promise<void>
    >();
  const projectCreator: BackendProjectCreator = {
    createFromTemplate: createFromTemplateMock,
  };

  const createCommand = new CreateCommand(
    templateGallery,
    projectCreator
  ) as unknown as CommandModule;

  beforeEach(() => {
    createFromTemplateMock.mock.resetCalls();
  });

  it('creates project from selected template', async () => {
    await runCommand(createCommand, 'create --template template2');
    const calls = createFromTemplateMock.mock.calls;
    assert.equal(calls.length, 1);
    const templateName = calls[0].arguments[0];
    const targetDirectory = calls[0].arguments[1];
    assert.equal(templateName, 'template2');
    assert.equal(targetDirectory, process.cwd());
  });

  it('creates project from first template by default', async () => {
    await runCommand(createCommand, 'create');
    const calls = createFromTemplateMock.mock.calls;
    assert.equal(calls.length, 1);
    const templateName = calls[0].arguments[0];
    const targetDirectory = calls[0].arguments[1];
    assert.equal(templateName, 'template1');
    assert.equal(targetDirectory, process.cwd());
  });

  it('fails on unrecognized template', async () => {
    await assert.rejects(
      () =>
        runCommand(createCommand, 'create --template non_existent_template'),
      (err) => {
        assert.equal(err.name, 'YError');
        assert.match(err.message, /Invalid values:/);
        return true;
      }
    );
  });

  it('prints template choices in help', async () => {
    const output = await runCommand(createCommand, 'create --help');
    assert.match(output, /--template {2}An application template/);
    assert.match(
      output,
      /\[string] \[choices: "template1", "template2", "template3"]/
    );
  });
});
