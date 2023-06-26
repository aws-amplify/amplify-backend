/**
 * A backend template.
 */
export type BackendTemplate = {
  readonly name: string;
};

/**
 * A gallery of available backend templates.
 */
export interface BackendTemplateGallery {
  /**
   * Lists available backend templates.
   */
  listBackendTemplates: () => Promise<Array<BackendTemplate>>;
}

/**
 * Creates backend project from template.
 */
export interface BackendProjectCreator {
  /**
   * Creates backend project from template.
   */
  createFromTemplate: (
    templateName: string,
    destinationDirectory: string
  ) => Promise<void>;
}
