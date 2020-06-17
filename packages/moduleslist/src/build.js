
const yaml = require("yaml");
const fs = require("fs-extra");
const path = require("path");

(async function build() {
  // Parse the YAML file
  const data = yaml.parse(await fs.readFile(path.resolve(__dirname, "data.yaml"), "utf8"));

  // Convert  { [category]: [{}, {}, {}...] } into a
  // flat array where each object has a "category" property
  const list = Object.keys(data).flatMap(category => (
    data[category].map(entry => ({ ...entry, category }))
  ));

  // Write the list to dist/index.json
  await fs.writeJson(path.resolve(__dirname, "..", "dist", "index.json"), list, { spaces: 1 });
})();
