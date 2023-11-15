import * as path from 'path';
import { PackageJsonReader } from '.';

/**
 * Loads the contents of package.json from process.cwd().
 *
 * Throws if no package.json is present
 */
export class CwdPackageJsonLoader {
  /**
   * Returns the contents of the package.json file in process.cwd()
   *
   * If no package.json file exists, or the content does not pass validation, an error is thrown
   */
  read() {
    return new PackageJsonReader().read(
      path.resolve(process.cwd(), 'package.json')
    );
  }
}
