let Utilities = include('src/utilities.js');

module.exports = {
  Reminder = (rate, system) => `Contact ${rate}% of all mined non-buyback ore to corp in ${system} within a week of mining except except: **Mercoxit** and **Ochre**.`,
  Alert = (rate, ores) => `@everyone:\n The corp needs you to mine and contract the following ores to corp: @ ${rate} isk/m3: ${ores.map(o => `**${o}**`).join(', ')}`,
  OreValue = (qty, hrs, prd, val, vol, rate) =>  `${Utilities.PrettyNumber(qty*hrs*rate)} m3 ${prd} (${Utilities.PrettyNumber(val/vol)} isk/m3, ${Utilities.PrettyNumber(qty*hrs*rate*val/vol)} isk total)`,
  Remaining = (hrs) => `in ${hrs} hrs:`,
  Value = (ore, val, vol) => `${ore}: ${Utilities.PrettyNumber(val/vol)} isk/m3`,
  OrePercent = (ore, pcnt) => `${ore}: ${Math.rount(pcnt*100,2)}%`,
  NotExtracting = (names) => `The following structures are not extracting: ${names.join(', ')}!`,
  Extracting = () => `All moons are extracting!`
}