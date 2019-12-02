// This loader transforms legacy modules into react components.
module.exports = function(content) {
  this.cacheable(true);

  if (content.test(/^\s*Module\.register\(/)) {
    // This is a legacy-style module; evaluate with globals
    this.getLogger().log(`Loading legacy-style module ${this.resourcePath}`);
    return `
import legacy from "mm/legacy";
export default legacy(${JSON.stringify(content)});
`;
  }
};
