# Custom Domains + SSL + CDK Research

**Date:** 2026-03-26  
**Purpose:** Understand AWS-native patterns for custom domains with SSL certificates using CDK

---

## Executive Summary

This document covers CDK patterns for implementing custom domains with SSL certificates using AWS-native services. Key findings:

- **ACM Certificates**: Must be in `us-east-1` region for CloudFront usage
- **DNS Validation**: Preferred method (automatic with Route53 hosted zones)
- **Cross-Account**: Requires IAM roles and custom resources for Route53 in different accounts
- **CloudFront**: Requires SNI or dedicated IP for custom domains
- **Amplify Hosting**: Creates per-app CloudFront distributions, manages certs automatically

---

## 1. ACM Certificate Creation with CDK

### 1.1 Basic Certificate with DNS Validation (Same Account)

```typescript
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';

const myHostedZone = new route53.HostedZone(this, 'HostedZone', {
  zoneName: 'example.com',
});

const certificate = new acm.Certificate(this, 'Certificate', {
  domainName: 'hello.example.com',
  certificateName: 'Hello World Service',  // Optional
  validation: acm.CertificateValidation.fromDns(myHostedZone),
});
```

**Key Points:**
- DNS validation is **preferred** over email validation
- If Route53 is your DNS provider, validation records are created automatically
- Certificate deployment waits until validation completes
- CloudFormation stack won't complete until DNS records are added

### 1.2 Manual DNS Validation (External DNS Provider)

```typescript
const certificate = new acm.Certificate(this, 'Certificate', {
  domainName: 'hello.example.com',
  validation: acm.CertificateValidation.fromDns(), // Manual DNS records required
});
```

**Important:** Stack deployment will pause until you manually add DNS validation records to your DNS provider.

### 1.3 Multi-Domain Certificates

```typescript
const exampleCom = new route53.HostedZone(this, 'ExampleCom', {
  zoneName: 'example.com',
});

const exampleNet = new route53.HostedZone(this, 'ExampleNet', {
  zoneName: 'example.net',
});

const cert = new acm.Certificate(this, 'Certificate', {
  domainName: 'test.example.com',
  subjectAlternativeNames: ['cool.example.com', 'test.example.net'],
  validation: acm.CertificateValidation.fromDnsMultiZone({
    'test.example.com': exampleCom,
    'cool.example.com': exampleCom,
    'test.example.net': exampleNet,
  }),
});
```

### 1.4 Wildcard Certificates

```typescript
const certificate = new acm.Certificate(this, 'Certificate', {
  domainName: '*.example.com',
  validation: acm.CertificateValidation.fromDns(hostedZone),
});
```

---

## 2. CloudFront Distribution with Custom Domain

### 2.1 Critical Requirements for CloudFront + ACM

**CloudFront-specific ACM Certificate Requirements:**

1. **Region:** Certificate **MUST** be in `us-east-1` (N. Virginia)
2. **Certificate Authority:** Must be from trusted CA (Mozilla CA list or ACM)
3. **Key Type:** Supports RSA (1024-4096 bit) and ECDSA (256-bit)
4. **Domain Match:** Certificate domain must match CloudFront alternate domain names
5. **SSL Support Method:** Choose SNI (free) or Dedicated IP ($$)

### 2.2 Cross-Region Certificate Setup

```typescript
import { aws_cloudfront as cloudfront } from 'aws-cdk-lib';

const app = new App();

// Stack 1: Certificate in us-east-1
const certStack = new Stack(app, 'CertStack', {
  env: { region: 'us-east-1' },
  crossRegionReferences: true,  // Enable cross-region references
});

const cert = new acm.Certificate(certStack, 'Cert', {
  domainName: '*.example.com',
  validation: acm.CertificateValidation.fromDns(
    route53.PublicHostedZone.fromHostedZoneId(certStack, 'Zone', 'ZONE_ID')
  ),
});

// Stack 2: CloudFront distribution in any region
const distStack = new Stack(app, 'DistStack', {
  env: { region: 'us-west-2' },
  crossRegionReferences: true,
});

new cloudfront.Distribution(distStack, 'Distribution', {
  defaultBehavior: {
    origin: new origins.HttpOrigin('example.com'),
  },
  domainNames: ['dev.example.com'],
  certificate: cert,  // Cross-region reference works
});
```

### 2.3 CloudFront + S3 (SPA Pattern)

```typescript
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

const frontBucket = new s3.Bucket(this, 'FrontendBucket', {
  websiteIndexDocument: 'index.html',
  publicReadAccess: true,
});

const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(frontBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
  domainNames: ['app.example.com'],
  certificate: certificate,  // From ACM
  defaultRootObject: 'index.html',
  errorResponses: [
    {
      httpStatus: 404,
      responseHttpStatus: 200,
      responsePagePath: '/index.html',  // SPA routing
    },
  ],
});
```

**Key SPA Considerations:**
- Set `defaultRootObject` to `index.html`
- Add error response to redirect 404s to index.html (for client-side routing)
- Use `S3Origin` for automatic OAI (Origin Access Identity) setup

### 2.4 CloudFront + Lambda Function URL (SSR Pattern)

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';

const ssrFunction = new lambda.Function(this, 'SSRFunction', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda'),
});

const functionUrl = ssrFunction.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
});

const distribution = new cloudfront.Distribution(this, 'Distribution', {
  defaultBehavior: {
    origin: new origins.HttpOrigin(
      cdk.Fn.select(2, cdk.Fn.split('/', functionUrl.url)),  // Extract domain from URL
      {
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
      }
    ),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,  // For SSR
    originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
  },
  domainNames: ['ssr.example.com'],
  certificate: certificate,
});
```

**SSR Considerations:**
- Lambda Function URLs are public by default
- Use `CACHING_DISABLED` or custom cache policy for dynamic content
- Pass all headers/cookies to origin with `OriginRequestPolicy.ALL_VIEWER`
- Consider Lambda@Edge for request/response manipulation

---

## 3. Route53 + CloudFront Integration

### 3.1 A Record (Alias) to CloudFront

```typescript
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';

const zone = route53.HostedZone.fromLookup(this, 'Zone', {
  domainName: 'example.com',
});

new route53.ARecord(this, 'AliasRecord', {
  zone: zone,
  recordName: 'app.example.com',
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution)
  ),
});
```

**Alias Record Benefits:**
- No charge for DNS queries to AWS resources
- Automatically updates if CloudFront distribution changes
- Supports root domain (example.com) and subdomains

### 3.2 Same Account Pattern (Simplest)

```typescript
// 1. Create hosted zone
const zone = new route53.HostedZone(this, 'Zone', {
  zoneName: 'example.com',
});

// 2. Create certificate with auto-validation
const certificate = new acm.Certificate(this, 'Cert', {
  domainName: '*.example.com',
  validation: acm.CertificateValidation.fromDns(zone),
});

// 3. Create CloudFront distribution
const distribution = new cloudfront.Distribution(this, 'Dist', {
  // ... config
  domainNames: ['app.example.com'],
  certificate: certificate,
});

// 4. Add A record
new route53.ARecord(this, 'AliasRecord', {
  zone: zone,
  recordName: 'app',
  target: route53.RecordTarget.fromAlias(
    new targets.CloudFrontTarget(distribution)
  ),
});
```

---

## 4. Cross-Account Hosted Zone Pattern

### 4.1 Problem Statement

When the **Route53 Hosted Zone** is in Account A and you need to:
1. Create an **ACM Certificate** in Account B
2. Validate the certificate using DNS records in Account A's hosted zone
3. Create an **A Record** in Account A pointing to Account B's CloudFront

### 4.2 Solution: Custom Resource + Cross-Account IAM Role

**Architecture:**
```
Account B (CDK Stack)          Account A (Hosted Zone Owner)
┌─────────────────────┐       ┌──────────────────────┐
│ Lambda (Custom      │       │ Route53 Hosted Zone  │
│ Resource)           │──────>│                      │
│                     │ Assume│ - DNS validation     │
│ Creates:            │ Role  │ - A Record           │
│ - ACM Certificate   │       │                      │
│ - CloudFront        │       │                      │
└─────────────────────┘       └──────────────────────┘
```

**Step 1: Create Cross-Account Role (Account A)**

```typescript
// In Account A stack
const crossAccountRole = new iam.Role(this, 'CrossAccountRoute53Role', {
  assumedBy: new iam.AccountPrincipal('ACCOUNT_B_ID'),
  roleName: 'CrossAccountRoute53Role',
  inlinePolicies: {
    'Route53Access': new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: [
            'route53:ChangeResourceRecordSets',
            'route53:ListResourceRecordSets',
          ],
          resources: [`arn:aws:route53:::hostedzone/${hostedZone.hostedZoneId}`],
        }),
      ],
    }),
  },
});

// Export role ARN for use in Account B
new cdk.CfnOutput(this, 'CrossAccountRoleArn', {
  value: crossAccountRole.roleArn,
  exportName: 'CrossAccountRoute53RoleArn',
});
```

**Step 2: Create Custom Resource (Account B)**

```typescript
// Lambda code handles:
// 1. Request ACM certificate
// 2. Assume role in Account A
// 3. Create DNS validation records in Account A's hosted zone
// 4. Wait for validation
// 5. Return certificate ARN

const customResourceHandler = new lambda.Function(this, 'CustomResourceHandler', {
  runtime: lambda.Runtime.PYTHON_3_10,
  handler: 'index.lambda_handler',
  code: lambda.Code.fromAsset('lambda'),
  timeout: cdk.Duration.seconds(120),
  initialPolicy: [
    new iam.PolicyStatement({
      actions: ['acm:*', 'sts:AssumeRole'],
      resources: ['*'],
    }),
  ],
});

const provider = new cr.Provider(this, 'CustomResourceProvider', {
  onEventHandler: customResourceHandler,
});

const certificateArn = new CustomResource(this, 'CrossAccountCert', {
  serviceToken: provider.serviceToken,
  properties: {
    TargetAccountRole: 'arn:aws:iam::ACCOUNT_A_ID:role/CrossAccountRoute53Role',
    HostedZoneId: 'Z1234567890ABC',
    DomainName: 'example.com',
    CertName: '*.example.com',
  },
});

// Import certificate for use
const certificate = acm.Certificate.fromCertificateArn(
  this,
  'ImportedCert',
  certificateArn.getAttString('CertificateArn')
);
```

**Important Notes:**
- Custom resource Lambda must handle Create, Update, and Delete events
- Certificate validation can take up to 30 minutes
- Lambda timeout should be at least 2 minutes
- Consider retry logic for DNS propagation delays

### 4.3 Limitations & Alternatives

**CDK Built-in Cross-Account:**
- `CrossAccountZoneDelegationRecord` exists but only for NS records
- No built-in support for cross-account A records or certificate validation

**Workarounds:**
1. **Custom Resource** (recommended): Handles complex cross-account scenarios
2. **Manual Process**: Create certificate in Account A, export ARN, import in Account B
3. **Terraform** or other IaC tools with better cross-account support

---

## 5. How Amplify Hosting Handles Custom Domains

Based on internal documentation from `w.amazon.com/bin/view/AWS/Mobile/AppHub/Internal/`:

### 5.1 Amplify Architecture Insights

**Per-App CloudFront Distribution:**
- Each Amplify app gets **its own** CloudFront distribution
- Each custom domain gets an **additional separate** CloudFront distribution
- NOT shared across apps (for SSL certificate and metering reasons)

**SSL Certificate Management:**
- Amplify automatically provisions and manages SSL certificates using ACM
- Certificates are wildcard: `*.example.com`
- Automatic yearly renewal
- Custom SSL Certificates feature allows customers to BYO certificate

**DNS Validation Flow:**
- Amplify creates ACM certificate in `us-east-1`
- CNAME validation records added to customer's hosted zone
- Automatic retry logic for validation failures

**Caching Strategy:**
- CloudFront cache key includes: all cookies, select headers, URL path, HTTP method
- Cache hit ratio: 76% aggregate, 98% for static apps (post-2024 improvements)
- Cache manipulation using CloudFront Functions with `X-Amplify-Timestamp`

### 5.2 Custom Domain Flow in Amplify

1. **Customer Creates Custom Domain** in Amplify Console
2. **Certificate Creation**: Amplify requests ACM certificate in `us-east-1`
3. **DNS Validation**: Amplify creates CNAME records in customer's hosted zone (if Route53)
4. **CloudFront Distribution**: New distribution created with custom domain
5. **A Record**: Amplify creates A record (alias) pointing to CloudFront
6. **Deployment**: Assets deployed to S3, served via CloudFront

**Amplify Advantages:**
- Fully managed (no manual certificate renewal)
- Automatic DNS configuration (for Route53)
- Built-in cache optimization
- Per-branch deployments with unique subdomains

---

## 6. Common Pitfalls & Best Practices

### 6.1 Certificate Region Issues

❌ **Wrong:**
```typescript
// Certificate in us-west-2, CloudFront can't use it
const cert = new acm.Certificate(certStack, 'Cert', {
  domainName: 'example.com',
  // Stack in us-west-2
});
```

✅ **Correct:**
```typescript
// Certificate explicitly in us-east-1
const certStack = new Stack(app, 'CertStack', {
  env: { region: 'us-east-1' },
});
```

### 6.2 Certificate Validation Timeout

**Issue:** Stack deployment hangs waiting for certificate validation.

**Solutions:**
1. Use separate stack for certificate (provision first)
2. Check DNS propagation with `dig` or `nslookup`
3. Verify hosted zone ID is correct
4. Ensure IAM permissions for Route53 record creation

### 6.3 Certificate Domain Mismatch

❌ **Error:**
```
InvalidViewerCertificateException: The certificate that is attached to your 
distribution doesn't cover the alternate domain name (CNAME) that you're trying to add.
```

**Cause:** Certificate domain doesn't match CloudFront alternate domain names.

✅ **Solution:**
- Use wildcard certificates: `*.example.com` covers all subdomains
- Or create certificate with explicit SANs for each subdomain

### 6.4 Wildcard Certificate Limitations

**Issue:** Wildcard `*.example.com` covers `app.example.com` but NOT:
- Root domain: `example.com`
- Nested subdomains: `api.v2.example.com`

**Solution:** Add explicit SANs:
```typescript
const cert = new acm.Certificate(this, 'Cert', {
  domainName: 'example.com',  // Root
  subjectAlternativeNames: [
    '*.example.com',         // First level subdomains
    '*.api.example.com',     // Second level for api.*
  ],
  validation: acm.CertificateValidation.fromDns(zone),
});
```

### 6.5 Certificate Expiration & Renewal

**ACM-Managed Certificates:**
- Automatically renew 60-45 days before expiration
- Use DNS validation for automatic renewal
- No action required

**Imported Certificates:**
- **YOU** must renew before expiration
- Set up CloudWatch alarm for `DaysToExpiry` metric
- Re-import renewed certificate to ACM at least 24 hours before expiration

```typescript
// Alarm for certificate expiration
certificate.metricDaysToExpiry().createAlarm(this, 'CertExpiryAlarm', {
  comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
  evaluationPeriods: 1,
  threshold: 45,  // Automatic rotation happens between 60 and 45 days
});
```

### 6.6 DNS Propagation Delays

**Issue:** Certificate validation fails or custom domain not resolving.

**Solutions:**
1. Wait for DNS propagation (can take 5-60 minutes)
2. Use lower TTL values during setup (300 seconds)
3. Test DNS with `dig @8.8.8.8 app.example.com`
4. Verify nameservers are correctly configured

### 6.7 CloudFront Deployment Time

**Expectation:** CloudFront distribution deployment takes **15-20 minutes**.

**Best Practices:**
- Use warming pool pattern (pre-create distributions)
- Deploy certificate stack separately and first
- Use CloudFormation stack dependencies to control order
- Consider blue/green deployments for zero downtime

---

## 7. CDK Constructs Summary

| Construct | Purpose | Key Props |
|-----------|---------|-----------|
| `acm.Certificate` | Create/manage ACM certificate | `domainName`, `validation`, `subjectAlternativeNames` |
| `acm.CertificateValidation.fromDns()` | Auto DNS validation | `hostedZone` (optional) |
| `cloudfront.Distribution` | CloudFront distribution | `domainNames`, `certificate`, `defaultBehavior` |
| `route53.ARecord` | DNS A record | `zone`, `target`, `recordName` |
| `route53.RecordTarget.fromAlias()` | Alias target | `aliasTarget` (CloudFront, ALB, etc.) |
| `targets.CloudFrontTarget` | CloudFront alias target | `distribution` |
| `origins.S3Origin` | S3 origin for CloudFront | `bucket` |
| `origins.HttpOrigin` | HTTP origin for CloudFront | `domainName`, `protocolPolicy` |

---

## 8. References & Further Reading

### AWS Documentation
- [ACM Certificate Manager User Guide](https://docs.aws.amazon.com/acm/latest/userguide/)
- [CloudFront SSL/TLS Requirements](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html)
- [Route53 Alias Records](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html)

### CDK API References
- [aws-cdk-lib.aws_certificatemanager](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager-readme.html)
- [aws-cdk-lib.aws_cloudfront](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cloudfront-readme.html)
- [aws-cdk-lib.aws_route53](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53-readme.html)

### Community Articles
- [HTTPs on CloudFront using Certificate Manager and aws-cdk](https://dev.to/miensol/https-on-cloudfront-using-certificate-manager-and-aws-cdk-3m50)
- [Cross Account Route 53 records in CDK](https://jeremyritchie.com/posts/11/)

### Internal Amazon Resources
- Amplify Hosting Architecture: `w.amazon.com/bin/view/AWS/Mobile/AppHub/Internal/FeatureArchitecture/TheAmplifyHosting/`
- Custom SSL Certificates Design: `w.amazon.com/bin/view/AWS/Mobile/AppHub/Internal/FeatureArchitecture/CustomSSLFeature/`

---

## Conclusion

**Key Takeaways:**

1. **Certificate Region:** ACM certificates for CloudFront **MUST** be in `us-east-1`
2. **DNS Validation:** Preferred method; automatic with Route53 in same account
3. **Same Account:** Simple and fully managed by CDK
4. **Cross-Account:** Requires custom resource + IAM roles (complex but doable)
5. **CloudFront Patterns:**
   - **SPA (S3):** Use `S3Origin` + error responses for client-side routing
   - **SSR (Lambda):** Use `HttpOrigin` + disabled caching
6. **Amplify Pattern:** Per-app distributions with automatic cert management
7. **Common Pitfalls:** Region mismatches, domain mismatches, DNS propagation delays

**Recommended Approach:**
- Start with same-account setup if possible
- Use CDK's built-in `CertificateValidation.fromDns()` for automatic validation
- Separate certificate stack from application stack for faster iterations
- Use wildcard certificates for flexibility
- Monitor certificate expiration with CloudWatch alarms
