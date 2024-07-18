import { CronOptions, Schedule } from 'aws-cdk-lib/aws-events';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import type {
  CronSchedule,
  FunctionSchedule,
  TimeInterval,
} from './factory.js';
import os from 'os';

type CronPart =
  | 'minutes'
  | 'hours'
  | 'day-of-month'
  | 'month'
  | 'day-of-week'
  | 'year';

/**
 * Parses function schedule props in order to create EventBridge rules.
 */
export const convertFunctionSchedulesToRuleSchedules = (
  lambda: NodejsFunction,
  functionSchedules: FunctionSchedule | FunctionSchedule[]
) => {
  const errors: string[] = [];
  const ruleSchedules: Schedule[] = [];

  const schedules = Array.isArray(functionSchedules)
    ? functionSchedules
    : [functionSchedules];

  schedules.forEach((schedule) => {
    if (isTimeInterval(schedule)) {
      const { value, unit } = parseTimeInterval(schedule);

      if (value && !isPositiveWholeNumber(value)) {
        errors.push(
          'Function schedule rate must be set with a positive whole number'
        );
      } else if (
        value &&
        lambda.timeout &&
        unit === 'm' &&
        value * 60 < lambda.timeout.toSeconds()
      ) {
        const timeout = lambda.timeout.toSeconds();
        errors.push(
          `Function schedule rate must be greater than the function timeout of ${timeout} ${
            timeout > 1 ? 'seconds' : 'second'
          }`
        );
      }
    } else {
      const cronErrors = validateCron(schedule);

      if (cronErrors.length > 0) {
        errors.push(...cronErrors);
      }
    }

    if (errors.length === 0) {
      ruleSchedules.push(Schedule.cron(translateToCronOptions(schedule)));
    }
  });

  if (errors.length > 0) {
    throw new Error(errors.join(os.EOL));
  }

  return ruleSchedules;
};

const isTimeInterval = (
  schedule: FunctionSchedule
): schedule is TimeInterval => {
  const parts = schedule.split(' ');

  return (
    parts[0] === 'every' &&
    ['m', 'h', 'day', 'week', 'month', 'year'].some((a) =>
      parts[1].endsWith(a)
    ) &&
    parts.length === 2
  );
};

const parseTimeInterval = (timeInterval: TimeInterval) => {
  const part = timeInterval.split(' ')[1];
  const value = part.match(/-?\d+\.?\d*/);
  const unit = part.match(/[a-zA-Z]+/);

  return {
    value: value ? Number(value[0]) : undefined,
    unit: unit ? unit[0] : undefined,
  };
};

const isPositiveWholeNumber = (test: number) => test > 0 && test % 1 === 0;

const validateCron = (cron: CronSchedule) => {
  const errors: string[] = [];
  const cronParts = cron.split(' ');

  const [minute, hour, dayOfMonth, month, dayOfWeek, year] = cronParts;

  const minuteValidationErrors = validateCronPart('minutes', minute, 0, 59);
  const hourValidationErrors = validateCronPart('hours', hour, 0, 23);
  const dayOfMonthValidationErrors =
    dayOfMonth === '?'
      ? []
      : validateCronPart('day-of-month', dayOfMonth, 1, 31);
  const monthValidationErrors = validateCronPart('month', month, 1, 12);
  const dayOfWeekValidationErrors =
    dayOfWeek === '?' ? [] : validateCronPart('day-of-week', dayOfWeek, 1, 7);
  const yearValidationErrors = year
    ? validateCronPart('year', year, 1970, 2199)
    : [];

  errors.push(
    ...minuteValidationErrors,
    ...hourValidationErrors,
    ...dayOfMonthValidationErrors,
    ...monthValidationErrors,
    ...dayOfWeekValidationErrors,
    ...yearValidationErrors
  );

  if (dayOfMonth !== '?' && dayOfWeek !== '?') {
    errors.push(
      'Cron expressions cannot have both day-of-month and day-of-week defined, you must use a ? in one of the fields'
    );
  }

  return errors;
};

const validateCronPart = (
  cronPart: CronPart,
  value: string,
  min: number,
  max: number
) => {
  const errors: string[] = [];

  if (value === '*') {
    return errors;
  }

  const hasStep = value.includes('/');
  const hasRange = value.includes('-');
  const hasList = value.includes(',');

  if (hasList) {
    const listError = validateList(cronPart, value, min, max);

    if (listError) {
      errors.push(listError);
    }
    const listItems = value.split(',');

    listItems.forEach((listItem) => {
      if (listItem.includes('/')) {
        const stepError = validateStepValue(cronPart, listItem, min, max);

        if (stepError) {
          errors.push(stepError);
        }
      } else if (listItem.includes('-')) {
        const rangeError = validateRange(cronPart, listItem, min, max);

        if (rangeError) {
          errors.push(rangeError);
        }
      }
    });
  } else if (hasStep) {
    const stepError = validateStepValue(cronPart, value, min, max);

    if (stepError) {
      errors.push(stepError);
    }
  } else if (hasRange) {
    const rangeError = validateRange(cronPart, value, min, max);

    if (rangeError) {
      errors.push(rangeError);
    }
  }

  if (
    !hasStep &&
    !hasRange &&
    !hasList &&
    !isWholeNumberBetweenInclusive(Number(value), min, max)
  ) {
    errors.push(
      `Cron field for ${cronPart} must be a whole number between ${min} and ${max}`
    );
  }

  return errors;
};

const validateStepValue = (
  cronPart: CronPart,
  value: string,
  min: number,
  max: number
) => {
  const originalBase = value.split('/')[0];
  const [base, step] = value.split('/').map(Number);

  if (originalBase === '*') {
    if (isNaN(step) || step <= 0 || !isPositiveWholeNumber(step)) {
      return `Cron step values for ${cronPart} must be positive whole numbers`;
    }
  } else if (
    isNaN(base) ||
    isNaN(step) ||
    !isWholeNumberBetweenInclusive(base, min, max) ||
    step <= 0
  ) {
    return `Cron step values for ${cronPart} must be whole numbers between ${min} and ${max}`;
  }

  return;
};

const validateRange = (
  cronPart: CronPart,
  value: string,
  min: number,
  max: number
) => {
  const [start, end] = value.split('-').map(Number);

  if (
    isNaN(start) ||
    isNaN(end) ||
    !isWholeNumberBetweenInclusive(start, min, max) ||
    !isWholeNumberBetweenInclusive(end, min, max) ||
    start > end
  ) {
    return `Cron range for ${cronPart} must be whole numbers between ${min} and ${max}`;
  }

  return;
};

const validateList = (
  cronPart: CronPart,
  value: string,
  min: number,
  max: number
) => {
  if (
    !value
      .split(',')
      .every((v) => isWholeNumberBetweenInclusive(Number(v), min, max))
  ) {
    return `Cron list for ${cronPart} must contain whole numbers between ${min} and ${max}`;
  }

  return;
};

const isWholeNumberBetweenInclusive = (
  test: number,
  min: number,
  max: number
) => min <= test && test <= max && test % 1 === 0;

const translateToCronOptions = (schedule: FunctionSchedule): CronOptions => {
  if (isTimeInterval(schedule)) {
    const { value, unit } = parseTimeInterval(schedule);
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
        throw new Error(
          'Could not determine the schedule rate for the function'
        );
    }
  } else {
    const cronArray = schedule.split(' ');
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
