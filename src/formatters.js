let Config = require('../data/config.json');

let Messages = require('./messages.js');

module.exports = {
  /**
   * 
   */
  OwnedMoons: (moons) => {
    if(moons.length < 1)
      return '';
  
    let strings = [];
  
    moons.forEach(m =>
      strings.push(
        Messages.Code(
          Messages.OwnedMoon(
            m.extracting, 
            m.name,
            m.ores.map(o =>
              Messages.OrePercent(
                o.product,
                o.quantity
            ))
            .join(', ')))));
  
    return strings.join('\n');
  },

  /**
   * 
   */
  ExtractingOres: (moons) => {
    if(moons.length < 1)
      return '';
  
    let strings = [];
  
    let valubleOres = moons
      .map(m => m.ores)
      .reduce((prev, curr) => prev.concat(curr))
      .filter(o => o.value/o.volume > Config.buyback_minimum)
      .map(o => o.product);
  
    if(valubleOres.length > 0)
      strings.push(`${Messages.Alert(Config.buyback_price, valubleOres)}`);
  
    strings.push(`${Messages.Reminder(Config.tax_rate, Config.buyback_system)}`);
    
    moons.forEach(m => 
      strings.push(
        Messages.CodeBlock(
          Messages.MoonOres(
            m.name, 
            m.hrsRemaining, 
            m.ores.map(o => 
              Messages.OreValue(
                parseFloat(o.quantity), 
                parseFloat(m.hrsTotal), 
                o.product, 
                parseFloat(o.value), 
                parseFloat(o.volume), 
                parseFloat(Config.refine_rate)))))));
  
      return strings.join('\n');
  },

  OreValues: (ores) => {
    return ores.map(o => Messages.Value(o.name, o.value, o.volume)).join('\n');
  },

  InactiveMoons: (moons) => {

  }
}