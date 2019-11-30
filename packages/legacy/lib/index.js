import Module from "./module";

export default js => {
  // Patch Module so that evaluating the script will set a local variable.
  let definition;
  Module._setDefinition = def => definition = def;
  // Run the script as if the following variables were global
  const globals = {
    Module
  };
  (new Function(...Object.keys(globals), js))(...Object.values(globals));
  Module._setDefinition = null; // unpatch


}