let Utilities = require('./utils.js');

module.exports = {
  Alert: (rate, ores) => 
    `@everyone:\n The corp needs you to mine and contract the following ores to corp: @ ${rate} isk/m3: ${ores.map(o => `**${o}**`).join(', ')}`,
  
  Code: (text) => 
    `\`${text}\``,

  CodeBlock: (text) => 
    `\`\`\`${text}\`\`\``,
  
  Extracting: () => 
    `All moons are extracting!`,
  
  MoonOres: (name, hrs, ores) => 
    `in ${hrs} hrs\n\t${name}\n\t\t${ores.join('\n\t\t')}`,
  
  NotExtracting: (names) => 
    `The following structures are not extracting: ${names.join(', ')}!`,
  
  OrePercent: (ore, pcnt) => 
    `${ore}: ${Math.round(parseFloat(pcnt)*100,2)}%`,
  
  OreValue: (qty, hrs, prd, val, vol, rate) => 
    `${Utilities.PrettyNumber(parseFloat(qty)*parseFloat(hrs)*parseFloat(rate))} m3 ${prd} (${Utilities.PrettyNumber(parseFloat(val)/parseFloat(vol))} isk/m3, ${Utilities.PrettyNumber(qty*hrs*rate*val/vol)} isk total)`,
  
  OwnedMoon: (ext, moon, ores) => 
    `${ext ? '[EXTRACTING] ' : ''} ${moon} - ${ores}`,
  
  Remaining: (hrs) => 
    `in ${hrs} hrs:`,
  
  Reminder: (rate, system) => 
    `Contact ${rate}% of all mined non-buyback ore to corp in ${system} within a week of mining except except: **Mercoxit** and **Ochre**.`,
  
  Startup: (usrs, chans, guilds) =>  
    `Bot has started, with ${usrs} users, in ${chans} channels of ${guilds} guilds.`,

  Value: (ore, val, vol) => 
    `${ore}: ${Utilities.PrettyNumber(parseFloat(val)/parseFloat(vol))} isk/m3`
}