let Promise = require('bluebird');

let Config = require('../../data/config.json');
let Esi = require('./esi.js');

module.exports = {
  /**
   * Gets a promise to return observers.
   * @param {string} accessToken The access token.
   * @returns A RequestPromise.
   */
  Get: (token) => {
    return Esi.Get({
      token:token, 
      route:`corporation/${Config.corporation_id}/mining/observers/`
    });
  },

  /**
   * Gets a promise to return observed information
   * @param {Promise} accessTokenPromise The access token promise.
   * @param {Promise} observersPromise the observers promise.
   * @returns A RequestPromise.
   */
  GetObserved: (tokenPromise, observersPromise) => {
    return Promise.join(tokenPromise, observersPromise, (token, observers) => {
      var promises = [];
      
      observers.forEach(observer => 
        promises.push(
          Esi.Get({
            token:token, 
            route:`corporation/${Config.corporation_id}/mining/observers/${observer.observer_id}/`})));
  
      return Promise.all(promises);
    });
  },

  /**
   * Gets a promise to return structure info for observers
   * @param {*Promise} accessTokenPromise The access token promise.
   * @param {*Promise} observersPromise the observers promise.
   * @returns A Promise.
   */
  GetStructures: (tokenPromise, observersPromise) => {
    return Promise.join(tokenPromise, observersPromise, (accessToken, observers) => {
      var promises = [];
  
      observers.forEach(observer => 
        promises.push(
          Esi.Get({
            token:accessToken, 
            route:`universe/structures/${observer.observer_id}/`})));
  
      return Promise.all(promises);
    });
  }
}