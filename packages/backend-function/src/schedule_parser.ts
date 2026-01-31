import {
  CronOptionsWithTimezone,
  ScheduleExpression,
  ScheduleProps,
} from 'aws-cdk-lib/aws-scheduler';
import { TimeZone } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import type {
  CronScheduleExpression,
  FunctionSchedule,
  TimeIntervalExpression,
  ZonedCronSchedule,
  ZonedTimeInterval,
} from './factory.js';
import os from 'os';

type CronPart =
  | 'minutes'
  | 'hours'
  | 'day-of-month'
  | 'month'
  | 'day-of-week'
  | 'year';

type ZonedSchedule = ZonedCronSchedule | ZonedTimeInterval;

type Writable<T, K extends keyof T> = {
  -readonly [P in K]: T[P];
} & Omit<T, K>;

const DEFAULT_TIMEZONE = 'UTC';

const hydrateDefaults = (schedule: FunctionSchedule): ZonedSchedule => {
  if (typeof schedule === 'string') {
    return schedule.includes('every')
      ? { rate: schedule as TimeIntervalExpression, timezone: DEFAULT_TIMEZONE }
      : {
          cron: schedule as CronScheduleExpression,
          timezone: DEFAULT_TIMEZONE,
        };
  } else if ('rate' in schedule) {
    return { ...schedule, timezone: schedule.timezone ?? DEFAULT_TIMEZONE };
  } else if ('cron' in schedule) {
    return { ...schedule, timezone: schedule.timezone ?? DEFAULT_TIMEZONE };
  }
  throw new Error("Could not determine the function's schedule type");
};

type ScheduleConfig = Pick<ScheduleProps, 'schedule' | 'description'>;

/**
 * Converts function schedules to schedule props.
 * @param lambda The Lambda function to associate with the schedules.
 * @param functionSchedules The function schedules to convert.
 * @returns An array of schedule props.
 */
export const convertFunctionSchedulesToScheduleProps = (
  lambda: NodejsFunction,
  functionSchedules: FunctionSchedule | FunctionSchedule[],
): ScheduleConfig[] => {
  const errors: string[] = [];
  const scheduleProps: ScheduleConfig[] = [];

  const schedules = Array.isArray(functionSchedules)
    ? functionSchedules
    : [functionSchedules];

  const zonedSchedules = schedules.map(hydrateDefaults);

  zonedSchedules.forEach((schedule) => {
    if (isTimeInterval(schedule)) {
      const { value, unit } = parseTimeInterval(schedule.rate);

      if (value && !isPositiveWholeNumber(value)) {
        errors.push(
          'Function schedule rate must be set with a positive whole number',
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
          }`,
        );
      }
    } else {
      const cronErrors = validateCron(schedule.cron);

      if (cronErrors.length > 0) {
        errors.push(...cronErrors);
      }
    }

    if (errors.length === 0) {
      scheduleProps.push({
        schedule: ScheduleExpression.cron(
          translateToCronOptionsWithTimezone(schedule),
        ),
        description: schedule.description,
      });
    }
  });

  if (errors.length > 0) {
    throw new Error(errors.join(os.EOL));
  }

  return scheduleProps;
};

const isTimeInterval = (
  schedule: ZonedSchedule,
): schedule is ZonedTimeInterval => {
  const expression = 'rate' in schedule ? schedule.rate : '';
  const parts = expression.split(' ');

  return (
    parts[0] === 'every' &&
    ['m', 'h', 'day', 'week', 'month', 'year'].some((a) =>
      parts[1].endsWith(a),
    ) &&
    parts.length === 2
  );
};

const parseTimeInterval = (timeInterval: TimeIntervalExpression) => {
  const part = timeInterval.split(' ')[1];
  const value = part.match(/-?\d+\.?\d*/);
  const unit = part.match(/[a-zA-Z]+/);

  return {
    value: value ? Number(value[0]) : undefined,
    unit: unit ? unit[0] : undefined,
  };
};

const isPositiveWholeNumber = (test: number) => test > 0 && test % 1 === 0;

const validateCron = (cron: CronScheduleExpression) => {
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
    ...yearValidationErrors,
  );

  if (dayOfMonth !== '?' && dayOfWeek !== '?') {
    errors.push(
      'Cron expressions cannot have both day-of-month and day-of-week defined, you must use a ? in one of the fields',
    );
  }

  return errors;
};

const validateCronPart = (
  cronPart: CronPart,
  value: string,
  min: number,
  max: number,
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
      `Cron field for ${cronPart} must be a whole number between ${min} and ${max}`,
    );
  }

  return errors;
};

const validateStepValue = (
  cronPart: CronPart,
  value: string,
  min: number,
  max: number,
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
  max: number,
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
  max: number,
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
  max: number,
) => min <= test && test <= max && test % 1 === 0;

const translateToCronOptionsWithTimezone = (
  schedule: ZonedSchedule,
): CronOptionsWithTimezone => {
  if (isTimeInterval(schedule)) {
    const { value, unit } = parseTimeInterval(schedule.rate);
    switch (unit) {
      case 'm':
        return {
          minute: `*/${value}`,
          timeZone: TimeZone.of(schedule.timezone),
        };
      case 'h':
        return {
          minute: '0',
          hour: `*/${value}`,
          timeZone: TimeZone.of(schedule.timezone),
        };
      case 'day':
        return {
          minute: '0',
          hour: '0',
          day: `*`,
          timeZone: TimeZone.of(schedule.timezone),
        };
      case 'week':
        return {
          minute: '0',
          hour: '0',
          weekDay: `1`,
          timeZone: TimeZone.of(schedule.timezone),
        };
      case 'month':
        return {
          minute: '0',
          hour: '0',
          day: '1',
          month: `*`,
          timeZone: TimeZone.of(schedule.timezone),
        };
      case 'year':
        return {
          minute: '0',
          hour: '0',
          day: '1',
          month: '1',
          year: `*`,
          timeZone: TimeZone.of(schedule.timezone),
        };
      default:
        // This should never happen with strict types
        throw new Error(
          'Could not determine the schedule rate for the function',
        );
    }
  } else {
    const cronArray = schedule.cron.split(' ');
    const result: Writable<CronOptionsWithTimezone, 'day' | 'weekDay'> = {
      minute: cronArray[0],
      hour: cronArray[1],
      month: cronArray[3],
      year: cronArray.length === 6 ? cronArray[5] : '*',
      timeZone: TimeZone.of(schedule.timezone),
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
