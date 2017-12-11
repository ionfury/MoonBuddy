let Config = require(`../config.json`);
let Promise = require('bluebird');
let Api = require(`./Api.js`);
let dateFormat = require('dateformat');
let DB = require(`./db.js`);

/**
 * Gets a promise to return an access token.
 * @param {string} refreshToken The refresh token.
 * @returns A RequestPromise.
 */
function getAccessTokenPromise(refreshToken) {
  return Api.RefreshToken(refreshToken)
    .then(x => x.access_token);
}

/**
 * Gets a promise to return extractions.
 * @param {string} accessToken The access token.
 * @returns A RequestPromise.
 */
function getExtractionPromise(accessToken) {
  return Api.EsiGet({token:accessToken, route:`corporation/${Config.corporation_id}/mining/extractions/`})
    .then(JSON.parse);
}

/**
 * Gets a promise to return extraction structures
 * @param {Promise} accessTokenPromise The access token promise.
 * @param {Promise} extractionsPromise the extractions promise.
 * @returns A RequestPromise.
 */
function getExtractionStructuresPromise(accessTokenPromise, extractionsPromise) {
  return Promise.join(accessTokenPromise, extractionsPromise, (accessToken, extractions) => {
    var promises = [];
    
    extractions.forEach(extractor => 
      promises.push(
        Api.EsiGet({token:accessToken, route:`universe/structures/${extractor.structure_id}/`})
        .then(JSON.parse)));

    return Promise.all(promises);
  });
}

/**
 * Gets a promise to return observers.
 * @param {string} accessToken The access token.
 * @returns A RequestPromise.
 */
function getObserversPromise(accessToken) {
  return Api.EsiGet({token:accessToken, route:`corporation/${Config.corporation_id}/mining/observers/`})
    .then(JSON.parse);
}

/**
 * Gets a promise to return observed information
 * @param {Promise} accessTokenPromise The access token promise.
 * @param {Promise} observersPromise the observers promise.
 * @returns A RequestPromise.
 */
function getObservedPromise(accessTokenPromise, observersPromise) {
  return Promise.join(accessTokenPromise, observersPromise, (accessToken, observers) => 
  {
    var promises = [];
    
    observers.forEach(observer => 
      promises.push(Api.EsiGet({token:accessToken, route:`corporation/${Config.corporation_id}/mining/observers/${observer.observer_id}/`})
        .then(JSON.parse)));

    return Promise.all(promises);
  });
}

/**
 * Gets a promise to return unique volumes of observed info
 * @param {Promise} accessTokenPromise The access token promise.
 * @param {Promise} observedPromise the observed promise.
 * @returns A RequestPromise.
 */
function getUniqueVolumesPromise(accessTokenPromise, observedPromise) {
  return Promise.join(accessTokenPromise, observedPromise, (accessToken, observed) => {
    var flattened = observed.reduce((prev, curr) => prev.concat(curr))

    var uniqueTypes = [...new Set(flattened.map(item => item.type_id))];
    
    return Promise.map(uniqueTypes, type => Api.EsiGet({token:accessToken, route:`universe/types/${type}`}).then(JSON.parse));
  });
}

/**
 * Gets a promise to return structure info for observers
 * @param {*Promise} accessTokenPromise The access token promise.
 * @param {*Promise} observersPromise the observers promise.
 * @returns A RequestPromise.
 */
function getObserverStructuresPromise(accessTokenPromise, observersPromise) {
  return Promise.join(accessTokenPromise, observersPromise, (accessToken, observers) => {
    var promises = [];

    observers.forEach(observer => 
      promises.push(
        Api.EsiGet({token:accessToken, route:`universe/structures/${observer.observer_id}/`})
          .then(JSON.parse)));

    return Promise.all(promises);
  });
}

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

function refreshExtractionData(extraction) {
  return DB.ExtractionGet(extraction)
    .then(result => {
      // first case insert extraction
      if(!result) {
        console.log(`Adding first extraction ${extraction}`)
        return DB.ExtractionAdd(extraction);
      }
      // moon chunk has arrived, add new extraction
      var arrivalTime = new Date(extraction.chunk_arrival_time);
      if(arrivalTime < new Date(Date.now())) {
        console.log(`Updating extraction ${extraction}`)
        return DB.ExtractionAdd(extraction);
      }
    });
}

function getObserverExtractions(observer, extractions) {
  let extractionIndex = extractions.map(extraction => extraction.structure_id).indexOf(observer.observer_id);

  if(extractionIndex < 0) // no current extraction
    return DB.ExtractionGet({structure_id: observer.observer_id});
  else // get and refresh current extraction
    return refreshExtractionData(extractions[extractionIndex])
      .then(x => DB.ExtractionGet(extractions[extractionIndex]));
}

function refreshExtractionsData(getAccessToken, getObservers, getExtractions) {
  return Promise.join(getAccessToken, getObservers, getExtractions, (accessToken, observers, extractions) => {
    return Promise.map(observers, observer => getObserverExtractions(observer, extractions))
  });
  
 // return Promise.map(extractions, extraction => refreshExtractionData(extraction).then(x => DB.ExtractionGet(extraction)));
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
function getChunksMinedPromise(getObserversPromise, getObservedPromise, getUniqueVolumesPromise, getObserverStructuresPromise, currentExtractionPromise, storedExtractionPromise, activeOnly = 0) {
  return Promise.join(getObserversPromise, getObservedPromise, getUniqueVolumesPromise, getObserverStructuresPromise, currentExtractionPromise, storedExtractionPromise, 
    (observers, observed, uniqueVolumes, observerStructures, extractions, extractionProgress) => {
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

        return (differenceInDays(recordDate, miningStart) <= 3 && differenceInDays(recordDate, miningStart) <= 3);
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
      return Date.parse(x.natural_decay_time) > Date.parse(y.natural_decay_time);
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

      let expireTimeString = (new Date(miningEnd) > now && new Date(chunkArrivalTime) < now) ? `**${remaining || ""}**h remains` : `**EXPIRED**`;
      let minedString = `**${pretty(extractedVolume) || ""}**/**${pretty(mineableVolume) || ""}** m3`;
      let percentString = `**${Math.round(extractedVolume/mineableVolume*100,2) || ""}**%`;
      let nextTimeString = `(**NO EXTRACTION**)`;
      
      if(isExtracting)
        nextTimeString = `${arrival} (**${until}** h)`;

      return `${moon.name || ""}: ${expireTimeString || ""} - ${minedString || ""} (${percentString || ""} done) - next @${nextTimeString || ""}` + '```' + `\n${oreBreakdownString || ""}` + '```';
    });

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
  let getLatestExtractions = refreshExtractionsData(getAccessToken, getObservers, getExtractions);
  //let getLatestExtractions = getExtractions.then(refreshExtractionsData);

  return getChunksMinedPromise(getObservers, getObserved, getUniqueVolumes, getObserverStructures, getExtractions, getLatestExtractions);
}

function getActiveMoons() {
  let getAccessToken = getAccessTokenPromise(process.env.refresh_token);
  let getObservers = getAccessToken.then(getObserversPromise);
  let getExtractions = getAccessToken.then(getExtractionPromise);
  let getObserved = getObservedPromise(getAccessToken, getObservers);
  let getUniqueVolumes = getUniqueVolumesPromise(getAccessToken, getObserved);
  let getObserverStructures = getObserverStructuresPromise(getAccessToken, getObservers);
  let getLatestExtractions = refreshExtractionsData(getAccessToken, getObservers, getExtractions);
  //let getLatestExtractions = getExtractions.then(refreshExtractionsData);

  return getChunksMinedPromise(getObservers, getObserved, getUniqueVolumes, getObserverStructures, getExtractions, getLatestExtractions, 1);
}

module.exports = {
  GetMoonStatusText:getMoonStatusText,
  GetChunksMined:getChunksMined,
  GetActiveMoons:getActiveMoons
}
