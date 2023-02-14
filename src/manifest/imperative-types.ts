import { z } from 'zod';

const s3InputSchema = z.object({});

type ResourceBase<T> = {
  definition: T;
};

type TriggerSource<EventName extends string> = {
  triggers: Record<EventName, TriggerHandler>;
};

type TriggerHandler = {
  _triggerHandler: true;
};

type RuntimeAccessGranter = {
  _runtimeAccessGranter: true;
};
