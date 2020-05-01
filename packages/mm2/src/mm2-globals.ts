/*
 * MM2 modules expect these global variables and CSS.
 * These files are only imported if there are MM2 modules preset.
 */

// Because this package will be used with @mm/cli, it's okay to import CSS file
import "weathericons/css/weather-icons.css";
import "weathericons/css/weather-icons-wind.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "@fortawesome/fontawesome-free/css/v4-shims.min.css";

const moment: any = require("moment-timezone");
const nunjucks: any = require("nunjucks");
const SunCalc: any = require("suncalc");

export {
    moment,
    nunjucks,
    SunCalc,
}