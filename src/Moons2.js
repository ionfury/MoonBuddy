let Config = require(`../config.json`);
let Promise = require('bluebird');
let Accessors = require(`./Accessors.js`);
let Api = require(`./Api.js`);
let dateFormat = require('dateformat');
let DB = require(`./db.js`);
let DateDiff = require(`date-diff`);
let Utilities = require (`./Utilities.js`);
let Reprocessing = require('../reprocessing.json');

let MINING_DURATION_DAYS = 25;
let EXTRACTION_AMOUNT_PER_HOUR = 20000;
let BUYBACK_MINIMUM = 400;
let BUYBACK_PRICE = 350;

function getMaterialValuesPromise() {
  console.log('getMaterialValuesPromise');
  return Promise.map(Config.materials, mat => Accessors.GetMarketHubInfo('jita', mat))
    .then(prices => {
      return Reprocessing
        .map(ore => {
          let value = 0;
          prices.forEach(price => {
            value+= ore[price.name] * price.buy;
          });
          value = value / ore.Required * 0.89;
          return {
            'name': ore.Ore,
            'value': value,
            'volume': ore.Volume
          };
        });
    });
}

function getExtractingMoonData() {
  console.log('getExtractingMoonData');
  let getAccessToken = Accessors.GetAccessTokenPromise(process.env.refresh_token);
  let getExtractions = getAccessToken.then(Accessors.GetExtractionsPromise);

  return getExtractions
    .then(extractions => {
      let extractingMoonIds = extractions.map(extraction => extraction.moon_id.toString());
      
      let moonJson = Config.moons;
      
      let extractingMoons = moonJson.filter(moon => extractingMoonIds.indexOf(moon.moonID) >= 0);
      let uniqueMoonIds = Array.from(new Set(extractingMoons.map(moon => moon.moonID)));

      return uniqueMoonIds.map(moonID => {
        let moon = moonJson.filter(moon => moon.moonID == moonID)[0];
        let moonExtraction = extractions.filter(extraction => extraction.moon_id == moonID)[0];
        let chunkArrivalTime = new Date(moonExtraction.chunk_arrival_time);
        
        let extractionStartTime = new Date(moonExtraction.extraction_start_time);
        var hrsTotal = new DateDiff(chunkArrivalTime, extractionStartTime);

        let now = new Date();
        var diff = new DateDiff(chunkArrivalTime, now);
        return { "moonExtraction": moonExtraction, "moon": moon, "hrsTotal": hrsTotal.hours(), "hrsRemaining": diff.hours() };
      });
    });
}

function getMoonInfo() {
  console.log('getMoonInfo');
  let getValues = getMaterialValuesPromise();
  let getData = getExtractingMoonData();
  let getDataToday = getData;//.then(moonData => moonData.filter(moon => moon.hrsRemaining < 24));
  let moonJson = Config.moons;

  return Promise.join(getValues, getDataToday, (values, moonData) => {

    return moonData.map(data => {
      let ores = moonJson
        .filter(json => json.name === data.moon.name)
        .map(json => { 
          let item = values.find(a => a.name === json.product);
          return {
            'product':json.product, 
            'quantity':json.quantity,
            'value': item.value,
            'volume': item.volume
          }});

      return {
        'name': data.moon.name,
        'hrsRemaining': data.hrsRemaining,
        'hrsTotal': data.hrsTotal,
        'ores': ores
      };
    });    
  });
}

function Scheduled(search) {
  let re = new RegExp(search, 'i');
  return getMoonInfo()
    .then(moons => { 
      moons.sort((a, b) => (Number.parseFloat(a.hrsRemaining) - Number.parseFloat(b.hrsRemaining)))
      return moons;
    })
    .then(formatMoonInfo)
    .then(items => items.filter(item => re.test(item)))
    .then(strings => strings.join('\n'));
}

function ScheduledToday() {
  return getMoonInfo()
    .then(moons => moons.filter(moon => moon.hrsRemaining < 24))
    .then(formatMoonInfo)
    .then(strings => strings.join('\n'));
}

function formatMoonInfo(moons) {
  let strings = [];

  let valubleOres = moons.map(moon => moon.ores);
  valubleOres = [].concat.apply([], valubleOres)
    .filter(ore => ore.value/ore.volume > BUYBACK_MINIMUM);
  
  if(valubleOres.length > 0) {
    let string = '';
    string += `\n@everyone:\n The corp needs you to contract the following ores to corp @ ${BUYBACK_PRICE} isk/m3: `;
    string += valubleOres.map(ore => `**${ore.product}**`).join(', ');
    strings.push(string);
  }

  moons.forEach(moon => {
    let string = '';
    string += '```';
    string += `in ${moon.hrsRemaining} hrs:`;
    string += `\n\t${moon.name}:`;
    moon.ores.forEach(ore => {
      string += `\n\t\t${formatProduct(ore.quantity, moon.hrsTotal, ore.product, ore.value, ore.volume)}`;
    });
    string += '```';
    strings.push(string);
  });

  return strings;
}

function formatProduct(quantity, hrsTotal, product, value, volume) {
  return  `${Utilities.FormatNumberForDisplay(quantity * hrsTotal * EXTRACTION_AMOUNT_PER_HOUR)} m3 ${product} (${iskM3(value, volume)} isk/m3, ${Utilities.FormatNumberForDisplay(quantity * hrsTotal * EXTRACTION_AMOUNT_PER_HOUR * value / volume)} isk total)`;
}

function Announce() 
{
  let getAccessToken = Accessors.GetAccessTokenPromise(process.env.refresh_token);
  let getExtractions = getAccessToken.then(Accessors.GetExtractionsPromise);
  let getValues = getMaterialValuesPromise();
  return Promise.join(getValues, getExtractions, (values, extractions) => {
    let extractingMoonIds = extractions.map(extraction => extraction.moon_id.toString());
    let moonJson = Config.moons;
    
    let extractingMoons = moonJson.filter(moon => extractingMoonIds.indexOf(moon.moonID) >= 0);
    let uniqueMoonIds = Array.from(new Set(extractingMoons.map(moon => moon.moonID)));

    let moonData = uniqueMoonIds.map(moonID => {
      let moon = moonJson.filter(moon => moon.moonID == moonID)[0];
      let moonExtraction = extractions.filter(extraction => extraction.moon_id == moonID)[0];
      let chunkArrivalTime = new Date(moonExtraction.chunk_arrival_time);
      let now = new Date();
      var diff = new DateDiff(chunkArrivalTime, now);
      return { "moonExtraction": moonExtraction, "moon": moon, "hrsRemaining": diff.hours() };
    });

    moonData = moonData.filter(moon => moon.hrsRemaining < 24);

    if(moonData.length < 1)
      return "";

    let scheduleString = '';
    
    scheduleString += `@here The following extractions finish today:`
    scheduleString += moonData.map(data => {
      let string = '';
      let ores = moonJson
        .filter(json => json.name === data.moon.name)
        .map(json => { return {"product":json.product, "quantity":json.quantity}});
      
      let chunkArrivalTime = new Date(data.moonExtraction.chunk_arrival_time);
      let extractionStartTime = new Date(data.moonExtraction.extraction_start_time);
      var diff = new DateDiff(chunkArrivalTime, extractionStartTime);

      string += `in ${data.hrsRemaining} hrs:`;
      string += `\n\t${data.moon.name}\n\t\t`;
      string += ores.map(ore => `${Utilities.FormatNumberForDisplay(ore.quantity * diff.hours() * EXTRACTION_AMOUNT_PER_HOUR)} m3 ${ore.product} @${values.find(a => a.name === ore.product).value} isk/m3`).join('\n\t\t');
  
      string = `\`\`\`${string}\`\`\``;
  
      return string;
    });
    
    return scheduleString;
  });
}

function iskM3(price, vol) {
  let p = Number.parseFloat(price);
  let v = Number.parseFloat(vol);

  return Utilities.FormatNumberForDisplay(p / v);
}

function getOwnedOrePrices(search) {
  let re = new RegExp(search, 'i');

  return Promise.map(Config.materials, mat => Accessors.GetMarketHubInfo('jita', mat))
    .then(prices => {
      return Reprocessing
        .filter(ore => re.test(ore.Ore))
        .map(ore => {
        let value = 0;
        prices.forEach(price => {
          value+= ore[price.name] * price.buy;
        });
        value = value / ore.Required * 0.89;
        return `${ore.Ore}: ${iskM3(value, ore.Volume)} isk/m3`;
      }).join('\n');
    });

    //.then(prices => prices.map(price => `${price.name}: ${iskM3(price.sell, price.volume)} isk/m3`).join('\n'));
}


var GetOwnedMoons = (search) =>{ 
  let getAccessToken = Accessors.GetAccessTokenPromise(process.env.refresh_token);
  let getExtractions = getAccessToken.then(Accessors.GetExtractionsPromise);

  return getExtractions
    .then(extractions => {
      let moonJson = Config.moons;
      let uniqueMoonNames = Array.from(new Set(moonJson.map(moon => {
        let name = moon.name;
        if(extractions.filter(extraction => extraction.moon_id == moon.moonID).length > 0)
          name = `[EXTRACTING] ${name}`;
        return name;
      })));

      let moonOres = uniqueMoonNames.map(moonName => {
        let ores = moonJson
          .filter(json => json.name === moonName.replace('[EXTRACTING] ', ''))
          .map(json => { return {"product":json.product, "quantity":json.quantity}});

        return {"name":moonName,"ores":ores};
      });
      let moonStrings = moonOres.map(moon => {
        let oreStrings = moon.ores.map(ore => `${ore.product}: ${Math.round(ore.quantity*100,2)}%`);
        return `${moon.name} - ${oreStrings.join(" ")}`;
      });

      if(search != '') {
        let re = new RegExp(search, 'i');
        moonStrings = moonStrings.filter(string => re.test(string));
      }

      return moonStrings.join('\n');
    });
}

var Test = (search) => {


}

function GetInactiveMoons(){
  let getAccessToken = Accessors.GetAccessTokenPromise(process.env.refresh_token);
  let getExtractions = getAccessToken.then(Accessors.GetExtractionsPromise);
  //let getExtractionStructures = Accessors.GetExtractionStructuresPromise(getAccessToken, getExtractions);

  let getObservers = getAccessToken.then(Accessors.GetObserversPromise);
  let getObserverStructures = Accessors.GetObserverStructuresPromise(getAccessToken, getObservers);

  return Promise.join(getObserverStructures, getExtractions, (observerStructures, extractions) => {
    let notExtracting = observerStructures.filter(observer => extractions.some(extraction => extraction.structure_id == observer.structure_id))

    let names = notExtracting.map(data => data.name);

    if(names.length > 0)
      return `\`\`\`The following structures have no extraction: ${names.join('\n\t')}\`\`\``;
    else
      return `\`\`\`All structures are extracting!\`\`\``;
  });
}

function GetActiveMoons(search)
{
  return "Not implemented!";
}

///[name] - [extraction ends] (time remaining) ([product 1] [product 1 %] [product 2] [product 2%])
function GetScheduledMoons(search)
{
  let getAccessToken = Accessors.GetAccessTokenPromise(process.env.refresh_token);
  let getExtractions = getAccessToken.then(Accessors.GetExtractionsPromise);

  return getExtractions.then(extractions => {
    let extractingMoonIds = extractions.map(extraction => extraction.moon_id.toString());
    let moonJson = Config.moons;
    
    let extractingMoons = moonJson.filter(moon => extractingMoonIds.indexOf(moon.moonID) >= 0);
    let uniqueMoonIds = Array.from(new Set(extractingMoons.map(moon => moon.moonID)));

    let moonData = uniqueMoonIds.map(moonID => {
      let moon = moonJson.filter(moon => moon.moonID == moonID)[0];
      let moonExtraction = extractions.filter(extraction => extraction.moon_id == moonID)[0];
      let chunkArrivalTime = new Date(moonExtraction.chunk_arrival_time);
      let now = new Date();
      var diff = new DateDiff(chunkArrivalTime, now);
      return { "moonExtraction": moonExtraction, "moon": moon, "hrsRemaining": diff.hours() };
    });


    let schedule = moonData.map(data => {
      let string = '';
      let ores = moonJson
        .filter(json => json.name === data.moon.name)
        .map(json => { return {"product":json.product, "quantity":json.quantity}});
      
      let chunkArrivalTime = new Date(data.moonExtraction.chunk_arrival_time);
      let extractionStartTime = new Date(data.moonExtraction.extraction_start_time);
      var diff = new DateDiff(chunkArrivalTime, extractionStartTime);

      string += `in ${data.hrsRemaining} hrs:`;
      string += `\n\t${data.moon.name}\n\t\t`;
      string += ores.map(ore => `${Utilities.FormatNumberForDisplay(ore.quantity * diff.hours() * EXTRACTION_AMOUNT_PER_HOUR)} m3 ${ore.product}`).join('\n\t\t');
  
      string = `\`\`\`${string}\`\`\``;
  
      return  { value: string, remaining: data.hrsRemaining };
    });
    
    if(search != '') {
      let re = new RegExp(search, 'i');
      schedule = schedule.filter(string => re.test(string.value));
    }
    
    schedule.sort((a, b) => (Number.parseFloat(a.remaining) - Number.parseFloat(b.remaining)));

    return schedule.map(m => m.value).join('\n');;
  });
}

module.exports = {
  GetOwnedMoons:GetOwnedMoons,
  GetActiveMoons:GetActiveMoons,
  GetScheduledMoons:Scheduled,
  GetInactiveMoons:GetInactiveMoons,
  Announce:ScheduledToday,
  GetOrePrices:getOwnedOrePrices
};