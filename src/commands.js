let Config = include('data/config.json');

//let MarketData = include('src/services/market-data.js');
let Moons = include('src/services/moons.js');
let OreValues = include('src/services/ore-values.js');

module.exports = {
  Help = () => {
    return Config.help_messages.join('\n');
  },

  Owned = (search) => {

  },
  Inactive = (search) => {},
  Schedule = (search) => {},
  Values = (search) => {},
  Scheduled = (search) => {},
  ScheduledHours = (hours = 24) => {}
}