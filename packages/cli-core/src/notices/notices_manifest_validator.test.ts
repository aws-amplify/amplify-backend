import * as assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { NoticesManifest } from './notices.js';
import { NoticesManifestValidator } from './notices_manifest_validator.js';

void describe('Notices manifest validator', () => {
  const fetchMock = mock.fn(
    fetch,
    (): Promise<Response> =>
      // Mock successful GitHub API response
      Promise.resolve(new Response('{}', { status: 200 }))
  );
  const validator: NoticesManifestValidator = new NoticesManifestValidator(
    { checkLinksWithGitHubApi: true },
    fetchMock
  );
  void it('does not throw when manifest is valid', async () => {
    const validManifest: NoticesManifest = {
      currentNotices: [
        {
          id: '1',
          link: 'https://github.com/aws-amplify/amplify-backend/issues/1',
          title: 'test notice 1',
          details: 'test details 1',
          predicates: [],
        },
        {
          id: '2',
          title: 'test notice 2',
          details: 'test details 2',
          predicates: [],
        },
        {
          id: '3',
          link: 'https://github.com/aws-amplify/amplify-backend/issues/3',
          title: 'test notice 3',
          details: 'test details 3',
          predicates: [
            {
              type: 'packageVersion',
              packageName: 'aws-cdk',
              versionRange: '>=2.117.0',
            },
            {
              type: 'backendComponent',
              backendComponent: 'function',
            },
            {
              type: 'command',
              command: 'sandbox',
            },
            {
              type: 'frequency',
              frequency: 'once',
            },
            {
              type: 'errorMessage',
              errorMessage: 'Some error message',
            },
          ],
        },
      ],
    };

    await validator.validate(validManifest);
  });

  void it('throws on invalid link', async () => {
    const validManifest: NoticesManifest = {
      currentNotices: [
        {
          id: '1',
          link: 'https://invalid.com/1234',
          title: 'test notice',
          details: 'test details',
          predicates: [],
        },
      ],
    };

    await assert.rejects(
      () => validator.validate(validManifest),
      (error: Error) => {
        assert.ok(error.message.startsWith('Link must match'));
        return true;
      }
    );
  });

  void it('throws if link cannot be verified', async () => {
    const validManifest: NoticesManifest = {
      currentNotices: [
        {
          id: '123456789',
          link: 'https://github.com/aws-amplify/amplify-backend/issues/123456789',
          title: 'test notice',
          details: 'test details',
          predicates: [],
        },
      ],
    };

    fetchMock.mock.mockImplementationOnce(
      (): Promise<Response> =>
        // Mock failed GitHub API response
        Promise.resolve(new Response('{}', { status: 404 }))
    );

    await assert.rejects(
      () => validator.validate(validManifest),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          'Notice link must point to valid notice'
        );
        return true;
      }
    );
  });

  void it('throws if id does not match link', async () => {
    const validManifest: NoticesManifest = {
      currentNotices: [
        {
          id: '1',
          link: 'https://github.com/aws-amplify/amplify-backend/issues/2',
          title: 'test notice',
          details: 'test details',
          predicates: [],
        },
      ],
    };

    await assert.rejects(
      () => validator.validate(validManifest),
      (error: Error) => {
        assert.ok(
          error.message.startsWith(
          'Notice id must be equal to GitHub issue number if link is provided')
        );
        return true;
      }
    );
  });

  void it('throws if version predicate is invalid', async () => {
    const validManifest: NoticesManifest = {
      currentNotices: [
        {
          id: '1',
          title: 'test notice',
          details: 'test details',
          predicates: [
            {
              type: 'packageVersion',
              packageName: 'aws-cdk',
              versionRange: 'invalid',
            },
          ],
        },
      ],
    };

    await assert.rejects(
      () => validator.validate(validManifest),
      (error: Error) => {
        assert.strictEqual(
          error.message,
          'Package version predicate must have a valid version range'
        );
        return true;
      }
    );
  });
});
