import preval from "preval.macro";

// evaluate the configuration at build time, so that it can
// use node functionality to prepare an object for the browser
export default preval`
  module.exports = JSON.stringify(require("../shared/config"));
`;
