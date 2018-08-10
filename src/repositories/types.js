let Promise = require('bluebird');

let Config = require('data/config.json');
let Esi = include('src/repositories/esi.js');

module.exports = {
  /**
   * Gets a promise to return unique volumes of observed info
   * @param {Promise} accessTokenPromise The access token promise.
   * @param {Promise} observedPromise the observed promise.
   * @returns A RequestPromise.
   */
  TypeInfoList = (typeIds) => {
    return Promise.map(typeIds, type => 
      Esi.Get({route:`universe/types/${type}`})
        .then(JSON.parse));
  },

  TypeInfo = (typeId) => {
    return Esi.Get({route:`universe/types/${type}`})
      .then(JSON.parse);
  },

  /**
   * Gets a promise to return the inventory type of a given name
   * @param {string} name The name of the inventory type
   * @param {bool} strict If the search should be a strict match
   */
  TypeId = (name, strict = true) => {
    let options = {
      route: 'search',
      parameters: `categories=inventory_type&search=${name}&strict=${strict}`
    }

    Esi.Get(options)
      .then(JSON.parse)
      .then(res => {
        if(!res.inventory_type)
          throw new Error(`Inventorytype not found for '${item}'!`);
        else
          return res.inventory_type.shift();
      });
  }
}