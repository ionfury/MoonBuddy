let Chai = require('chai');
let Expect = Chai.expect;

let Fuzzwork = require('../../src/repositories/fuzzwork.js');

it('Fuzzwork.MarketData should return jita info on Tritanium', async () => {
  let res = await Fuzzwork.MarketData(34);
  Expect(res["34"]).to.be.a('object');
});

