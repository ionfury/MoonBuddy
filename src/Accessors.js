let Config = require(`../config.json`);
let Promise = require('bluebird');
let Api = require(`./Api.js`);

module.exports = {
  GetAccessTokenPromise:getAccessTokenPromise,
  GetExtractionsPromise:getExtractionsPromise,
  GetExtractionStructuresPromise:getExtractionStructuresPromise,
  GetObserversPromise:getObserversPromise,
  GetObservedPromise:getObservedPromise,
  GetUniqueVolumesPromise:getUniqueVolumesPromise,
  GetObserverStructuresPromise:getObserverStructuresPromise,
  GetMarketHubInfo:getMarketHubInfo
}

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
function getExtractionsPromise(accessToken) {
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


function getFuzzworkMarketDataPromise(stationID, typeID) {

  var options = {
    method: 'GET',
    url: `https://market.fuzzwork.co.uk/aggregates/?station=${stationID}&types=${typeID}`
  }

  return RequestPromise(options).then(JSON.parse);
}


function getTypeInfoPromise(typeID) {
  let options = {
    route: `universe/types/${typeID}`
  };

  return Api.EsiGet(options).then(JSON.parse);
}


function getItemIDStrictPromise(item) {
  let options = {
    route:'search',
    parameters: `categories=inventory_type&search=${item}&strict=true`
  }

  return Api.EsiGet(options)
    .then(JSON.parse)
    .then(res => {
      if(!res.inventory_type) 
        return getItemIDPromise(item);
      else
        return res.inventory_type.shift();
    });
}

function getItemIDPromise(item) {
  let options = {
    route:'search',
    parameters: `categories=inventory_type&search=${item}`
  }

  return Api.EsiGet(options)
    .then(JSON.parse)
    .then(res => {
      if(!res.inventory_type) 
        throw new Error(`Inventorytype not found for '${item}'!`);
      else
        return res.inventory_type.shift();
    });
}


function getMarketHubInfo(system, item) {
  var stationID = 0;
  switch(system) {
    case 'jita':
      stationID = 60003760;
      break;
    case 'amarr':
      stationID = 60008494;
      break;
    case 'dodixie':
      stationID = 60011866;
      break;
    case 'rens':
      stationID = 60004588;
      break;
    case 'hek':
      stationID = 60005686;
      break;
  }
  let getItemID = getItemIDStrictPromise(item);
  let getTypeInfo = getItemID.then(getTypeInfoPromise);
  let getFuzzworkMarketData = getItemID.then(itemID => getFuzzworkMarketDataPromise(stationID, itemID));

  return Promise.join(getTypeInfo, getFuzzworkMarketData, (typeInfo, marketData) => {
    return {
      name: typeInfo.name,
      id: typeInfo.type_id,
      volume: typeInfo.volume,
      buy: marketData[typeInfo.type_id].buy.max,
      buyVolume: marketData[typeInfo.type_id].buy.volume,
      sell: marketData[typeInfo.type_id].sell.min,
      sellVolume: marketData[typeInfo.type_id].sell.volume
    };
  });
}
