import { Construct } from 'constructs';
import { Token } from 'aws-cdk-lib';
import {
  DnsValidatedCertificate,
  ICertificate,
} from 'aws-cdk-lib/aws-certificatemanager';
import {
  ARecord,
  AaaaRecord,
  HostedZone,
  IHostedZone,
  RecordTarget,
} from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { IDistribution } from 'aws-cdk-lib/aws-cloudfront';
import { HostingError } from '../hosting_error.js';

// ---- Public types ----

/**
 * Props for the DnsConstruct.
 */
export type DnsConstructProps = {
  /** Fully qualified domain name (e.g. 'www.example.com'). */
  domainName: string;
  /** Hosted zone domain (e.g. 'example.com'). */
  hostedZone: string;
  /** BYO certificate — avoids deprecated DnsValidatedCertificate when provided. */
  certificate?: ICertificate;
  /**
   * CloudFront distribution for A/AAAA record alias targets.
   * When provided, DNS records are created immediately.
   * When omitted, call `createDnsRecords()` after distribution creation.
   */
  distribution?: IDistribution;
  /**
   * Skip the us-east-1 region validation for BYO certificates.
   */
  skipRegionValidation?: boolean;
};

// ---- Construct ----

/**
 * DNS and TLS resources for custom domain hosting.
 *
 * Validates domain configuration, looks up the Route 53 hosted zone,
 * and either uses a BYO certificate or creates one via DnsValidatedCertificate.
 * Creates A + AAAA records pointing to the CloudFront distribution.
 */
export class DnsConstruct extends Construct {
  readonly certificate: ICertificate;
  readonly hostedZone: IHostedZone;

  /**
   * Create DNS and TLS resources for custom domain hosting.
   */
  constructor(scope: Construct, id: string, props: DnsConstructProps) {
    super(scope, id);

    // Validate domain belongs to hosted zone
    this.validateDomainConfig(props.domainName, props.hostedZone);

    // Best-effort region check for BYO certificates — CloudFront requires
    // ACM certificates in us-east-1. If the ARN is a concrete (non-token)
    // string, verify the region segment. Token ARNs (from cross-stack refs
    // or Fn::ImportValue) are skipped because they resolve at deploy time.
    if (props.certificate && !props.skipRegionValidation) {
      const arn = props.certificate.certificateArn;
      if (!Token.isUnresolved(arn) && arn.split(':')[3] !== 'us-east-1') {
        throw new HostingError('InvalidCertificateRegionError', {
          message: `CloudFront requires ACM certificates in us-east-1, but the provided certificate is in a different region: ${arn}`,
          resolution:
            'Create or import your ACM certificate in the us-east-1 region, then pass it to the certificate prop.',
        });
      }
    }

    // Look up hosted zone
    this.hostedZone = HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.hostedZone,
    });

    // Certificate: BYO or create via DnsValidatedCertificate
    if (props.certificate) {
      this.certificate = props.certificate;
    } else {
      // DnsValidatedCertificate is deprecated since CDK v2.69.0, but the replacement
      // (Certificate + crossRegionReferences: true) requires a two-stack architecture,
      // is still experimental after 3+ years, cannot use HostedZone.fromLookup(), and
      // has its own stack deletion bug (https://github.com/aws/aws-cdk/issues/34813).
      // We'll migrate when crossRegionReferences stabilizes.
      // See also: https://github.com/aws/aws-cdk/issues/30326
      this.certificate = new DnsValidatedCertificate(this, 'Certificate', {
        domainName: props.domainName,
        subjectAlternativeNames: [props.domainName],
        hostedZone: this.hostedZone,
        region: 'us-east-1',
      });
    }

    // Create DNS records if distribution is available now
    if (props.distribution) {
      this.createDnsRecords(props.domainName, props.distribution);
    }
  }

  /**
   * Create A + AAAA records pointing to the given CloudFront distribution.
   * Call this after distribution creation when distribution was not passed
   * in the constructor props.
   */
  createDnsRecords(domainName: string, distribution: IDistribution): void {
    new ARecord(this, 'DnsRecord', {
      zone: this.hostedZone,
      recordName: domainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });
    new AaaaRecord(this, 'DnsRecordIpv6', {
      zone: this.hostedZone,
      recordName: domainName,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
    });
  }

  /**
   * Validate that the domain name is a proper subdomain of the hosted zone.
   * Rejects exact match and suffix attacks.
   */
  private validateDomainConfig(domainName: string, hostedZone: string): void {
    if (domainName !== hostedZone && !domainName.endsWith('.' + hostedZone)) {
      throw new HostingError('InvalidDomainConfigError', {
        message: `Domain name '${domainName}' is not within hosted zone '${hostedZone}'.`,
        resolution: `Ensure the domain name ends with the hosted zone. For example, if hostedZone is 'example.com', domainName could be 'www.example.com' or 'example.com'.`,
      });
    }
  }
}
