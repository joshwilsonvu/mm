/*
 * MM2 modules expect these global variables and CSS.
 * These files are only imported if there are MM2 modules preset.
 */

// Because this package will be used with @mm/cli, it's okay to import CSS file
import "weathericons/css/weather-icons.css";
import "weathericons/css/weather-icons-wind.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "@fortawesome/fontawesome-free/css/v4-shims.min.css";

// @ts-ignore
import moment from "moment-timezone";
// @ts-ignore
import nunjucks from "nunjucks";
// @ts-ignore
import SunCalc from "suncalc";

export {
    moment,
    nunjucks,
    SunCalc,
}