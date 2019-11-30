/* Magic Mirror
 * Default Modules List
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */
import fs from "fs";

// Modules listed below can be loaded without the 'default/' prefix. Omitting the default folder name.
const getDefaults = () => fs.readdirSync(__dirname, { withFileTypes: true })
  .filter(dirent => typeof dirent.isDirectory === 'function' && dirent.isDirectory())
  .map(dirent => dirent.name);

export default getDefaults();