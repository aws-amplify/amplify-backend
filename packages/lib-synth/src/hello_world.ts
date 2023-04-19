export type Greeter = (greeting: string) => void;

/**
 * Hello world example
 * @param greeter function that can greet
 */
export function helloWorld(greeter: Greeter) {
  greeter('Hello, world.');
}
