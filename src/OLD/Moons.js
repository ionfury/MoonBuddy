let Config = require(`../config.json`);
let Promise = require('bluebird');
let Api = require(`./Api.js`);
let dateFormat = require('dateformat');
let DB = require(`./db.js`);

let MINING_DURATION_DAYS = 25;
let EXTRACTION_AMOUNT_PER_HOUR = 20000;



/**
 * Gets a promise to return json info about current moons.
 * @param {*Promise} accessTokenPromise The access token promise.
 * @param {*Promise} extractionsPromise The extraction Promise.
 * @param {*Promise} extractionStructuresPromise The extraction structures promise.
 * @returns A request promise.
 */
function getMoonStatusPromise(accessTokenPromise, extractionsPromise, extractionStructuresPromise) {
  return Promise.join(accessTokenPromise, extractionsPromise, extractionStructuresPromise, (accessToken, extractions, extractionStructures) => {
    return extractionStructures.map((structure, index) => {
      var extraction = extractions[index];
      
      extractionStartTime = Date.parse(extraction.extraction_start_time);
      chunkArrivalTime = Date.parse(extraction.chunk_arrival_time);
      naturalDecayTime = Date.parse(extraction.natural_decay_time);
      moonID = extraction.moon_id;

      var minedVolume = Math.round((chunkArrivalTime - extractionStartTime)/60000/60*20000);
      var arrival = dateFormat(chunkArrivalTime, "mm-dd h:MM");
      var now = new Date();
      var remaining = Math.round((chunkArrivalTime - now)/60000/60);

      var displayString = `${structure.name} - ${minedVolume.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} m3 @ ${arrival} (${remaining}h)`;
      
      var moon = Config.moons.find(moon => {
        return moon.id == moonID;
      });

      return {"displayString":displayString, "remaining":remaining, "moon":moon, "volume": minedVolume};
    })
    .sort((a, b) => {
      return a.remaining - b.remaining;
    })
    .map(element => {
      var ores = element.moon.ores.map(ore => `${ore.ore} - ${Math.round(ore.amount*100,2)}% (${Math.round(ore.amount*element.volume,2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} m3)`).reduce((acc, val) => acc + `\n\t${val}`);
      var display = `\`\`\`${element.displayString}\n\t${ores}\`\`\``;
      return display;
    });
  });
}

function refreshObserverExtractions(observer, extractions, date) {
  let extractionIndex = extractions.map(extraction => extraction.structure_id).indexOf(observer.observer_id);
  let method = DB.ExtractionsStructureGet;

  if(date)
    method = DB.ExtractionsStructureDateGet;

  if(extractionIndex < 0)
    return method(observer.observer_id, date);
  else
    return DB.ExtractionAdd(extractions[extractionIndex])
      .then(x => method(observer.observer_id, date));
}

function refreshExtractionsData(getObservers, getExtractions, date) {
  return Promise.join(getObservers, getExtractions, (observers, extractions) => {
    return Promise.map(observers, observer => refreshObserverExtractions(observer, extractions, date))
      .then(x => x.filter(n => n)); // remove empty results from array
  });
}

function differenceInDays(d0, d1) {
  // Copy dates so don't affect originals
  d0 = new Date(+d0);
  d1 = new Date(+d1);

  // Set to noon
  d0.setHours(12,0,0,0);
  d1.setHours(12,0,0,0);

  // Get difference in whole days, divide by milliseconds in one day
  // and round to remove any daylight saving boundary effects
  return Math.round((d1-d0) / 8.64e7)
}

/**
 * Gets a promise to return info about currently mined moons.
 * @param {*Promise} getObserversPromise The observers promise.
 * @param {*Promise} getObservedPromise The observed promise.
 * @param {*Promise} getUniqueVolumesPromise The unique volumes promise.
 * @param {*Promise} getObserverStructuresPromise The structures promise.
 */
function getChunksMinedPromise(getObserversPromise, getObservedPromise, getUniqueVolumesPromise, getObserverStructuresPromise, currentExtractionPromise, storedExtractionPromise, getMoonStructuresPromise, activeOnly = 0) {
  return Promise.join(getObserversPromise, getObservedPromise, getUniqueVolumesPromise, getObserverStructuresPromise, currentExtractionPromise, storedExtractionPromise, getMoonStructuresPromise,
    (observers, observed, uniqueVolumes, observerStructures, extractions, extractionProgress, moonStructures) => {
    console.log(observers.length, observerStructures.length, extractions.length, extractionProgress.length);

    var extractionData = [];
    
    // compile data for each extraction
    extractionProgress.forEach((extraction, index) => {
      if(!extraction) return;

      var miningStart = new Date(extraction.chunk_arrival_time);
      var miningEnd = new Date(extraction.chunk_arrival_time);
      miningEnd = miningEnd.setDate(miningEnd.getDate() + 3); //mining lasts 3 days

      var observerIndex = observers.map(observer => observer.observer_id).indexOf(extraction.structure_id);

      var observedDuringExtraction = observed[observerIndex].filter(record => {
        let recordDate = new Date(record.last_updated);

        return (differenceInDays(recordDate, miningStart) <= 2 && differenceInDays(recordDate, miningStart) <= 2);
      });

      var staticOres = Config.moons.find(moon => {
        return moon.id == extraction.moon_id;
      }).ores;

      let nextArrival = extractions.find(next => next.structure_id == extraction.structure_id);
      let nextArrivalTime = "";

      if(nextArrival)
        nextArrivalTime = nextArrival.chunk_arrival_time;

      extractionData.push({
        moon_id: extraction.moon_id,
        structure_id: extraction.structure_id,
        name: observerStructures[observerIndex].name,
        extraction_start_time: extraction.extraction_start_time,
        chunk_arrival_time: extraction.chunk_arrival_time,
        natural_decay_time: extraction.natural_decay_time, 
        extracted: observedDuringExtraction,
        ores: staticOres,
        nextChunkArrivalTime: nextArrivalTime
      });
    });

    // sort data by x
    extractionData.sort((x, y) => {
      var z = Date.parse(x.natural_decay_time) > Date.parse(y.natural_decay_time);
      if(!z)
        z = false;
      return z;
    });

    //filter actives if needed
    if(activeOnly == 1) {
      extractionData = extractionData.filter(moon => {
        try {
          var chunkArrivalTime = Date.parse(moon.chunk_arrival_time);
          var x = new Date(moon.chunk_arrival_time);
          var miningEnd = x.setDate(x.getDate() + 3); //mining lasts 3 days
          var now = new Date();
          return (new Date(miningEnd) > now && new Date(chunkArrivalTime) < now);
        }
        catch (e) {
          return false;
        }
      });
    }

    var mined = extractionData.map(moon => {
      var extractionStartTime = Date.parse(moon.extraction_start_time);
      var chunkArrivalTime = Date.parse(moon.chunk_arrival_time);
      var naturalDecayTime = Date.parse(moon.natural_decay_time);
      let isExtracting = moon.nextChunkArrivalTime == "" ? false:true;
      var nextChunkArrivalTime = Date.parse(moon.nextChunkArrivalTime);
      var x = new Date(moon.chunk_arrival_time);
      var miningEnd = x.setDate(x.getDate() + 3); //mining lasts 3 days

      var mineableVolume = Math.round((chunkArrivalTime - extractionStartTime)/60000/60*20000);

      var extractedVolume = moon.extracted.reduce((accu, curr) => {
        var item = uniqueVolumes.find(x => x.type_id === curr.type_id)
        if(item)
          return Math.round(accu + (item.volume * curr.quantity));
        else {
          console.log(`no item found for typeid ${curr.type_id}`)
          return 0;
        }
      }, 0);

      var mineableByType = [];
      
      moon.ores.forEach(type => {
        try {
          var name = type.ore;
          var mineable = Math.round(type.amount*mineableVolume);
          var type = uniqueVolumes.find(x => x.name === name);
          var volume = type.volume;
          var typeId = type.type_id;
          var matchingTypes = Config.ores.find(x => x.ore === type.name);

          //var mined = moon.extracted.filter(x => x.type_id == typeId)
          var mined = moon.extracted.filter(x => matchingTypes.types.some(y => x.type_id == y))
            .reduce((accu, curr) => {
              return Math.round(accu + (volume * curr.quantity));
            }, 0);
          
          mineableByType.push({ore:name, mineable:mineable, mined:mined})
        } catch (e) {
          console.log(e);
        }
      });
      
      var oreBreakdownString = mineableByType.map(x => {
        return `\t${x.ore}: ${pretty(x.mined)}/${pretty(x.mineable)} m3 (${Math.round(x.mined/x.mineable*100,2)}%)`;
      }).join('\n');

      var now = new Date();
      var remaining = Math.round((x - now)/60000/60);
      var arrival = dateFormat(nextChunkArrivalTime, "mm-dd h:MM");
      var now = new Date();
      var until = Math.round((nextChunkArrivalTime - now)/60000/60);

      let expireTimeString = (new Date(miningEnd) > now && new Date(chunkArrivalTime) < now) ? `**${remaining}**h remains` : `**EXPIRED**`;
      let minedString = `**${pretty(extractedVolume)}**/**${pretty(mineableVolume)}** m3`;
      let percentString = `**${Math.round(extractedVolume/mineableVolume*100,2)}**%`;
      let nextTimeString = `(**NO EXTRACTION**)`;
      
      if(isExtracting)
        nextTimeString = `${arrival} (**${until}** h)`;

      return `${moon.name}: ${expireTimeString} - ${minedString} (${percentString} done) - next @${nextTimeString}` + '```' + `\n${oreBreakdownString}` + '```';
    });

    if(!mined || mined === "")
      mined = `No information found.`;

    return mined;
  });
}

function pretty(number) {
  let length = Math.round(number).toString().length;
  let pretty = ``;

  if(length <= 3)
    pretty = number.toString();
  else if(4 <= length && length <= 6)
    pretty = `${Math.round(number/1000 * 10) / 10}k`; //thousands
  else if(7 <= length && length <= 9)
    pretty = `${Math.round(number/1000000 * 10) / 10}m`; //millions
  else if(10 <= length && length <= 12)
    pretty = `${Math.round(number/1000000000 * 10) / 10}b`; //billions
  else if(11 <= length && length <= 15)
    pretty = `${Math.round(number/1000000000000 * 10) / 10}t`; //trillions
  else
    pretty = `lol`;

  return pretty;
}

/**
 * Gets information about current status of moons.
 * @returns Moon status text.
 */
function getMoonStatusText() {
  let getAccessToken = getAccessTokenPromise(process.env.refresh_token);
  let getObservers = getAccessToken.then(getObserversPromise);
  let getObserverStructures = getObserverStructuresPromise(getAccessToken, getObservers);
  let getExtractions = getAccessToken.then(getExtractionPromise);
  let getExtractionStructures = getExtractionStructuresPromise(getAccessToken, getExtractions);

  return getMoonStatusPromise(getAccessToken, getExtractions, getExtractionStructures);
}

/**
 * Gets information about the moon chunks currently being mined. 
 * @returns Moon chunks text.
 */
function getChunksMined(){
  let getAccessToken = getAccessTokenPromise(process.env.refresh_token);
  let getObservers = getAccessToken.then(getObserversPromise);
  let getExtractions = getAccessToken.then(getExtractionPromise);
  let getObserved = getObservedPromise(getAccessToken, getObservers);
  let getUniqueVolumes = getUniqueVolumesPromise(getAccessToken, getObserved);
  let getObserverStructures = getObserverStructuresPromise(getAccessToken, getObservers);
  let getLatestExtractions = refreshExtractionsData(getObservers, getExtractions);
  let getMoonStructures = getMoonStructuresPromise(getObserverStructures, getLatestExtractions);
  //let getLatestExtractions = getExtractions.then(refreshExtractionsData);

  return getChunksMinedPromise(getObservers, getObserved, getUniqueVolumes, getObserverStructures, getExtractions, getLatestExtractions);
}

function getActiveMoons() {
  let now = new Date();
  let getAccessToken = getAccessTokenPromise(process.env.refresh_token);
  let getObservers = getAccessToken.then(getObserversPromise);
  let getExtractions = getAccessToken.then(getExtractionPromise);
  let getObserved = getObservedPromise(getAccessToken, getObservers);
  let getUniqueVolumes = getUniqueVolumesPromise(getAccessToken, getObserved);
  let getObserverStructures = getObserverStructuresPromise(getAccessToken, getObservers);
  let getCompletedExtractions = refreshExtractionsData(getObservers, getExtractions, now);
  let getMoonStructures = getMoonStructuresPromise(getObserverStructures, getCompletedExtractions);

  return getActiveMoonsPromise(getObservers, getObserved, getUniqueVolumes, getCompletedExtractions, getMoonStructures);
  //return getChunksMinedPromise(getObservers, getObserved, getUniqueVolumes, getObserverStructures, getExtractions, getLatestExtractions, getMoonStructures, 1);
}

function getActiveMoonsPromise(getObserversPromise, getObservedPromise, getUniqueVolumesPromise, getCompletedExtractionsPromise, getMoonStructuresPromise) {
  return Promise.join(getObserversPromise, getObservedPromise, getUniqueVolumesPromise, getCompletedExtractionsPromise, getMoonStructuresPromise, 
    (observers, observed, uniqueVolumes, completedExtractions, moonStructures) => {

    // Filter to only current extractions
    let activeExtractions = completedExtractions.filter(extraction => {
      let miningStart = new Date(extraction.chunk_arrival_time);
      let miningEnd = new Date(extraction.chunk_arrival_time);
      miningEnd = miningEnd.setDate(miningEnd.getDate() + MINING_DURATION_DAYS);

      return new Date() < new Date(miningEnd) && new Date() > new Date(miningStart);
    });

    //Find ores for extraction
    activeExtractions = activeExtractions.map(extraction => {
      let extractableOres = moonStructures
        .filter(moon => moon.structure_id == extraction.structure_id);
        
      let mineableOres = extractableOres
        .map(moon => { return {product:moon.product, quantity:moon.quantity, typeID: moon.typeID}; });

      extraction.mineableOres = mineableOres;

      return extraction;
    });

    //Step through extractions and set data
    activeExtractions = activeExtractions.map(extraction => {
      let extractionStartTime = new Date(extraction.extraction_start_time);
      let chunkArrivalTime = new Date(extraction.chunk_arrival_time);
      let naturalDecayTime = new Date(extraction.natural_decay_time);
      let observer = observers.find(observer => observer.observer_id = extraction.structure_id);
      let observations = observed[observers.indexOf(observer)];

      let structure = moonStructures.find(structure => structure.moonID == extraction.moon_id);
      
      extraction.name = structure ? structure.name : "";

      //Get the volume of each ore type
      extraction.mineableOres = extraction.mineableOres.map(ore => {
        let item = uniqueVolumes.find(item => item.type_id == ore.typeID);
        if(!item)
          console.log(`issue with ${ore.typeID}`)
        else
          ore.volume = item.volume;

        return ore;
      });
      
      extraction.mineableVolume = Math.round((chunkArrivalTime - extractionStartTime)/60000/60*EXTRACTION_AMOUNT_PER_HOUR);

      //Get the total quantity mined of each ore and it's associated types
      extraction.mineableOres = extraction.mineableOres.map(ore => {
        let relatedOres = Config.ores.find(related => related.ore === ore.product);

        let totalQuantityMined = observations.filter(observation => relatedOres.types.some(typeID => observation.type_id == typeID));
        let boundedQuantityMined = totalQuantityMined.filter(observation => 
          {
            return new Date(observation.last_updated) > chunkArrivalTime
          });
        ore.quantityMined = boundedQuantityMined.reduce((prev, curr) => prev + curr.quantity, 0);
        ore.quantityMineable = Math.round(extraction.mineableVolume * ore.quantity);
        
        return ore;
      });

      return extraction;
    });

    console.log(activeExtractions)
    
    let messages = activeExtractions.map(extraction => {
      return extraction.name;
    });
    
    console.log(messages);

    //return `${moon.name}: ${expireTimeString} - ${minedString} (${percentString} done) - next @${nextTimeString}` + '```' + `\n${oreBreakdownString}` + '```';
    
    /*
    var oreBreakdownString = mineableByType.map(x => {
      return `\t${x.ore}: ${pretty(x.mined)}/${pretty(x.mineable)} m3 (${Math.round(x.mined/x.mineable*100,2)}%)`;
    }).join('\n');
*/
    //var now = new Date();
    //var remaining = Math.round((x - now)/60000/60);
    //var arrival = dateFormat(nextChunkArrivalTime, "mm-dd h:MM");
    //var now = new Date();
    //var until = Math.round((nextChunkArrivalTime - now)/60000/60);

    //let expireTimeString = (new Date(miningEnd) > now && new Date(chunkArrivalTime) < now) ? `**${remaining}**h remains` : `**EXPIRED**`;
    //let minedString = `**${pretty(extractedVolume)}**/**${pretty(mineableVolume)}** m3`;
    //let percentString = `**${Math.round(extractedVolume/mineableVolume*100,2)}**%`;
    //let nextTimeString = `(**NO EXTRACTION**)`;
    
    //if(isExtracting)
    //  nextTimeString = `${arrival} (**${until}** h)`;

    //return `${moon.name}: ${expireTimeString} - ${minedString} (${percentString} done) - next @${nextTimeString}` + '```' + `\n${oreBreakdownString}` + '```';


    



  });
}



function getOwnedMoonsPromise(find, getLatestExtractionsPromise, getMoonStructuresPromise) {
  return Promise.join(getLatestExtractionsPromise, getMoonStructuresPromise, (latestExtractions, moonStructures) => {
    let moonInfo = [];
    let moons = Config.moons;    
    let uniqueMoons = [...new Set(moons.map(moon => moon.moonID))];

    uniqueMoons.forEach(uniqueMoon => {
      let ores = [];
      let moonName = "";
      let structure;
      let extraction = "";
      let structureExists = false;
      
      ores = moons.filter(moon => moon.moonID == uniqueMoon).map(ore => {return {product:ore.product, quantity:ore.quantity}});
      moonName = moons.find(moon => moon.moonID == uniqueMoon).name;
      structureExists = moonStructures.some(moonStructure => moonStructure.moonID == uniqueMoon && moonStructure.structure_id != "");

      var oreString = ores.map(ore => `${ore.product}: ${Math.round(ore.quantity * 100)}%`).join(', ');
      moonInfo.push(`${structureExists ? '**TOWERED** ' : ''}${moonName}: ${oreString}`);
    });

    moonInfo.sort();
    
    return moonInfo.filter(info => info.includes(find));
  });
}

function getMoonStructuresPromise(getObserverStructuresPromise, getLatestExtractions) {
  return Promise.join(getObserverStructuresPromise, getLatestExtractions, 
    (observerStructures, latestExtractions) => {
      let moons = Config.moons;

      return moons.map(moon => {
        let structure = latestExtractions.find(extraction => extraction.moon_id == moon.moonID);
        moon.structure_id = !structure ? '' : structure.structure_id;
        return moon;
      });
    });
}


  /*
  Commands:
    Owned <find>
    Active
    Extractions
    Moon <moon>
    Player <player>
  */
  function getOwnedMoons(find) {
    let getAccessToken = getAccessTokenPromise(process.env.refresh_token);
    let getObservers = getAccessToken.then(getObserversPromise);
    let getObserverStructures = getObserverStructuresPromise(getAccessToken, getObservers);
    let getExtractions = getAccessToken.then(getExtractionPromise);
    let getLatestExtractions = refreshExtractionsData(getObservers, getExtractions);
    let getMoonStructures = getMoonStructuresPromise(getObserverStructures, getLatestExtractions);

    return getOwnedMoonsPromise(find, getLatestExtractions, getMoonStructures);
  }

  /*
function getExtractionsPromise() {

}

function getMoonHistoryPromise(moon) {

}

function getPlayerHistoryPromise(player) {

}
*/


















module.exports = {
  GetMoonStatusText:getMoonStatusText,
  GetChunksMined:getChunksMined,
  GetActiveMoons:getActiveMoons,
  GetOwnedMoons:getOwnedMoons
}
