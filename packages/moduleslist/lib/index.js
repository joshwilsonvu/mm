/**
 * The `data.yaml` file lists all of the known third-party Magic Mirror modules.
 * It will replace the "3rd Party Modules" GitHub Wiki page. Using a
 * list committed to GitHub and published to npm enables tools like
 * @mm/cli to intelligently install and upgrade third-party modules.
 * The documentation website will also display this list in a more
 * readable format.
 *
 * To add your module to the list, just send a Pull Request that adds
 * an entry to the file that looks like the following:
 *
 * <Category>:
 *  - name: <name>  # A comment
 *    author: <author>
 *    description: <description line 1>
 *      <optional description line 2>
 *      ...
 *    repository: https://github.com/<user>/<repository>
 *
 * Please try to place your module in an existing category. If none of
 * the existing categories describe your module, a new category may be
 * approved if similar modules might also use it.
 */

const yaml = require("yaml");
const fs = require("fs");

// Parse the YAML file into a very large object
const modulesObject = yaml.parse(fs.readFileSync(require.resolve("./data.yaml"), "utf8"));
// Convert  { [category]: [{}, {}, {}...] } into a
// flat array where each object has a "category" property
const modulesList = Object.keys(modulesObject).flatMap(category => (
  modulesObject[category].map(entry => ({ ...entry, category }))
));

module.exports = modulesList;