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
console.log(extraction);
      extractionStartTime = Date.parse(extraction.extraction_start_time);
      chunkArrivalTime = Date.parse(extraction.chunk_arrival_time);
      naturalDecayTime = Date.parse(extraction.natural_decay_time);
      moonID = extractions.moon_id;

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
      console.log(element)
      if(!element.moon)
        return '';
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
      var arrivalTime = new Date(result.chunk_arrival_time);
      if(arrivalTime < new Date(Date.now())) {
        console.log(`Updating extraction ${extraction}`)
        return DB.ExtractionAdd(extraction);
      }
    });
}

function refreshExtractionsData(extractions) {
  return Promise.map(extractions, extraction => refreshExtractionData(extraction).then(x => DB.ExtractionGet(extraction)));
}

/**
 * Gets a promise to return info about currently mined moons.
 * @param {*Promise} getObserversPromise The observers promise.
 * @param {*Promise} getObservedPromise The observed promise.
 * @param {*Promise} getUniqueVolumesPromise The unique volumes promise.
 * @param {*Promise} getObserverStructuresPromise The structures promise.
 */
function getChunksMinedPromise(getObserversPromise, getObservedPromise, getUniqueVolumesPromise, getObserverStructuresPromise, extractionsPromise) {
  return Promise.join(getObserversPromise, getObservedPromise, getUniqueVolumesPromise, getObserverStructuresPromise, extractionsPromise, 
    (observers, observed, uniqueVolumes, observerStructures, extractionsInProgress) => {

    var extractionData = [];
    extractionsInProgress.forEach((extraction, index) => {
      //var miningStart = new Date(extraction.chunk_arrival_time);
      //var miningEnd = new Date(extraction.natural_decay_time);
    var miningStart = new Date(extraction.chunk_arrival_time);
    var miningEnd = miningStart.setDate(miningStart.getDate() + 3); //mining lasts 3 days

      var observerIndex = observers.map(observer => observer.observer_id).indexOf(extraction.structure_id);

      var observedDuringExtraction = observed[observerIndex].filter(record => {
        var recordDate = new Date(record.last_updated);
        return (recordDate < miningEnd && recordDate > miningStart);
      });

      var staticOres = Config.moons.find(moon => {
        return moon.id == extraction.moon_id;
      }).ores;

      extractionData.push({
        moon_id: extraction.moon_id,
        structure_id: extraction.structure_id,
        name: observerStructures[observerIndex].name,
        extraction_start_time: extraction.extraction_start_time,
        chunk_arrival_time: extraction.chunk_arrival_time,
        natural_decay_time: extraction.natural_decay_time, 
        extracted: observedDuringExtraction,
        ores: staticOres
      });
    });

    extractionData.sort((x, y) => {
      return Date.parse(x.natural_decay_time) > Date.parse(y.natural_decay_time);
    });

    var outputInfo = extractionData.map(moon => {
      var extractionStartTime = Date.parse(moon.extraction_start_time);
      var chunkArrivalTime = Date.parse(moon.chunk_arrival_time);
      var naturalDecayTime = Date.parse(moon.natural_decay_time);
      var x = new Date(moon.chunk_arrival_time);
      var miningEnd = x.setDate(x.getDate() + 3); //mining lasts 3 days

      var mineableVolume = Math.round((chunkArrivalTime - extractionStartTime)/60000/60*20000);

      var extractedVolume = moon.extracted.reduce((accu, curr) => {
        var item = uniqueVolumes.find(x => x.type_id === curr.type_id)
        return Math.round(accu + (item.volume * curr.quantity));
      }, 0);

      var mineableByType = [];
      
      moon.ores.forEach(type => {
        var name = type.ore;
        var mineable = Math.round(type.amount*mineableVolume);
        var type = uniqueVolumes.find(x => x.name === name);
        var volume = type.volume;
        var typeId = type.type_id;
        var mined = moon.extracted.filter(x => x.type_id == typeId)
          .reduce((accu, curr) => {
            return Math.round(accu + (volume * curr.quantity));
          }, 0);
         
        mineableByType.push({ore:name, mineable:mineable, mined:mined})
      });
      
      var oreBreakdownString = mineableByType.map(x => {
        return `\t${x.ore}: ${x.mined}/${x.mineable} m3 (${Math.round(x.mined/x.mineable*100,2)}%)`;
      }).join('\n');

      var now = new Date();
      var remaining = Math.round((x - now)/60000/60);

      var expired = miningEnd < new Date(Date.now()) ? '(EXPIRED)' : `(${remaining}h remain)`;

      return output = '```'+`${moon.name} ${expired}: ${extractedVolume}/${mineableVolume} m3 (${Math.round(extractedVolume/mineableVolume*100,2)}%)\n${oreBreakdownString}`+'```';
    });

    return outputInfo.join('\n');
  });
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
  let getLatestExtractions = getExtractions.then(refreshExtractionsData);

  return getChunksMinedPromise(getObservers, getObserved, getUniqueVolumes, getObserverStructures, getLatestExtractions);
}

module.exports = {
  GetMoonStatusText:getMoonStatusText,
  GetChunksMined:getChunksMined
}
