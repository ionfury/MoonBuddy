let Chai = require('chai');
let Expect = Chai.expect;

let TestData = require('../testdata.json');
let Esi = require('../../src/repositories/esi.js');
let Observers = require('../../src/repositories/observers.js');

it('Observers.Get should return an array of observers', async () => {
  let res = await Esi
    .RefreshToken(TestData.RefreshToken)
    .then(Observers.Get);
  Expect(res).to.be.a('array');
});

it('Observers.GetObserverd should return an array of observations', async () => {
  let token = Esi.RefreshToken(TestData.RefreshToken);
  let observers = token.then(Observers.Get);
  let res = await Observers.GetObserved(token, observers);
  Expect(res).to.be.a('array');
});

it('Observers.GetStructures should return an array of structures', async () => {
  let token = Esi.RefreshToken(TestData.RefreshToken);
  let observers = token.then(Observers.Get);
  let res = await Observers.GetStructures(token, observers);
  Expect(res).to.be.a('array');
});