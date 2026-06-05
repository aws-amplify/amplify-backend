import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
  MathExpression,
  Metric,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { Distribution } from 'aws-cdk-lib/aws-cloudfront';
import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';

/**
 * Default CloudWatch alarm wiring (P3.1 + P3.2).
 *
 * The previous version of the construct created no alarms. Operators
 * found out about Lambda errors / 5xx spikes / poison-pill DLQ
 * messages from end-user reports — by which point the cause was old
 * enough that recent logs had been retention-rotated away. This
 * construct wires a small, opinionated default set:
 *
 *   - CloudFront 5xx error rate > 5% over 5 min
 *   - SSR Lambda error rate >= 1% of invocations over 5 min
 *     (CloudWatch math expression `errors / invocations * 100`, so the
 *     alarm scales with traffic instead of using an absolute count;
 *     tunable via `ssrErrorRatePercent`)
 *   - SSR Lambda throttles > 0 over 5 min
 *   - SQS DLQ depth >= 1 (any poison message)
 *
 * Alarms are off by default (`enabled: false`) so the construct stays
 * cheap-by-default. When the user opts in we either create an SNS
 * topic and surface its ARN (so the user can subscribe), or attach
 * the user-supplied topic. Cost: pennies/month at idle, scales with
 * alarm-state changes (not requests).
 */
export type MonitoringConstructProps = {
  enabled: boolean;
  /**
   * BYO SNS topic for alarm actions. When omitted and `enabled: true`,
   * a topic is created and surfaced via `topic` for the caller to
   * subscribe to.
   */
  snsTopic?: ITopic;
  /** CloudFront distribution to alarm on 5xx errors. */
  distribution?: Distribution;
  /** Primary SSR Lambda — error rate + throttle alarms. */
  ssrFunction?: LambdaFunction;
  /** Image-opt Lambda — error alarm. */
  imageFunction?: LambdaFunction;
  /** Revalidation worker DLQ — depth alarm. */
  revalidationDlq?: Queue;
  /**
   * SSR Lambda error-rate alarm threshold, as a **percentage** of
   * invocations over the evaluation window (`errors / invocations *
   * 100`). Rate-based so the alarm scales with traffic — an absolute
   * count is noise on a busy site and a missed outage on a quiet one.
   * @default 1 (alarm when >=1% of invocations error)
   */
  ssrErrorRatePercent?: number;
};

/**
 * CloudWatch alarm wiring construct. See module-level doc-comment for
 * the rationale and the alarm set.
 */
export class MonitoringConstruct extends Construct {
  /** SNS topic alarm actions are sent to. Undefined when monitoring is disabled. */
  readonly topic?: ITopic;
  /** All CloudWatch alarms created by this construct. */
  readonly alarms: Alarm[] = [];

  /**
   * Wire the default alarm set to the user-supplied or auto-created
   * SNS topic. No-op when `props.enabled` is false.
   */
  constructor(scope: Construct, id: string, props: MonitoringConstructProps) {
    super(scope, id);

    if (!props.enabled) {
      return;
    }

    this.topic = props.snsTopic ?? new Topic(this, 'AlarmTopic');
    const action = new SnsAction(this.topic);

    if (props.distribution) {
      const cf5xx = new Alarm(this, 'CloudFront5xxRate', {
        metric: new Metric({
          namespace: 'AWS/CloudFront',
          metricName: '5xxErrorRate',
          dimensionsMap: {
            DistributionId: props.distribution.distributionId,
            // CloudFront metrics live in us-east-1 regardless of stack.
            Region: 'Global',
          },
          period: Duration.minutes(5),
          statistic: 'Average',
        }),
        threshold: 5, // percent
        evaluationPeriods: 1,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        alarmDescription:
          'CloudFront is returning 5xx for >=5% of requests over 5 minutes.',
      });
      cf5xx.addAlarmAction(action);
      this.alarms.push(cf5xx);
    }

    if (props.ssrFunction) {
      // Rate-based error alarm: errors / invocations * 100 >= threshold%.
      // A math expression keeps the alarm meaningful across traffic
      // levels — `5 absolute errors` is background noise at 10K RPM and a
      // full outage at 2 RPM. `fillMetric: 0` on invocations avoids a
      // divide-by-missing when there's no traffic in the window (the
      // expression then yields 0, below threshold, so a quiet period
      // doesn't false-alarm).
      const errorRatePercent = props.ssrErrorRatePercent ?? 1;
      const errorRate = new MathExpression({
        expression: '(errors / invocations) * 100',
        usingMetrics: {
          errors: props.ssrFunction.metricErrors({
            period: Duration.minutes(5),
            statistic: 'Sum',
          }),
          invocations: props.ssrFunction.metricInvocations({
            period: Duration.minutes(5),
            statistic: 'Sum',
          }),
        },
        period: Duration.minutes(5),
        label: 'SSR Lambda error rate (%)',
      });
      const errors = new Alarm(this, 'SsrLambdaErrors', {
        metric: errorRate,
        threshold: errorRatePercent,
        evaluationPeriods: 1,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        alarmDescription: `SSR Lambda error rate >= ${errorRatePercent}% of invocations over 5 minutes.`,
      });
      errors.addAlarmAction(action);
      this.alarms.push(errors);

      const throttles = new Alarm(this, 'SsrLambdaThrottles', {
        metric: props.ssrFunction.metricThrottles({
          period: Duration.minutes(5),
          statistic: 'Sum',
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        alarmDescription:
          'SSR Lambda is being throttled — concurrency cap reached.',
      });
      throttles.addAlarmAction(action);
      this.alarms.push(throttles);
    }

    if (props.imageFunction) {
      const imgErrors = new Alarm(this, 'ImageLambdaErrors', {
        metric: props.imageFunction.metricErrors({
          period: Duration.minutes(5),
          statistic: 'Sum',
        }),
        threshold: 5,
        evaluationPeriods: 1,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        alarmDescription:
          'Image-opt Lambda has produced >=5 errors in the last 5 minutes ' +
          '(possible SSRF attempts being blocked, or remote-origin failures).',
      });
      imgErrors.addAlarmAction(action);
      this.alarms.push(imgErrors);
    }

    if (props.revalidationDlq) {
      // Any message in the DLQ means a revalidation failed all
      // retries. Without the alarm, ISR pages silently stop
      // refreshing — the symptom is "pages are stale" reported by
      // users, with no operator-visible signal.
      const dlqDepth = new Alarm(this, 'RevalidationDlqDepth', {
        metric: props.revalidationDlq.metricApproximateNumberOfMessagesVisible({
          period: Duration.minutes(5),
          statistic: 'Maximum',
        }),
        threshold: 1,
        evaluationPeriods: 1,
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        treatMissingData: TreatMissingData.NOT_BREACHING,
        alarmDescription:
          'Revalidation DLQ has at least one poison message — ISR pages may stop refreshing.',
      });
      dlqDepth.addAlarmAction(action);
      this.alarms.push(dlqDepth);
    }
  }
}
