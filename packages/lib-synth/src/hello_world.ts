export type Greeter = (greeting: string) => void;

/**
 * Hello world example
 */
export function helloWorld(greeter: Greeter) {
  greeter('Hello, world.');
}
