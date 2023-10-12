import { ExecaChildProcess } from 'execa';

/**
 * Type of actions a user can take with their app.
 */
export enum ActionType {
  SEND_INPUT_TO_PROCESS,
  UPDATE_FILE_CONTENT,
  ASSERT_ON_PROCESS_OUTPUT,
  KILL_PROCESS,
}

type SendInputToProcessAction = {
  actionType: ActionType.SEND_INPUT_TO_PROCESS;
  action: (execaProcess: ExecaChildProcess<string>) => Promise<void>;
};
type KillProcess = {
  actionType: ActionType.KILL_PROCESS;
  action: (execaProcess: ExecaChildProcess<string>) => Promise<void>;
};
type UpdateFileContentAction = {
  actionType: ActionType.UPDATE_FILE_CONTENT;
  action: () => Promise<void>;
};
type AssertOnProcessOutputAction = {
  actionType: ActionType.ASSERT_ON_PROCESS_OUTPUT;
  action: (processOutputLine: string) => void;
};

export type Action =
  | SendInputToProcessAction
  | KillProcess
  | UpdateFileContentAction
  | AssertOnProcessOutputAction;

/**
 * Type of predicates based on which to execute actions. An action can only be associated with a predicate
 */
export enum PredicateType {
  MATCHES_STRING_PREDICATE,
}

type MatchesStringPredicate = {
  predicateType: PredicateType.MATCHES_STRING_PREDICATE;
  predicate: (line: string) => boolean;
};

export type Predicate = MatchesStringPredicate;

/**
 * Contains a predicate that the process controller should evaluate,
 * then an optional action is executed by the process controller if predicate is true. IFTTT
 */
export type PredicatedAction = {
  ifThis: Predicate;
  /**
   * String that should be sent once the predicate is true
   *
   * If we need to do things like send multiple keystrokes in response to a single prompt, we will likely need to expand this to an array of values to send
   */
  then?: Action;
};
