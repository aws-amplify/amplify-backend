import _ from 'lodash';

/**
 * A class that can accumulate (squash merge) objects into single instance.
 */
export class ObjectAccumulator<T> {
  /**
   * creates object accumulator.
   */
  constructor(private readonly accumulator: Partial<T>) {}

  accumulate = (part: Partial<T>) => {
    _.merge(this.accumulator, part);
  };

  getAccumulatedObject = () => {
    return this.accumulator;
  };
}
