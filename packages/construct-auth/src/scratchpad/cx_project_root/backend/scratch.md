1. Overrides can use the full feature set of CDK directly in the amplify.ts file
  ```ts backend/auth.ts
export const auth = {
  loginMechanisms: ["username"], 
  overrides: (resources) => {
    resources.userPool.passwordPolicy["validityDate"] = 3
    resources.userPool.signUpTrigger.ARN = "..."
  }
}
```
2. Custom resources can be directly integrated into the amplify.ts file
  ```ts backend/index.ts
import { customResource } from '@aws-amplify/backend'
import { auth } from './auth'
export const config = {
  auth,
}
export const custom = (ctx => {
  const lambda = new Function(ctx, "my function", () => {})  
  auth.signUpTrigger = lambda
})
```
3. If/when customers want to move to just using CDK it is truly a copy paste
   Will be true because the config is the params for CDK without the CDK constructs and context.
4. Customers don't have to remember to export the config objects from the amplify.ts file; the AmplifyContext object ties everything together and can be typechecked by TS
   Façade can catch that.
5. The number of translation layers that we have to implement and maintain is cut in half
   Actually just as much.
   Collapse
