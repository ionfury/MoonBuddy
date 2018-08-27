let Chai = require('chai');
let Expect = Chai.expect;

let TestData = require('../testdata.json');
let OreValue = require('../../src/services/ore-value.js');

it('OreValue.Get should return a list of ore values', async () => {
  process.env.refresh_token = TestData.RefreshToken;
  let res = await OreValue.Get();
  Expect(res).to.be.a('array');
});