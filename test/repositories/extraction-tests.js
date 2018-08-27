let Chai = require('chai');
let Expect = Chai.expect;

let Esi = require('../../src/repositories/esi.js');
let TestData = require('../testdata.json');
let Extractions = require('../../src/repositories/extractions.js');

it('Extractions.Get should return an array of extractions', async () => {
  let res = await Esi
    .RefreshToken(TestData.RefreshToken)
    .then(Extractions.Get);
  Expect(res).to.be.a('array');
});

it('Extractions.GetStructures should return an array of structures', async () => {
  let token = Esi.RefreshToken(TestData.RefreshToken);
  let extractions = token.then(Extractions.Get);
  let res = await Extractions.GetStructures(token, extractions);
  Expect(res).to.be.a('array');
});