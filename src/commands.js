let Config = require('../data/config.json');
let Moons = require('./services/moons.js');
let Irs = require('./services/irs.js');
let OreValue = require('./services/ore-value.js');
let Formatters = require('./formatters.js');
let Moment = require('moment');


module.exports = {
  /**
   * Displays the help messages defined in config.
   * @returns A promise returning a string.
   */
  Help: () => {
    return Config.help_messages.map(m => `${Config.prefix}${m}`).join('\n');
  },
  /**
   * Displays all moons and products from data/eve/moons.json and if they are extracting.
   * @returns A promise returning a string.
   */
  Owned: (search, limit = 5) => {
    let re = new RegExp(search, 'i');
    return Moons.Owned()
      .then(m => m.filter(i => re.test(JSON.stringify(i))))
      .then(Formatters.OwnedMoons);
  },
  /**
   * Displays all observers which are not extracting.
   * @returns A promise returning a string.
   */
  Inactive: (search, limit = 5) => {
    let re = new RegExp(search, 'i');
    return Moons.Inactive()
      .then(m => m.filter(i => re.test(JSON.stringify(i))))
      .then(Formatters.InactiveMoons);
  },
  /**
   * Displays all moon extractions and the ore quantities and values.
   * @returns A promise returning a string.
   */
  Schedule: (search, limit = 5) => {
    let re = new RegExp(search, 'i');
    return Moons.ExtractingOres()
      .then(m => m.filter(i => re.test(JSON.stringify(i))))
      .then(sortMoonsByArrival)
      .then(Formatters.ExtractingOres);
  },
  /**
   * Displays all moon extractions exiting within {hours}
   * @returns A promise returning a string.
   */
  ScheduledHours: (hours = 24, limit = 5) => {
    return Moons.ExtractingOres()
      .then(m => m.filter(i => i.hrsRemaining < hours))
      .then(sortMoonsByArrival)
      .then(Formatters.ExtractingOres);
  },
  /**
   * Display all ore values by their reprocessed materials.
   * @returns A promise returning a string.
   */
  Values: (search) => {
    let re = new RegExp(search, 'i');
    return OreValue.Get('jita')
      .then(o => o.filter(i => re.test(JSON.stringify(i))))
      .then(Formatters.OreValues);
  },

  Tax: (name) => {
    let date = new Date(), y = date.getFullYear(), m = date.getMonth();
    let begin = new Date(y, m, 1);
    let end = new Date(y, m + 1, 0);
    return Irs.Tax(name, Config.corporation_id, begin, end)
      .then(r => Formatters.Tax(r, Moment(begin).format('MM-DD'), Moment(end).format('MM-DD')));
  }
}

/**
 * Sorts a list of moons by hrsRemaining.
 * @param {moon[]} moons An array of objects with an hrsRemaining property 
 * @returns The sorted moon list.
 */
function sortMoonsByArrival(moons) {
  moons.sort((a, b) => a.hrsRemaining - b.hrsRemaining);
  return moons;
}