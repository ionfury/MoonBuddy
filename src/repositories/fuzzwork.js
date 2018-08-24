let RequestPromise = require('request-promise');

module.exports = {
  /**
   * Gets a promise to return fuzzwork market data.
   * @param {string} typeId The type id.
   * @param {string} stationId The station id.
   * @returns A RequestPromise.
   */
  MarketData: (typeId, stationId = 60003760) => {
    let options = {
      method: 'GET',
      url: `https://market.fuzzwork.co.uk/aggregates/?station=${stationId}&types=${typeId}`
    }
  
    return RequestPromise(options).then(JSON.parse);
  }
}