describe('synth from imperative', () => {
  it('testing', async () => {
    const { resources } = await import('../../example-project-ts/amplify');

    const tokenMap: Record<string, string> = {};
    const resourceDef: Record<string, unknown> = {};
    Object.entries(resources).forEach(([name, def]) => {
      tokenMap[def.id] = name;
      resourceDef[name] = def.props;
    });

    console.log(JSON.stringify(resourceDef, undefined, 2));
    console.log(JSON.stringify(tokenMap, undefined, 2));
  });
});
