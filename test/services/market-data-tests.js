let Chai = require('chai');
let Expect = Chai.expect;

let MarketData = require('../../src/services/market-data.js');

it('MarketData.Get should return market data for the item', async () => {
  let res = await MarketData.Get('Tritanium');
  Expect(res.name).to.equal('Tritanium');
});