/*
 * MM2 modules expect these global variables and CSS. 
 * These files are only imported if there are MM2 modules preset.
 */
import moment from "moment-timezone";
import "weathericons/css/weather-icons.css";
import "weathericons/css/weather-icons-wind.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "@fortawesome/fontawesome-free/css/v4-shims.min.css";
import nunjucks from "nunjucks";
import SunCalc from "suncalc";

Object.assign(window, {
    moment,
    nunjucks,
    SunCalc
});
