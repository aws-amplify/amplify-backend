import { describe, it } from 'node:test';
import assert from 'node:assert';
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { createSecurityHeadersPolicy } from './security_headers.js';

// ---- Test helpers ----

const createStack = (): Stack => {
  const app = new App();
  return new Stack(app, 'TestStack');
};

// ================================================================
// createSecurityHeadersPolicy — isolated unit tests
// ================================================================

void describe('createSecurityHeadersPolicy', () => {
  // ---- Default CSP ----

  void describe('default Content-Security-Policy', () => {
    void it('includes unsafe-inline for script-src and style-src', () => {
      const stack = createStack();
      createSecurityHeadersPolicy(stack, 'Headers');
      const template = Template.fromStack(stack);

      template.hasResourceProperties(
        'AWS::CloudFront::ResponseHeadersPolicy',
        Match.objectLike({
          ResponseHeadersPolicyConfig: Match.objectLike({
            SecurityHeadersConfig: Match.objectLike({
              ContentSecurityPolicy: Match.objectLike({
                ContentSecurityPolicy:
                  Match.stringLikeRegexp("'unsafe-inline'"),
              }),
            }),
          }),
        }),
      );
    });

    void it('includes wss: in connect-src', () => {
      const stack = createStack();
      createSecurityHeadersPolicy(stack, 'Headers');
      const template = Template.fromStack(stack);

      template.hasResourceProperties(
        'AWS::CloudFront::ResponseHeadersPolicy',
        Match.objectLike({
          ResponseHeadersPolicyConfig: Match.objectLike({
            SecurityHeadersConfig: Match.objectLike({
              ContentSecurityPolicy: Match.objectLike({
                ContentSecurityPolicy: Match.stringLikeRegexp('wss:'),
              }),
            }),
          }),
        }),
      );
    });

    void it('does not include unsafe-eval', () => {
      const stack = createStack();
      createSecurityHeadersPolicy(stack, 'Headers');
      const template = Template.fromStack(stack);

      const policies = template.findResources(
        'AWS::CloudFront::ResponseHeadersPolicy',
      );
      const policy = Object.values(policies)[0] as Record<
        string,
        Record<string, unknown>
      >;
      const config = policy.Properties.ResponseHeadersPolicyConfig as Record<
        string,
        unknown
      >;
      const secHeaders = config.SecurityHeadersConfig as Record<
        string,
        unknown
      >;
      const csp = secHeaders.ContentSecurityPolicy as Record<string, string>;
      assert.ok(
        !csp.ContentSecurityPolicy.includes('unsafe-eval'),
        'CSP should NOT include unsafe-eval',
      );
    });

    void it('sets CSP override to false (allows app to override)', () => {
      const stack = createStack();
      createSecurityHeadersPolicy(stack, 'Headers');
      const template = Template.fromStack(stack);

      template.hasResourceProperties(
        'AWS::CloudFront::ResponseHeadersPolicy',
        Match.objectLike({
          ResponseHeadersPolicyConfig: Match.objectLike({
            SecurityHeadersConfig: Match.objectLike({
              ContentSecurityPolicy: Match.objectLike({
                Override: false,
              }),
            }),
          }),
        }),
      );
    });
  });

  // ---- Custom CSP ----

  void describe('custom Content-Security-Policy', () => {
    void it('uses custom CSP when provided', () => {
      const stack = createStack();
      const customCsp = "default-src 'none'; script-src 'self'";
      createSecurityHeadersPolicy(stack, 'Headers', {
        contentSecurityPolicy: customCsp,
      });
      const template = Template.fromStack(stack);

      template.hasResourceProperties(
        'AWS::CloudFront::ResponseHeadersPolicy',
        Match.objectLike({
          ResponseHeadersPolicyConfig: Match.objectLike({
            SecurityHeadersConfig: Match.objectLike({
              ContentSecurityPolicy: Match.objectLike({
                ContentSecurityPolicy: customCsp,
              }),
            }),
          }),
        }),
      );
    });
  });

  // ---- HSTS ----

  void describe('HSTS', () => {
    void it('sets Strict-Transport-Security with override true', () => {
      const stack = createStack();
      createSecurityHeadersPolicy(stack, 'Headers');
      const template = Template.fromStack(stack);

      template.hasResourceProperties(
        'AWS::CloudFront::ResponseHeadersPolicy',
        Match.objectLike({
          ResponseHeadersPolicyConfig: Match.objectLike({
            SecurityHeadersConfig: Match.objectLike({
              StrictTransportSecurity: Match.objectLike({
                AccessControlMaxAgeSec: Match.anyValue(),
                IncludeSubdomains: true,
                Preload: true,
                Override: true,
              }),
            }),
          }),
        }),
      );
    });
  });

  // ---- X-Content-Type-Options ----

  void describe('X-Content-Type-Options', () => {
    void it('sets contentTypeOptions with override true', () => {
      const stack = createStack();
      createSecurityHeadersPolicy(stack, 'Headers');
      const template = Template.fromStack(stack);

      template.hasResourceProperties(
        'AWS::CloudFront::ResponseHeadersPolicy',
        Match.objectLike({
          ResponseHeadersPolicyConfig: Match.objectLike({
            SecurityHeadersConfig: Match.objectLike({
              ContentTypeOptions: Match.objectLike({
                Override: true,
              }),
            }),
          }),
        }),
      );
    });
  });

  // ---- X-Frame-Options ----

  void describe('X-Frame-Options', () => {
    void it('sets SAMEORIGIN with override true', () => {
      const stack = createStack();
      createSecurityHeadersPolicy(stack, 'Headers');
      const template = Template.fromStack(stack);

      template.hasResourceProperties(
        'AWS::CloudFront::ResponseHeadersPolicy',
        Match.objectLike({
          ResponseHeadersPolicyConfig: Match.objectLike({
            SecurityHeadersConfig: Match.objectLike({
              FrameOptions: Match.objectLike({
                FrameOption: 'SAMEORIGIN',
                Override: true,
              }),
            }),
          }),
        }),
      );
    });
  });

  // ---- XSS Protection ----

  void describe('XSS Protection', () => {
    void it('enables XSS protection with mode block', () => {
      const stack = createStack();
      createSecurityHeadersPolicy(stack, 'Headers');
      const template = Template.fromStack(stack);

      template.hasResourceProperties(
        'AWS::CloudFront::ResponseHeadersPolicy',
        Match.objectLike({
          ResponseHeadersPolicyConfig: Match.objectLike({
            SecurityHeadersConfig: Match.objectLike({
              XSSProtection: Match.objectLike({
                Protection: true,
                ModeBlock: true,
                Override: true,
              }),
            }),
          }),
        }),
      );
    });
  });

  // ---- Referrer Policy ----

  void describe('Referrer Policy', () => {
    void it('sets strict-origin-when-cross-origin', () => {
      const stack = createStack();
      createSecurityHeadersPolicy(stack, 'Headers');
      const template = Template.fromStack(stack);

      template.hasResourceProperties(
        'AWS::CloudFront::ResponseHeadersPolicy',
        Match.objectLike({
          ResponseHeadersPolicyConfig: Match.objectLike({
            SecurityHeadersConfig: Match.objectLike({
              ReferrerPolicy: Match.objectLike({
                ReferrerPolicy: 'strict-origin-when-cross-origin',
                Override: true,
              }),
            }),
          }),
        }),
      );
    });
  });
});
