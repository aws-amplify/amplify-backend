export type Hook = () => Promise<void>;
/**
 * Manages deployment hooks
 */
export class HookHandler {
  protected preDeploymentHooks: Array<Hook> = [];
  protected postDeploymentHooks: Array<Hook> = [];
  unregisterPostDeploymentHook = (hook: Hook) => {
    const index = this.postDeploymentHooks.findIndex((fn) => fn === hook);
    if (index === null) return;
    this.postDeploymentHooks.splice(index, 1);
  };
  registerPostDeploymentHook = (hook: Hook) => {
    this.postDeploymentHooks.push(hook);
  };
  unregisterPreDeploymentHook = (hook: Hook) => {
    const index = this.preDeploymentHooks.findIndex((fn) => fn === hook);
    if (index === null) return;
    this.preDeploymentHooks.splice(index, 1);
  };
  registerPreDeploymentHook = (hook: Hook) => {
    this.preDeploymentHooks.push(hook);
  };
}
