export type Greeter = (greeting: string) => void;

/**
 * Hello world function
 * @param greeter how to greet
 */
export function helloWorld(greeter: Greeter) {
  greeter('Hello, world.');
}
