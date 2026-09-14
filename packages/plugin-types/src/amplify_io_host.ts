import { IoMessage, IoRequest, ToolkitAction } from '@aws-cdk/toolkit-lib';

// SimpleSpread<L, R> is a simplified version of what happens when you
// do an object spread like {...left, ...right} where left is of type L and
// right is of type R.  It is the type R, with any properties on L that
// don't exist in R.  (It doesn't work if a key in L is an optional property in
// R, which is why this is simplified)
// See https://stackoverflow.com/a/56346446
export type SimpleSpread<L, R> = R & Pick<L, Exclude<keyof L, keyof R>>;

export type AmplifyEventMessage = {
  code?: string;
  action: ToolkitAction | 'amplify';
};

export type AmplifyIoHostEventMessage<T> = {} & SimpleSpread<
  IoMessage<T>,
  AmplifyEventMessage
>;

export type AmplifyIoHostEventRequestMessageIoRequest<T, U> = IoRequest<T, U>;

export type AmplifyIOHost = {
  requestResponse: <T, U>(
    msg: AmplifyIoHostEventRequestMessageIoRequest<T, U>,
  ) => Promise<U>;
  notify: <T>(msg: AmplifyIoHostEventMessage<T>) => Promise<void>;
};
