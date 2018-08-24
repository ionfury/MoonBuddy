let Promise = require('bluebird');

let Types = require('../repositories/types.js');
let Fuzzwork = require('../repositories/fuzzwork.js');

module.exports = {
  /**
   * Gets a promise returning market data from fuzzwork.
   * @param {string} item The name of an item in eve online.
   * @param {string} system A system of the following: jita, amarr, dodixie, rens, hek
   * @returns A Promise returning an object of the following format:
   *  {
   *    name: string,
   *    id: int,
   *    volume: float,
   *    buy: float,
   *    buyVolume: float,
   *    sell: float,
   *    sellVolume: float
   *  }
   */
  Get: (item, system = 'jita') => {
    let stationId = 0;
    switch(system) {
      case 'jita':
        stationId = 60003760;
        break;
      case 'amarr':
        stationId = 60008494;
        break;
      case 'dodixie':
        stationId = 60011866;
        break;
      case 'rens':
        stationId = 60004588;
        break;
      case 'hek':
        stationId = 60005686;
        break;
      default:
        throw new Error(`System '${system}' must be either jita, amarr, dodixie, rens, or hek.`);
    }

    let itemIdPromise = Types.Id(item);
    let typeInfoPromise = itemIdPromise.then(Types.Info);
    let marketPromise = itemIdPromise
      .then(itemId => Fuzzwork.MarketData(itemId, stationId));
      
    return Promise.join(typeInfoPromise, marketPromise, (typeInfo, marketData) => {
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
}