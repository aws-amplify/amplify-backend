export type BackendTemplate = {
  readonly name: string;
};

/**
 * Lists available backend templates.
 */
export const listBackendTemplates = (): Array<BackendTemplate> => {
  return [
    {
      name: 'empty',
    },
  ];
};
