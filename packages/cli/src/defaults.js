/* exported defaults */

/* Magic Mirror
 * Config Defauls
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

module.exports = {
	address: "localhost",
	port: 8080,
	kioskmode: false,
	electronOptions: {},
	ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],

	language: "en",
	timeFormat: 24,
	units: "metric",
	zoom: 1,
	customCss: "css/custom.css",
};
