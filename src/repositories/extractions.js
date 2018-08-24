let Promise = require('bluebird');

let Config = require('data/config.json');
let Esi = include('src/repositories/esi.js');

module.exports = {
  /**
   * Gets a promise to return extractions.
   * @param {string} token The access token.
   * @returns A RequestPromise.
   */
  Get: (token) => {
    return Esi.Get({
      token:accessToken, 
      route:`corporation/${Config.corporation_id}/mining/extractions/`
    }).then(JSON.parse);
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
          }).then(JSON.parse)));
  
      return Promise.all(promises);
    });
  }
}