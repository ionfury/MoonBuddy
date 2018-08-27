let Promise = require('bluebird');

let Esi = require('./esi.js');

module.exports = {
  /**
   * Gets a promise to return unique volumes of observed info
   * @param {Promise} accessTokenPromise The access token promise.
   * @param {Promise} observedPromise the observed promise.
   * @returns A RequestPromise.
   */
  InfoList: (typeIds) => {
    return Promise.map(typeIds, typeId => 
      Esi.Get({route:`universe/types/${typeId}`}));
  },

  Info: (typeId) => {
    return Esi.Get({route:`universe/types/${typeId}`});
  },

  /**
   * Gets a promise to return the inventory type of a given name
   * @param {string} name The name of the inventory type
   * @param {bool} strict If the search should be a strict match
   */
  Id: (name, strict = true) => {
    let options = {
      route: 'search',
      parameters: `categories=inventory_type&search=${name}&strict=${strict}`
    }

    return Esi.Get(options)
      .then(res => {
        if(!res.inventory_type)
          throw new Error(`Inventorytype not found for '${item}'!`);
        else
          return res.inventory_type.shift();
      });
  }
}