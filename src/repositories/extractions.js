let Promise = require('bluebird');

let Config = require('../../data/config.json');
let Esi = require('./esi.js');

module.exports = {
  /**
   * Gets a promise to return extractions.
   * @param {string} token The access token.
   * @returns A RequestPromise.
   */
  Get: (token) => {
    return Esi.Get({
      token:token, 
      route:`corporation/${Config.corporation_id}/mining/extractions/`
    });
  },

  /**
   * Gets a promise to return extraction structures
   * @param {Promise} accessTokenPromise The access token promise.
   * @param {Promise} extractionsPromise the extractions promise.
   * @returns A RequestPromise.
   */
  GetStructures: (accessTokenPromise, extractionsPromise) => {
    return Promise.join(accessTokenPromise, extractionsPromise, (accessToken, extractions) => {
      var promises = [];
      
      extractions.forEach(extractor => 
        promises.push(
          Esi.Get({
            token:accessToken, 
            route:`universe/structures/${extractor.structure_id}/`
          })));
  
      return Promise.all(promises);
    });
  }
}