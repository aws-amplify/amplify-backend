export type SeedFunction = () => Promise<void>;

const seedFunctions: Array<SeedFunction> = [];

export const defineSeed = (seedFunction: SeedFunction) => {
  seedFunctions.push(seedFunction);
};

process.once('beforeExit', async () => {
  for (const seedFunction of seedFunctions) {
    await seedFunction();
  }
});
