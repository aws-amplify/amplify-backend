import { IoMessage, IoRequest, ToolkitAction } from '@aws-cdk/toolkit';

// SimpleSpread<L, R> is a simplified version of what happens when you
// do an object spread like {...left, ...right} where left is of type L and
// right is of type R.  It is the type R, with any properties on L that
// don't exist in R.  (It doesn't work if a key in L is an optional property in
// R, which is why this is simplified)
// See https://stackoverflow.com/a/56346446
export type SimpleSpread<L, R> = R & Pick<L, Exclude<keyof L, keyof R>>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface AmplifyEventMessage {
  code: string;
  action: ToolkitAction | 'amplify';
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export interface AmplifyIoHostEventMessage<T>
  extends SimpleSpread<IoMessage<T>, AmplifyEventMessage> {}

export type AmplifyIOHost = {
  requestResponse: <T, U>(msg: IoRequest<T, U>) => Promise<U>;
  notify: <T>(msg: AmplifyIoHostEventMessage<T>) => Promise<void>;
};
