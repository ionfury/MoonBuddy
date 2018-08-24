let Materials = include('data/eve/materials.json');
let Reprocessing = include('data/eve/reprocessing.json');
let Config = include('data/config.json');

let MarketData = include('src/services/market-data.js');

module.exports = {
  /**
   * Gets reprocessing values of all reprocessable ores.
   * @param {string} market The name of the market
   * @returns An array of objects with the following definition
   * [
   *  {
   *    name: string
   *    value: float
   *    volume: int
   *  }
   * ]
   */
  Get: (market = 'jita') => {
    return Promise.map(Materials, material => MarketData.Get(material, market))
      .then(prices => {
        return Reprocessing
          .map(ore => {
            let value = 0;
            prices.forEach(price => value += ore[price.name] * price.buy);
            value = value / ore.Required * Config.refine_rate * Config.value_multiplier;

            return {
              name: ore.Ore,
              value: value,
              volume: ore.Volume
            };
          });
      });
  }
}