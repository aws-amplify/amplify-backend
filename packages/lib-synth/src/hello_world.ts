export type Greeter = (greeting: string) => void;
export function helloWorld(greeter: Greeter) {
  greeter('Hello, world.');
}
