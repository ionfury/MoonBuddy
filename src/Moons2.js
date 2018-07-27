let Config = require(`../config.json`);
let Promise = require('bluebird');
let Accessors = require(`./Accessors.js`);
let Api = require(`./Api.js`);
let dateFormat = require('dateformat');
let DB = require(`./db.js`);
let DateDiff = require(`date-diff`);
let Utilities = require (`./Utilities.js`);

let MINING_DURATION_DAYS = 25;
let EXTRACTION_AMOUNT_PER_HOUR = 20000;

var process = {
  env: {
    client_id:'20d390444f79404ea527fdb4297b14ac',
    client_secret:'2OZcJZAkWUTqN6WqwQYTx69cygdgfqRdNk9egTKX',
    database_password:'-c!4PP&4XxpzLx$k',
    database_username:'alcoholocaust',
    refresh_token:'fcnoTpeSqIixyHBokdy9iwW7FK0nZ9usQe-pmcJzbhJ9fk0Hrp86teRQtKuIbB-n0',
    token:'Mzc3MjMyNDQ5MjU3NjAzMDcy.DOKC-g.NQMZc_cTu9vwt_5i-uAO1dP6ho0',
    database_connection_string:'ds113606.mlab.com:13606/moons'
  }
};


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

    moonData = moonData.sort((a, b) => a.hrsRemaining > b.hrsRemaining);

    let scheduleString = moonData.map(data => {
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
  
      return string;
    });
    
    if(search != '') {
      let re = new RegExp(search, 'i');
      scheduleString = scheduleString.filter(string => re.test(string));
    }

    return scheduleString;
  });
}

module.exports = {
  GetOwnedMoons:GetOwnedMoons,
  GetActiveMoons:GetActiveMoons,
  GetScheduledMoons:GetScheduledMoons,
  GetInactiveMoons:GetInactiveMoons,
  Test:Test
};