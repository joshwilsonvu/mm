module.exports = require('../../../../../../../modules/default/calendar/vendor/ical.js/ical')

var node = require('../../../../../../../modules/default/calendar/vendor/ical.js/node-ical')

// Copy node functions across to exports
for (var i in node){
  module.exports[i] = node[i]
}