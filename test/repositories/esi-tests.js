let Chai = require('chai');
let Expect = Chai.expect;

let TestData = require('../testdata.json');
let Esi = require('../../src/repositories/esi.js');

/*
it('AuthToken should return a token',  async () => {
  process.env.client_id = TestData.client_id;
  process.env.client_secret = TestData.client_secret;
  let res = await Esi.AuthToken(TestData.AuthToken);
  expect(res).to.equal('promise resolved');
});
*/

it('Esi.RefreshToken should return a token',  async () => {
  process.env.client_id = TestData.client_id;
  process.env.client_secret = TestData.client_secret;
  let res = await Esi.RefreshToken(TestData.RefreshToken);
  Expect(res).to.be.a('string');
});

it('Esi.Get should return Tritanium', async () => {
  let res = await Esi.Get({route:`universe/types/34`});
  Expect(res.name).to.equal('Tritanium');
});