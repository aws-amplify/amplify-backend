import _ from 'lodash';

/**
 * A class that can accumulate (squash merge) objects into single instance.
 */
export class ObjectAccumulator<T> {
  /**
   * creates object accumulator.
   */
  constructor(private readonly accumulator: Partial<T>) {}

  accumulate = (part: Partial<T>): ObjectAccumulator<T> => {
    _.mergeWith(this.accumulator, part, (objValue, srcValue, key) => {
      if (_.isArray(objValue)) {
        return objValue.concat(srcValue);
      }
      if (objValue && !_.isObject(objValue)) {
        throw new Error(`key ${key} is already defined`);
      }
    });
    return this;
  };

  getAccumulatedObject = () => {
    return this.accumulator;
  };
}
