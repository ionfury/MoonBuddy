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
  GetObserverStructuresPromise:getObserverStructuresPromise
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

    console.log(extractions);
    
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
