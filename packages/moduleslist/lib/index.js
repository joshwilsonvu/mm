
const yaml = require("yaml");
const fs = require("fs");

// Parse the YAML file into a very large list
module.exports = toFlatList(yaml.parse(fs.readFileSync(require.resolve("./data.yaml"), "utf8")));

// Convert  { [category]: [{}, {}, {}...] } into a
// flat array where each object has a "category" property
function toFlatList(obj) {
  return Object.keys(obj).flatMap(category => (
    obj[category].map(entry => ({ ...entry, category }))
  ));
}
