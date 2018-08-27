let Chai = require('chai');
let Expect = Chai.expect;

let TestData = require('../testdata.json');
let Moons = require('../../src/services/Moons.js');

it('Moons.Extracting should return an array of extractions', async () => {
  process.env.refresh_token = TestData.RefreshToken;
  let res = await Moons.Extracting();
  Expect(res).to.be.a('array');  
}).timeout(4000);

it('Moons.ExtractingOres should return an array', async () => {
  process.env.refresh_token = TestData.RefreshToken;
  let res = await Moons.ExtractingOres();
  Expect(res).to.be.a('array'); 
}).timeout(4000);
/*
it('Moons.Inactive should return an array', async () => {
  process.env.refresh_token = TestData.RefreshToken;
  let res = await Moons.Inactive();
  Expect(res).to.be.a('array'); 
});
*/
it('Moons.Owned should return an array', async () => {
  process.env.refresh_token = TestData.RefreshToken;
  let res = await Moons.Owned();
  Expect(res).to.be.a('array'); 
}).timeout(4000);