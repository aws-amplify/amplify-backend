import { describe, mock, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import yargs, { CommandModule } from 'yargs';
import { CreateCommand } from './create_command.js';
import {
  BackendProjectCreator,
  BackendTemplateGallery,
} from '@aws-amplify/backend-templates';
import * as process from 'process';
import { TestCommandRunner } from '../../test_utils/command_runner.js';

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

  const commandRunner = new TestCommandRunner(
    yargs().command(createCommand).help()
  );

  beforeEach(() => {
    createFromTemplateMock.mock.resetCalls();
  });

  it('creates project from selected template', async () => {
    await commandRunner.runCommand('create --template template2');
    const calls = createFromTemplateMock.mock.calls;
    assert.equal(calls.length, 1);
    const templateName = calls[0].arguments[0];
    const targetDirectory = calls[0].arguments[1];
    assert.equal(templateName, 'template2');
    assert.equal(targetDirectory, process.cwd());
  });

  it('creates project from first template by default', async () => {
    await commandRunner.runCommand('create');
    const calls = createFromTemplateMock.mock.calls;
    assert.equal(calls.length, 1);
    const templateName = calls[0].arguments[0];
    const targetDirectory = calls[0].arguments[1];
    assert.equal(templateName, 'template1');
    assert.equal(targetDirectory, process.cwd());
  });

  it('fails on unrecognized template', async () => {
    await assert.rejects(
      () => commandRunner.runCommand('create --template non_existent_template'),
      (err: Error) => {
        assert.equal(err.name, 'YError');
        assert.match(err.message, /Invalid values:/);
        return true;
      }
    );
  });

  it('prints template choices in help', async () => {
    const output = await commandRunner.runCommand('create --help');
    assert.match(output, /--template {2}An application template/);
    assert.match(
      output,
      /\[string] \[choices: "template1", "template2", "template3"]/
    );
  });
});
