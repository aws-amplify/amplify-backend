import { CronOptions, Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import type { Cron, Rate, TimeInterval } from './factory.js';

/**
 * Parses function schedule props in order to create EventBridge rules.
 */
export class ScheduleParser {
  /**
   * Initialize EventBridge rules
   */
  constructor(
    private readonly lambda: NodejsFunction,
    private readonly timeIntervals: TimeInterval[]
  ) {
    this.timeIntervals.forEach((interval, index) => {
      if (isRate(interval)) {
        const { value, unit } = parseRate(interval);

        if (value && !isPositiveWholeNumber(value)) {
          throw new Error(`schedule must be set with a positive whole number`);
        }

        if (
          value &&
          lambda.timeout &&
          unit === 'm' &&
          value * 60 < lambda.timeout.toSeconds()
        ) {
          const timeout = lambda.timeout.toSeconds();

          throw new Error(
            `schedule must be greater than the timeout of ${timeout} ${
              timeout > 1 ? 'seconds' : 'second'
            }`
          );
        }
      } else {
        if (!isValidCron(interval)) {
          // TODO: Better error messaging here or throw within each part of isValidCron in order to give more concise error messages
          throw new Error(`schedule cron expression is not valid`);
        }
      }

      try {
        // Lambda name will be prepended to rule id, so only using index here for uniqueness
        const rule = new Rule(this.lambda, `lambda-schedule${index}`, {
          schedule: Schedule.cron(translateToCronOptions(interval)),
        });

        rule.addTarget(new targets.LambdaFunction(this.lambda));
      } catch (error) {
        throw new AmplifyUserError(
          'NodeJSFunctionScheduleInitializationError',
          {
            message: 'Failed to instantiate schedule for nodejs function',
            resolution: 'See the underlying error message for more details.',
          },
          error as Error
        );
      }
    });
  }
}

const isRate = (timeInterval: TimeInterval): timeInterval is Rate => {
  return timeInterval.split(' ')[0] === 'every';
};

const parseRate = (rate: Rate) => {
  const interval = rate.split(' ')[1];

  const regex = /\d/;
  if (interval.match(regex)) {
    return {
      value: Number(interval.substring(0, interval.length - 1)),
      unit: interval.charAt(interval.length - 1),
    };
  }

  return {
    unit: interval,
  };
};

const isPositiveWholeNumber = (test: number) => test > 0 && test % 1 === 0;

const isValidCron = (cron: Cron): boolean => {
  const cronParts = cron.split(' ');

  if (cronParts.length !== 5 && cronParts.length !== 6) {
    return false;
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek, year] = cronParts;

  return (
    isValidCronPart(minute, 0, 59) &&
    isValidCronPart(hour, 0, 23) &&
    (dayOfMonth === '?' || isValidCronPart(dayOfMonth, 1, 31)) &&
    isValidCronPart(month, 1, 12) &&
    (dayOfWeek === '?' || isValidCronPart(dayOfWeek, 1, 7)) &&
    (!year || isValidCronPart(year, 1970, 2199))
  );
};

const isValidCronPart = (part: string, min: number, max: number): boolean => {
  if (part === '*') {
    return true;
  }
  if (part.includes('/')) {
    return isValidStepValue(part, min, max);
  }
  if (part.includes('-')) {
    return isValidRange(part, min, max);
  }
  if (part.includes(',')) {
    return isValidList(part, min, max);
  }

  return isWholeNumberBetweenInclusive(Number(part), min, max);
};

const isValidStepValue = (value: string, min: number, max: number): boolean => {
  const originalBase = value.split('/')[0];
  const [base, step] = value.split('/').map(Number);

  if (originalBase === '*') {
    return !isNaN(step) && step > 0;
  }

  return (
    !isNaN(base) &&
    !isNaN(step) &&
    isWholeNumberBetweenInclusive(base, min, max) &&
    step > 0
  );
};

const isValidRange = (value: string, min: number, max: number): boolean => {
  const [start, end] = value.split('-').map(Number);
  return (
    !isNaN(start) &&
    !isNaN(end) &&
    isWholeNumberBetweenInclusive(start, min, max) &&
    isWholeNumberBetweenInclusive(end, min, max) &&
    start <= end
  );
};

const isValidList = (value: string, min: number, max: number): boolean => {
  return value
    .split(',')
    .every((v) => isWholeNumberBetweenInclusive(Number(v), min, max));
};

const isWholeNumberBetweenInclusive = (
  test: number,
  min: number,
  max: number
) => min <= test && test <= max && test % 1 === 0;

const translateToCronOptions = (timeInterval: TimeInterval): CronOptions => {
  if (isRate(timeInterval)) {
    const { value, unit } = parseRate(timeInterval);
    switch (unit) {
      case 'm':
        return { minute: `*/${value}` };
      case 'h':
        return { minute: '0', hour: `*/${value}` };
      case 'day':
        return { minute: '0', hour: '0', day: `*` };
      case 'week':
        return { minute: '0', hour: '0', weekDay: `1` };
      case 'month':
        return { minute: '0', hour: '0', day: '1', month: `*` };
      case 'year':
        return {
          minute: '0',
          hour: '0',
          day: '1',
          month: '1',
          year: `*`,
        };
      default:
        // This should never happen with strict types
        throw new Error('Could not determine the schedule for the function');
    }
  } else {
    const cronArray = timeInterval.split(' ');
    const result: Record<string, string> = {
      minute: cronArray[0],
      hour: cronArray[1],
      month: cronArray[3],
      year: cronArray.length === 6 ? cronArray[5] : '*',
    };

    // Branching logic here is because we cannot supply both day and weekDay
    if (cronArray[2] === '?') {
      result.weekDay = cronArray[4];
    } else {
      result.day = cronArray[2];
    }

    return result;
  }
};
